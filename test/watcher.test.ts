import { describe, expect, test } from "bun:test";

import { GameWatcher } from "../src/server/game/watcher.ts";
import { toGameSnapshot } from "../src/server/transform/snapshot.ts";
import type { GameEvent } from "../src/shared/events.ts";
import type { GumboFeed } from "../src/server/mlb/schemas/gumbo.ts";
import { loadGumboFixture, loadSavantFixture } from "./fixtures.ts";

const liveFeed = await loadGumboFixture("live");
const liveSavant = await loadSavantFixture("live");
const finalFeed = await loadGumboFixture("final");

/** The same game rewound by dropping its most recent completed at-bats. */
function rewound(feed: GumboFeed, dropPlays: number): GumboFeed {
	const allPlays = feed.liveData.plays.allPlays.slice(0, -dropPlays);
	return {
		...feed,
		liveData: {
			...feed.liveData,
			plays: { ...feed.liveData.plays, allPlays, currentPlay: undefined },
		},
	};
}

/**
 * Reads until `predicate` is satisfied or the timeout elapses. The timeout is
 * a real race rather than a check between events, because an idle stream would
 * otherwise block forever.
 */
async function collect(
	stream: AsyncGenerator<GameEvent>,
	predicate: (events: GameEvent[]) => boolean,
	timeoutMs = 4_000,
): Promise<GameEvent[]> {
	const events: GameEvent[] = [];
	const expired = Symbol("timeout");
	const deadline = Bun.sleep(timeoutMs).then(() => expired);

	while (true) {
		const result = await Promise.race([stream.next(), deadline]);
		if (typeof result === "symbol" || result.done) break;

		events.push(result.value);
		if (predicate(events)) break;
	}

	return events;
}

describe("GameWatcher", () => {
	test("emits a snapshot first, then deltas as the feed advances", async () => {
		const before = rewound(liveFeed, 3);
		// Derived, not hard-coded: dropping 3 entries from allPlays yields fewer
		// than 3 new *completed* plays, because the last one is the at-bat still
		// in progress, which is carried by `currentPlay` rather than `plays`.
		const expectedPlays =
			toGameSnapshot(liveFeed, null, 0).plays.length - toGameSnapshot(before, null, 0).plays.length;
		expect(expectedPlays).toBeGreaterThan(0);

		let call = 0;
		const watcher = new GameWatcher(1, {
			// First poll sees a rewound game; the diff endpoint then returns the
			// full current feed (its documented fallback when a timecode is stale).
			fetchGumbo: async () => before,
			fetchGumboDiff: async () => {
				call += 1;
				const { copyright: _copyright, ...rest } = liveFeed;
				return rest;
			},
			fetchSavant: async () => liveSavant,
			now: () => 1_700_000_000_000 + call,
		});

		watcher.start();
		const stream = watcher.subscribe();

		// diffSnapshots emits in order: pitches, plays, currentPlay, then the
		// summary objects — so waiting for currentPlay implies the plays landed.
		const events = await collect(stream, list => list.some(event => event.t === "currentPlay"));
		await stream.return(undefined);
		watcher.stop();

		expect(events[0]!.t).toBe("snapshot");

		const kinds = new Set(events.map(event => event.t));
		expect(kinds.has("play")).toBe(true);
		// Deltas, not a re-sent snapshot: exactly one snapshot was emitted.
		expect(events.filter(event => event.t === "snapshot")).toHaveLength(1);

		const plays = events.filter(event => event.t === "play");
		expect(plays.length).toBe(expectedPlays);

		// The at-bat still in progress arrives as currentPlay, not as a play.
		expect(events.some(event => event.t === "currentPlay")).toBe(true);
	});

	test("stops polling once a final game has settled", async () => {
		const watcher = new GameWatcher(2, {
			fetchGumbo: async () => finalFeed,
			fetchGumboDiff: async () => [],
			fetchSavant: async () => liveSavant,
		});

		watcher.start();
		const stream = watcher.subscribe();
		await stream.next(); // the snapshot

		await Bun.sleep(120);
		const settledFetches = watcher.stats.gumboFetches;
		await Bun.sleep(200);

		// A finished game gets one last pass, then the loop parks rather than
		// polling a game that will never change again.
		expect(watcher.stats.gumboFetches).toBe(settledFetches);
		expect(watcher.snapshot?.state.isFinal).toBe(true);

		await stream.return(undefined);
		watcher.stop();
	});

	test("an upstream failure is recorded without killing the watcher", async () => {
		let attempts = 0;
		const watcher = new GameWatcher(3, {
			fetchGumbo: async () => {
				attempts += 1;
				if (attempts === 1) throw new Error("statsapi is down");
				return liveFeed;
			},
			fetchGumboDiff: async () => [],
			fetchSavant: async () => {
				throw new Error("savant is down");
			},
		});

		watcher.start();
		const stream = watcher.subscribe();

		// Recovers on the retry and still serves a snapshot.
		const first = await Promise.race([
			stream.next().then(result => result.value),
			Bun.sleep(8_000).then(() => null),
		]);

		expect(first).toBeTruthy();
		expect((first as GameEvent).t).toBe("snapshot");
		expect(watcher.stats.errors).toBeGreaterThan(0);
		// Savant is supplementary — the game still works without it.
		expect(watcher.snapshot).not.toBeNull();

		await stream.return(undefined);
		watcher.stop();
	}, 12_000);

	test("stop() ends every open subscriber stream", async () => {
		const watcher = new GameWatcher(4, {
			fetchGumbo: async () => liveFeed,
			fetchGumboDiff: async () => [],
			fetchSavant: async () => liveSavant,
		});

		watcher.start();
		const stream = watcher.subscribe();
		await stream.next();

		const pending = stream.next();
		watcher.stop();

		expect((await pending).done).toBe(true);
	});
});
