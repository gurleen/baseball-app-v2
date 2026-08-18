import { applyPatch, type Operation } from "fast-json-patch";

import type { GameEvent } from "../../shared/events.ts";
import type { GameSnapshot } from "../../shared/models.ts";
import { isAbortError } from "../mlb/errors.ts";
import { getMlbGameFeed, getMlbGameFeedDiffPatch } from "../mlb/gumbo.ts";
import { getSavantGameFeed } from "../mlb/savant.ts";
import type { GumboFeed } from "../mlb/schemas/gumbo.ts";
import { indexSavantPitches, type SavantPitchRow } from "../mlb/schemas/savant.ts";
import { diffSnapshots } from "../transform/diff.ts";
import { toGameSnapshot } from "../transform/snapshot.ts";
import { GameEventEmitter } from "./emitter.ts";

/**
 * Poll intervals by game status. These are per *game*, not per viewer — one
 * watcher serves every subscriber, which is the whole reason the feeds moved
 * server-side. Savant is polled far less often because its payload is ~3MB
 * with no delta endpoint.
 */
const INTERVALS = {
	live: { gumbo: 2_000, savant: 12_000 },
	preview: { gumbo: 30_000, savant: 0 },
	other: { gumbo: 15_000, savant: 30_000 },
} as const;

const HEARTBEAT_MS = 20_000;
/** Backoff applied after a failed upstream fetch, so an outage isn't hammered. */
const ERROR_BACKOFF_MS = 5_000;

export interface WatcherDeps {
	fetchGumbo: typeof getMlbGameFeed;
	fetchGumboDiff: typeof getMlbGameFeedDiffPatch;
	fetchSavant: typeof getSavantGameFeed;
	now: () => number;
}

const defaultDeps: WatcherDeps = {
	fetchGumbo: getMlbGameFeed,
	fetchGumboDiff: getMlbGameFeedDiffPatch,
	fetchSavant: getSavantGameFeed,
	now: () => Date.now(),
};

export interface WatcherStats {
	gumboFetches: number;
	savantFetches: number;
	errors: number;
	lastUpdatedAt: number | null;
}

/**
 * Owns all upstream I/O for a single game and fans typed deltas out to
 * subscribers. Started by the registry on first subscriber, stopped when the
 * last one leaves.
 */
export class GameWatcher {
	readonly gamePk: number;

	readonly #deps: WatcherDeps;
	readonly #emitter: GameEventEmitter;

	#feed: GumboFeed | null = null;
	#savantIndex = new Map<string, SavantPitchRow>();
	#snapshot: GameSnapshot | null = null;

	#gumboTimer: ReturnType<typeof setTimeout> | null = null;
	#savantTimer: ReturnType<typeof setTimeout> | null = null;
	#heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	#abort: AbortController | null = null;
	#pushUpdateId = crypto.randomUUID();
	#running = false;
	/** Set once a Final game has had its last pass of both feeds. */
	#settled = false;

	readonly stats: WatcherStats = { gumboFetches: 0, savantFetches: 0, errors: 0, lastUpdatedAt: null };

