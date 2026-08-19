import { describe, expect, test } from "bun:test";

import { GameRegistry } from "../src/server/game/registry.ts";
import { GameEventEmitter } from "../src/server/game/emitter.ts";
import type { WatcherDeps } from "../src/server/game/watcher.ts";
import type { GameEvent } from "../src/shared/events.ts";
import { loadGumboFixture, loadSavantFixture } from "./fixtures.ts";

const gumbo = await loadGumboFixture("live");
const savant = await loadSavantFixture("live");

/** Counts upstream calls so the "one fetch per game" property can be asserted. */
function stubDeps() {
	const calls = { gumbo: 0, gumboDiff: 0, savant: 0 };

	const deps: Partial<WatcherDeps> = {
		fetchGumbo: async () => {
			calls.gumbo += 1;
			return gumbo;
		},
		fetchGumboDiff: async () => {
			calls.gumboDiff += 1;
			return [];
		},
		fetchSavant: async () => {
			calls.savant += 1;
			return savant;
		},
		fetchPitcherSeasonMix: async () => [],
		now: () => 1_700_000_000_000,
	};

	return { calls, deps };
}

/** Reads `count` events, then stops iterating (releasing the subscriber). */
async function take(stream: AsyncGenerator<GameEvent>, count: number): Promise<GameEvent[]> {
	const events: GameEvent[] = [];
	for await (const event of stream) {
		events.push(event);
		if (events.length >= count) break;
	}
	return events;
}

describe("GameRegistry", () => {
	test("two subscribers to one game share a single upstream fetch", async () => {
		const { calls, deps } = stubDeps();
		const registry = new GameRegistry({ watcherDeps: deps, teardownGraceMs: 10_000 });

		const first = await take(registry.subscribe(1), 1);
		const second = await take(registry.subscribe(1), 1);

		// Both got the full state...
		expect(first[0]!.t).toBe("snapshot");
		expect(second[0]!.t).toBe("snapshot");
		// ...but the game was only fetched once.
		expect(calls.gumbo).toBe(1);
		expect(registry.watcherCount).toBe(1);

		registry.stopAll();
	});

	test("the second subscriber gets the cached snapshot immediately", async () => {
		const { calls, deps } = stubDeps();
		const registry = new GameRegistry({ watcherDeps: deps });

		await take(registry.subscribe(2), 1);
		const before = calls.gumbo;

		const events = await take(registry.subscribe(2), 1);

		expect(events).toHaveLength(1);
		expect(events[0]!.t).toBe("snapshot");
		expect(calls.gumbo).toBe(before);

		registry.stopAll();
	});

	test("different games get their own watchers", async () => {
		const { deps } = stubDeps();
		const registry = new GameRegistry({ watcherDeps: deps });

		await take(registry.subscribe(10), 1);
		await take(registry.subscribe(11), 1);

		expect(registry.watcherCount).toBe(2);
		registry.stopAll();
	});

	test("a watcher survives the teardown grace window, so a refresh doesn't refetch", async () => {
		const { calls, deps } = stubDeps();
		const registry = new GameRegistry({ watcherDeps: deps, teardownGraceMs: 5_000 });

		await take(registry.subscribe(3), 1); // subscriber leaves here
		expect(registry.getWatcher(3)?.subscriberCount).toBe(0);

		// Reconnecting within the window reuses the running watcher.
		await take(registry.subscribe(3), 1);

		expect(calls.gumbo).toBe(1);
		expect(registry.watcherCount).toBe(1);

		registry.stopAll();
	});

	test("the watcher is torn down once the grace window elapses", async () => {
		const { deps } = stubDeps();
		const registry = new GameRegistry({ watcherDeps: deps, teardownGraceMs: 20 });

		await take(registry.subscribe(4), 1);
		expect(registry.watcherCount).toBe(1);

		await Bun.sleep(60);

		expect(registry.watcherCount).toBe(0);
		registry.stopAll();
	});

	test("refuses to exceed the watcher cap", async () => {
		const { deps } = stubDeps();
		const registry = new GameRegistry({ watcherDeps: deps, maxWatchers: 2 });

		await take(registry.subscribe(100), 1);
		await take(registry.subscribe(101), 1);

		expect(() => registry.subscribe(102)).toThrow(/more than 2 games/);
		registry.stopAll();
	});
});

describe("GameEventEmitter", () => {
	const heartbeat = (at: number): GameEvent => ({ t: "heartbeat", at });

	test("delivers initial events before live ones", async () => {
		const emitter = new GameEventEmitter();
		const stream = emitter.subscribe([heartbeat(1)]);

		const first = await stream.next();
		expect(first.value).toEqual(heartbeat(1));

		emitter.emit(heartbeat(2));
		const second = await stream.next();
		expect(second.value).toEqual(heartbeat(2));

		await stream.return(undefined);
	});

	test("fans one event out to every subscriber", async () => {
		const emitter = new GameEventEmitter();
		const a = emitter.subscribe();
		const b = emitter.subscribe();

		// Park both consumers before emitting.
		const pendingA = a.next();
		const pendingB = b.next();
		emitter.emit(heartbeat(7));

		expect((await pendingA).value).toEqual(heartbeat(7));
		expect((await pendingB).value).toEqual(heartbeat(7));

		await a.return(undefined);
		await b.return(undefined);
	});

	test("a slow subscriber is resynced instead of stalling the emitter", async () => {
		const resync: GameEvent = { t: "heartbeat", at: -1 };
		const emitter = new GameEventEmitter({ queueLimit: 4, onOverflow: () => resync });

		const stream = emitter.subscribe();
		// Never read — simulate a client that has stopped consuming.
		for (let i = 0; i < 20; i += 1) emitter.emit(heartbeat(i));

		// The backlog collapsed to a single resync event rather than growing.
		const first = await stream.next();
		expect(first.value).toEqual(resync);

		await stream.return(undefined);
	});

	test("onClose fires however iteration ends", async () => {
		const emitter = new GameEventEmitter();
		let closed = 0;

		const stream = emitter.subscribe([heartbeat(1)], { onClose: () => (closed += 1) });
		await stream.next();
		await stream.return(undefined);

		expect(closed).toBe(1);
		expect(emitter.subscriberCount).toBe(0);
	});

	test("aborting the signal ends the stream", async () => {
		const emitter = new GameEventEmitter();
		const controller = new AbortController();
		const stream = emitter.subscribe([], { signal: controller.signal });

		const pending = stream.next();
		controller.abort();

		expect((await pending).done).toBe(true);
		expect(emitter.subscriberCount).toBe(0);
	});
});

describe("subscriber registration timing", () => {
	test("events emitted before the first read are not lost", async () => {
		// Async generator bodies are lazy, so a subscriber registered inside one
		// would miss everything emitted before the consumer's first next().
		const emitter = new GameEventEmitter();
		const stream = emitter.subscribe();

		expect(emitter.subscriberCount).toBe(1);
		emitter.emit({ t: "heartbeat", at: 42 });

		const first = await stream.next();
		expect(first.value).toEqual({ t: "heartbeat", at: 42 });

		await stream.return(undefined);
	});

	test("the registry counts a subscriber before it starts reading", async () => {
		const { deps } = stubDeps();
		const registry = new GameRegistry({ watcherDeps: deps, teardownGraceMs: 10_000 });

		const stream = registry.subscribe(200);
		expect(registry.getWatcher(200)?.subscriberCount).toBe(1);

		await stream.return(undefined);
		expect(registry.getWatcher(200)?.subscriberCount).toBe(0);

		registry.stopAll();
	});
});
