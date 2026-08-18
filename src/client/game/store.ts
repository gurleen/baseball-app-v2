import type { GameEvent } from "../../shared/events.ts";
import type { GameSnapshot } from "../../shared/models.ts";
import { reduceGameEvent } from "./reducer.ts";

/**
 * Holds two views of a game and the delay between them.
 *
 * `live` always reflects the newest event from the server. `displayed` lags it
 * by `delayMs`, so the page can be lined up with a TV broadcast that is behind
 * the data feed — otherwise the score updates several seconds before the
 * viewer sees the pitch.
 *
 * This is the buffering idea from v1's useGameData, but queuing *events*
 * rather than whole feed snapshots: smaller to hold, and the granularity is
 * per pitch instead of per poll.
 */

interface QueuedEvent {
	event: GameEvent;
	receivedAt: number;
}

export interface GameStoreState {
	/** Newest state from the server, ignoring the delay. */
	live: GameSnapshot | null;
	/** What the UI should render — `live` rewound by `delayMs`. */
	displayed: GameSnapshot | null;
	delayMs: number;
	paused: boolean;
	connected: boolean;
	error: Error | null;
	/** When the last event was applied to `displayed`. */
	lastDisplayedAt: number | null;
	/**
	 * When any event last arrived from the server. Distinct from
	 * `live.updatedAt`, which only moves on a full snapshot — deltas carry no
	 * timestamp, so this is what actually detects a stalled feed.
	 */
	lastEventAt: number | null;
	/** Events waiting out the delay. */
	queued: number;
}

const EMPTY: GameStoreState = {
	live: null,
	displayed: null,
	delayMs: 0,
	paused: false,
	connected: false,
	error: null,
	lastDisplayedAt: null,
	lastEventAt: null,
	queued: 0,
};

export class GameStore {
	#state: GameStoreState = EMPTY;
	readonly #listeners = new Set<() => void>();
	#queue: QueuedEvent[] = [];
	#timer: ReturnType<typeof setTimeout> | null = null;
	#now: () => number;

	constructor(now: () => number = () => Date.now()) {
		this.#now = now;
	}

	getSnapshot = (): GameStoreState => this.#state;

	subscribe = (listener: () => void): (() => void) => {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	};

	#set(patch: Partial<GameStoreState>): void {
		this.#state = { ...this.#state, ...patch };
		for (const listener of this.#listeners) listener();
	}

	// ---------- ingest ----------

	push(event: GameEvent): void {
		const live = reduceGameEvent(this.#state.live, event);
		const lastEventAt = this.#now();

		// A snapshot is a resync — the delayed view would be wrong to keep
		// replaying a queue built against the old state.
		if (event.t === "snapshot") {
			this.#queue = [];
			this.#clearTimer();
			this.#set({ live, displayed: live, lastDisplayedAt: lastEventAt, lastEventAt, queued: 0, error: null });
			return;
		}

		this.#set({ live, lastEventAt });

		if (this.#state.delayMs === 0 && !this.#state.paused) {
			this.#apply(event);
			return;
		}

		this.#queue.push({ event, receivedAt: this.#now() });
		this.#set({ queued: this.#queue.length });
		this.#drain();
	}

	setConnected(connected: boolean): void {
		this.#set({ connected });
	}

	setError(error: Error | null): void {
		this.#set({ error });
	}

	// ---------- delay controls ----------

	setDelayMs(delayMs: number): void {
		this.#set({ delayMs: Math.max(0, Math.round(delayMs)) });
		this.#drain();
	}

	setPaused(paused: boolean): void {
		this.#set({ paused });
		if (paused) {
			this.#clearTimer();
			return;
		}
		this.#drain();
	}

	/**
	 * Calibration: the viewer pauses, then resumes at the instant the pitch
	 * they are watching appears on their TV. The elapsed time is the delay.
	 */
	calibrateFrom(pausedAt: number): void {
		this.setDelayMs(this.#now() - pausedAt);
		this.setPaused(false);
	}

	reset(): void {
		this.#queue = [];
		this.#clearTimer();
		this.#set({ delayMs: 0, paused: false, displayed: this.#state.live, queued: 0 });
	}

	destroy(): void {
		this.#clearTimer();
		this.#listeners.clear();
		this.#queue = [];
	}

	// ---------- draining ----------

	#apply(event: GameEvent): void {
		this.#set({
			displayed: reduceGameEvent(this.#state.displayed, event),
			lastDisplayedAt: this.#now(),
		});
	}

	#drain(): void {
		this.#clearTimer();
		if (this.#state.paused) return;

		const cutoff = this.#now() - this.#state.delayMs;

		// Apply everything old enough to be visible, in one batch.
		let applied = false;
		while (this.#queue[0] && this.#queue[0].receivedAt <= cutoff) {
			const next = this.#queue.shift()!;
			this.#state = {
				...this.#state,
				displayed: reduceGameEvent(this.#state.displayed, next.event),
				lastDisplayedAt: this.#now(),
			};
			applied = true;
		}

		this.#state = { ...this.#state, queued: this.#queue.length };
		if (applied || this.#state.queued >= 0) {
			for (const listener of this.#listeners) listener();
		}

		this.#schedule();
	}

	#schedule(): void {
		const next = this.#queue[0];
		if (!next || this.#state.paused) return;

		const visibleAt = next.receivedAt + this.#state.delayMs;
		this.#timer = setTimeout(() => {
			this.#timer = null;
			this.#drain();
		}, Math.max(0, visibleAt - this.#now()));
	}

	#clearTimer(): void {
		if (this.#timer) {
			clearTimeout(this.#timer);
			this.#timer = null;
		}
	}
}