	constructor(gamePk: number, deps: Partial<WatcherDeps> = {}) {
		this.gamePk = gamePk;
		this.#deps = { ...defaultDeps, ...deps };
		this.#emitter = new GameEventEmitter({
			// A subscriber that falls behind is resynced with current state
			// rather than replayed through a long backlog of deltas.
			onOverflow: () => (this.#snapshot ? { t: "snapshot", snapshot: this.#snapshot } : null),
		});
	}

	get snapshot(): GameSnapshot | null {
		return this.#snapshot;
	}

	get subscriberCount(): number {
		return this.#emitter.subscriberCount;
	}

	get isRunning(): boolean {
		return this.#running;
	}

	/**
	 * Subscribes to the stream. The first event is always a snapshot: either
	 * the one already in memory, or the first one built after startup.
	 */
	subscribe(options: { signal?: AbortSignal; onClose?: () => void } = {}): AsyncGenerator<GameEvent> {
		const initial: GameEvent[] = this.#snapshot ? [{ t: "snapshot", snapshot: this.#snapshot }] : [];
		return this.#emitter.subscribe(initial, options);
	}

	start(): void {
		if (this.#running) return;

		this.#running = true;
		this.#abort = new AbortController();
		this.#scheduleGumbo(0);
		this.#scheduleSavant(0);

		this.#heartbeatTimer = setInterval(() => {
			this.#emitter.emit({ t: "heartbeat", at: this.#deps.now() });
		}, HEARTBEAT_MS);
	}

	stop(): void {
		this.#running = false;
		this.#abort?.abort();
		this.#abort = null;

		for (const timer of [this.#gumboTimer, this.#savantTimer]) {
			if (timer) clearTimeout(timer);
		}
		this.#gumboTimer = null;
		this.#savantTimer = null;

		if (this.#heartbeatTimer) clearInterval(this.#heartbeatTimer);
		this.#heartbeatTimer = null;

		this.#emitter.close();
	}

	// ---------- polling ----------

	#intervals() {
		const kind = this.#snapshot?.state.kind ?? "other";
		if (kind === "live") return INTERVALS.live;
		if (kind === "preview") return INTERVALS.preview;
		return INTERVALS.other;
	}

	#scheduleGumbo(delay: number): void {
		if (!this.#running) return;
		// Self-scheduling rather than setInterval, so a slow upstream response
		// can never cause overlapping in-flight requests.
		this.#gumboTimer = setTimeout(() => void this.#pollGumbo(), delay);
	}

	#scheduleSavant(delay: number): void {
		if (!this.#running) return;
		this.#savantTimer = setTimeout(() => void this.#pollSavant(), delay);
	}

	async #pollGumbo(): Promise<void> {
		if (!this.#running) return;

		// Computed after publishing, not before: on the very first poll there is
		// no snapshot yet, so the status-derived interval would fall back to the
		// slow "other" cadence and a live game would wait 15s for its second
		// poll instead of 2s.
		let nextDelay: number | null = null;

		try {
			this.stats.gumboFetches += 1;
			const signal = this.#abort?.signal;

			if (!this.#feed) {
				this.#feed = await this.#deps.fetchGumbo(this.gamePk, { signal });
			} else {
				const response = await this.#deps.fetchGumboDiff(this.gamePk, {
					signal,
					startTimecode: this.#feed.metaData.timeStamp,
					pushUpdateId: this.#pushUpdateId,
				});
				this.#pushUpdateId = crypto.randomUUID();

				if (Array.isArray(response)) {
					for (const entry of response) {
						this.#feed = applyPatch(
							structuredClone(this.#feed),
							entry.diff as readonly Operation[],
							false,
							true,
						).newDocument as GumboFeed;
					}
				} else {
					// The diffPatch endpoint falls back to a full feed when the
					// timecode is too stale; it omits `copyright`.
					this.#feed = { copyright: this.#feed.copyright, ...response };
				}
			}

			this.#publish();
			nextDelay = this.#intervals().gumbo;

			// A finished game gets one final pass, then the loops park.
			if (this.#snapshot?.state.isFinal && this.#settled) return;
			if (this.#snapshot?.state.isFinal) this.#settled = true;
		} catch (error) {
			if (isAbortError(error)) return;
			this.stats.errors += 1;
			console.error(`[watcher ${this.gamePk}] gumbo poll failed`, error);
			nextDelay = ERROR_BACKOFF_MS;
		}

		this.#scheduleGumbo(nextDelay ?? this.#intervals().gumbo);
	}

	async #pollSavant(): Promise<void> {
		if (!this.#running) return;

		// Savant has nothing useful before first pitch, so a game still in
		// preview just re-checks later rather than pulling 3MB for nothing.
		if (this.#intervals().savant === 0) {
			this.#scheduleSavant(INTERVALS.other.savant);
			return;
		}

		let nextDelay: number | null = null;

		try {
			this.stats.savantFetches += 1;
			const feed = await this.#deps.fetchSavant(this.gamePk, { signal: this.#abort?.signal });
			this.#savantIndex = indexSavantPitches(feed);
			this.#publish();
			nextDelay = this.#intervals().savant;

			if (this.#snapshot?.state.isFinal && this.#settled) return;
		} catch (error) {
			if (isAbortError(error)) return;
			this.stats.errors += 1;
			// Savant is supplementary — a failure degrades metrics, not the game.
			console.warn(`[watcher ${this.gamePk}] savant poll failed`, error);
			nextDelay = Math.max(this.#intervals().savant, ERROR_BACKOFF_MS);
		}

		this.#scheduleSavant(nextDelay ?? this.#intervals().savant);
	}

	/** Rebuilds the snapshot and emits whatever changed. */
	#publish(): void {
		if (!this.#feed) return;

		const next = toGameSnapshot(this.#feed, this.#savantIndex, this.#deps.now());
		const events = diffSnapshots(this.#snapshot, next);

		this.#snapshot = next;
		this.stats.lastUpdatedAt = next.updatedAt;

		if (events.length > 0) this.#emitter.emitAll(events);
	}
}
