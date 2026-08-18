import type { GameEvent } from "../../shared/events.ts";
import type { GameSnapshot } from "../../shared/models.ts";
import { replayMode } from "../mlb/replay.ts";
import { GameWatcher, type WatcherDeps } from "./watcher.ts";

/**
 * How long a watcher keeps running after its last subscriber leaves.
 * A page refresh drops and re-adds a subscriber within a second or two, and
 * restarting would re-fetch the full GUMBO feed plus a ~3MB Savant payload.
 */
const TEARDOWN_GRACE_MS = 60_000;

/** Guards against an unbounded number of concurrent upstream poll loops. */
const MAX_WATCHERS = 32;

export interface RegistryOptions {
	teardownGraceMs?: number;
	maxWatchers?: number;
	watcherDeps?: Partial<WatcherDeps>;
}

interface Entry {
	watcher: GameWatcher;
	teardownTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Maps gamePk to a single shared GameWatcher.
 *
 * Every viewer of a game shares one upstream poll loop: N subscribers cause
 * exactly one set of MLB requests, which is the core resource property of
 * this design and is asserted in the tests.
 */
export class GameRegistry {
	readonly #entries = new Map<number, Entry>();
	readonly #teardownGraceMs: number;
	readonly #maxWatchers: number;
	readonly #watcherDeps: Partial<WatcherDeps>;

	constructor(options: RegistryOptions = {}) {
		this.#teardownGraceMs = options.teardownGraceMs ?? TEARDOWN_GRACE_MS;
		this.#maxWatchers = options.maxWatchers ?? MAX_WATCHERS;
		this.#watcherDeps = options.watcherDeps ?? {};
	}

	get watcherCount(): number {
		return this.#entries.size;
	}

	getWatcher(gamePk: number): GameWatcher | undefined {
		return this.#entries.get(gamePk)?.watcher;
	}

	getSnapshot(gamePk: number): GameSnapshot | null {
		return this.#entries.get(gamePk)?.watcher.snapshot ?? null;
	}

	/**
	 * Subscribes to a game, starting its watcher if this is the first viewer.
	 * The returned iterator yields a snapshot first, then deltas; the
	 * reference count is released when iteration ends for any reason.
	 */
	subscribe(gamePk: number, signal?: AbortSignal): AsyncGenerator<GameEvent> {
		const entry = this.#acquire(gamePk);
		return entry.watcher.subscribe({
			signal,
			onClose: () => this.#release(gamePk),
		});
	}

	#acquire(gamePk: number): Entry {
		const existing = this.#entries.get(gamePk);

		if (existing) {
			// A viewer arrived during the teardown grace window — cancel it.
			if (existing.teardownTimer) {
				clearTimeout(existing.teardownTimer);
				existing.teardownTimer = null;
			}
			if (!existing.watcher.isRunning) existing.watcher.start();
			return existing;
		}

		if (this.#entries.size >= this.#maxWatchers) {
			throw new Error(`Refusing to watch more than ${this.#maxWatchers} games at once`);
		}

		const entry: Entry = {
			watcher: new GameWatcher(gamePk, this.#watcherDeps),
			teardownTimer: null,
		};
		this.#entries.set(gamePk, entry);
		entry.watcher.start();

		return entry;
	}

	#release(gamePk: number): void {
		const entry = this.#entries.get(gamePk);
		if (!entry || entry.watcher.subscriberCount > 0 || entry.teardownTimer) return;

		entry.teardownTimer = setTimeout(() => {
			const current = this.#entries.get(gamePk);
			// Re-check: a viewer may have arrived while the timer was pending.
			if (!current || current.watcher.subscriberCount > 0) return;

			current.watcher.stop();
			this.#entries.delete(gamePk);
		}, this.#teardownGraceMs);

		// Don't hold the process open purely for a teardown timer.
		entry.teardownTimer.unref?.();
	}

	/**
	 * Per-game upstream fetch counts and subscriber totals. Exposed on /health
	 * so the "one poll loop per game regardless of viewers" property can be
	 * observed in a running server, not just asserted in tests.
	 */
	stats() {
		return [...this.#entries.entries()].map(([gamePk, entry]) => ({
			gamePk,
			subscribers: entry.watcher.subscriberCount,
			running: entry.watcher.isRunning,
			...entry.watcher.stats,
		}));
	}

	/** Stops every watcher. For shutdown and tests. */
	stopAll(): void {
		for (const entry of this.#entries.values()) {
			if (entry.teardownTimer) clearTimeout(entry.teardownTimer);
			entry.watcher.stop();
		}
		this.#entries.clear();
	}
}

/**
 * Process-wide registry used by the RPC procedures.
 *
 * With BASEBALL_REPLAY=<fixture label> set, the watchers read recorded
 * fixtures instead of MLB — for running out of season, working offline, and
 * integration tests that exercise the real server without the real network.
 * A replay serves only the fixture's own game; see src/server/mlb/replay.ts.
 */
export const gameRegistry = new GameRegistry(replayMode ? { watcherDeps: replayMode.deps } : {});

if (replayMode) {
	console.log(
		`[registry] replaying fixture "${replayMode.label}" (game ${replayMode.gamePk}) instead of live MLB feeds`,
	);
}
