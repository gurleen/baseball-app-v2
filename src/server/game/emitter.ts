import type { GameEvent } from "../../shared/events.ts";

/**
 * Events a single subscriber may fall behind by before it is resynced.
 *
 * Sized for a legitimate burst rather than a steady tick: the first Savant
 * merge on an in-progress game emits a `pitchMetrics` event per batted ball
 * (~50), and catching up several at-bats adds a `pitch` event each. A burst
 * of a few hundred small events is normal on join; only a genuinely stalled
 * consumer should ever hit this.
 */
const DEFAULT_QUEUE_LIMIT = 512;

export interface EmitterOptions {
	queueLimit?: number;
	/**
	 * Called when a subscriber overflows its queue. The returned event is
	 * delivered in place of the dropped backlog — in practice a fresh
	 * snapshot, which is cheaper than replaying a long tail of deltas.
	 */
	onOverflow?: () => GameEvent | null;
}

interface Subscriber {
	queue: GameEvent[];
	/** Set while the consumer is parked in `next()` waiting for an event. */
	wake: (() => void) | null;
	closed: boolean;
}

/**
 * Fans one event stream out to N async iterators.
 *
 * A slow subscriber must never stall the watcher, so each has a bounded queue:
 * on overflow its backlog is dropped and replaced by a single resync event.
 * Iterators clean up in `finally`, which is what drives the registry's
 * reference counting when a client disconnects.
 */
export class GameEventEmitter {
	readonly #subscribers = new Set<Subscriber>();
	readonly #queueLimit: number;
	readonly #onOverflow: (() => GameEvent | null) | undefined;

	constructor(options: EmitterOptions = {}) {
		this.#queueLimit = options.queueLimit ?? DEFAULT_QUEUE_LIMIT;
		this.#onOverflow = options.onOverflow;
	}

	get subscriberCount(): number {
		return this.#subscribers.size;
	}

	emit(event: GameEvent): void {
		for (const subscriber of this.#subscribers) {
			if (subscriber.closed) continue;

			if (subscriber.queue.length >= this.#queueLimit) {
				const resync = this.#onOverflow?.() ?? null;
				subscriber.queue = resync ? [resync] : [];
			} else {
				subscriber.queue.push(event);
			}

			subscriber.wake?.();
		}
	}

	emitAll(events: Iterable<GameEvent>): void {
		for (const event of events) this.emit(event);
	}

	/** Ends every open iterator, e.g. when the watcher shuts down. */
	close(): void {
		for (const subscriber of this.#subscribers) {
			subscriber.closed = true;
			subscriber.wake?.();
		}
		this.#subscribers.clear();
	}

	/**
	 * Registers a subscriber and returns its event stream.
	 *
	 * Registration happens **synchronously**, before the returned generator is
	 * first iterated. An async generator body does not run until its first
	 * `next()` call, so registering inside one would drop every event emitted
	 * between subscribing and the consumer's first read — and would leave the
	 * subscriber count at zero, which is what the registry's reference
	 * counting depends on.
	 *
	 * @param initial events delivered before any live one — the join snapshot.
	 * @param onClose runs exactly once when the consumer stops iterating,
	 *   however it stops: break, throw, abort or watcher shutdown.
	 */
	subscribe(
		initial: GameEvent[] = [],
		options: { signal?: AbortSignal; onClose?: () => void } = {},
	): AsyncGenerator<GameEvent> {
		const subscriber: Subscriber = { queue: [...initial], wake: null, closed: false };
		this.#subscribers.add(subscriber);

		const abort = () => {
			subscriber.closed = true;
			subscriber.wake?.();
		};
		options.signal?.addEventListener("abort", abort, { once: true });

		// Idempotent: cleanup can be reached either by the generator's `finally`
		// or by `return()`/`throw()` on a generator that was never started.
		let released = false;
		const release = () => {
			if (released) return;
			released = true;
			subscriber.closed = true;
			this.#subscribers.delete(subscriber);
			options.signal?.removeEventListener("abort", abort);
			options.onClose?.();
		};

		const stream = this.#drain(subscriber, release);

		// A generator that has not been started yet has no `try` block to
		// unwind, so `finally` never runs and the subscriber would leak. That
		// is the normal shape of a client that connects and disconnects before
		// reading, so `return`/`throw` release explicitly.
		const close = stream.return.bind(stream);
		const fail = stream.throw.bind(stream);
		stream.return = async value => {
			release();
			return close(value);
		};
		stream.throw = async error => {
			release();
			return fail(error);
		};

		return stream;
	}

	async *#drain(subscriber: Subscriber, release: () => void): AsyncGenerator<GameEvent> {
		try {
			while (true) {
				while (subscriber.queue.length > 0) {
					yield subscriber.queue.shift()!;
				}

				if (subscriber.closed) return;

				await new Promise<void>(resolve => {
					subscriber.wake = () => {
						subscriber.wake = null;
						resolve();
					};
				});
			}
		} finally {
			release();
		}
	}
}
