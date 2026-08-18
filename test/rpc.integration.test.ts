import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";

import type { Router } from "../src/server/router.ts";
import type { GameEvent } from "../src/shared/events.ts";

/**
 * Exercises the real server — Bun.serve, the oRPC WebSocket adapter and the
 * game.subscribe event iterator — end to end, with the watchers replaying a
 * recorded fixture instead of calling MLB. No network, so this runs in CI and
 * out of season.
 */

const PORT = 3400 + Math.floor(Math.random() * 400);
const GAME_PK = 823427;

let server: ReturnType<typeof Bun.spawn>;

async function waitForServer(url: string, timeoutMs = 15_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) return;
		} catch {
			// not up yet
		}
		await Bun.sleep(100);
	}

	throw new Error(`server did not start on ${url}`);
}

async function connect(): Promise<{ client: RouterClient<Router>; websocket: WebSocket }> {
	const websocket = new WebSocket(`ws://localhost:${PORT}/ws`);
	await new Promise<void>((resolve, reject) => {
		websocket.addEventListener("open", () => resolve(), { once: true });
		websocket.addEventListener("error", () => reject(new Error("socket failed")), { once: true });
	});
	return { client: createORPCClient(new RPCLink({ websocket })), websocket };
}

async function take(stream: AsyncIterable<GameEvent>, predicate: (events: GameEvent[]) => boolean, timeoutMs = 20_000) {
	const events: GameEvent[] = [];
	const iterator = stream[Symbol.asyncIterator]();
	const expired = Symbol("timeout");
	const deadline = Bun.sleep(timeoutMs).then(() => expired);

	while (true) {
		const result = await Promise.race([iterator.next(), deadline]);
		if (typeof result === "symbol" || result.done) break;
		events.push(result.value);
		if (predicate(events)) break;
	}

	await iterator.return?.(undefined);
	return events;
}

beforeAll(async () => {
	server = Bun.spawn(["bun", "src/server/index.ts"], {
		cwd: new URL("..", import.meta.url).pathname,
		env: { ...process.env, PORT: String(PORT), BASEBALL_REPLAY: "live" },
		stdout: "pipe",
		stderr: "pipe",
	});
	await waitForServer(`http://localhost:${PORT}/health`);
});

afterAll(() => {
	server?.kill();
});

describe("oRPC over WebSocket", () => {
	test("game.subscribe streams a snapshot then deltas", async () => {
		const { client, websocket } = await connect();

		const stream = await client.game.subscribe({ gamePk: GAME_PK });
		const events = await take(stream, list => list.filter(event => event.t === "play").length >= 2);

		const joinEvent = events[0]!;
		expect(joinEvent.t).toBe("snapshot");
		if (joinEvent.t !== "snapshot") throw new Error("expected a snapshot on join");

		// A real domain snapshot survived the wire round-trip.
		const snapshot = joinEvent.snapshot;
		expect(snapshot.gamePk).toBe(GAME_PK);
		expect(snapshot.teams.home.abbreviation).toBeTruthy();
		expect(snapshot.plays.length).toBeGreaterThan(0);

		// Deltas followed, not repeated snapshots.
		expect(events.filter(event => event.t === "snapshot")).toHaveLength(1);
		expect(events.some(event => event.t === "pitch")).toBe(true);
		expect(events.filter(event => event.t === "play").length).toBeGreaterThanOrEqual(2);

		websocket.close();
	}, 30_000);

	test("pitches arrive with the fields the UI plots", async () => {
		const { client, websocket } = await connect();

		const stream = await client.game.subscribe({ gamePk: GAME_PK });
		const events = await take(stream, list => list.filter(event => event.t === "pitch").length >= 5);

		const pitches = events.filter(event => event.t === "pitch");
		expect(pitches.length).toBeGreaterThanOrEqual(5);

		for (const event of pitches) {
			if (event.t !== "pitch") continue;
			expect(event.pitch.playId).toBeTruthy();
			expect(event.pitch.call.kind).toBeTruthy();
			// StrikeZonePlot needs both of these; losing them over the wire
			// would silently render an empty plot.
			if (event.pitch.location) {
				expect(typeof event.pitch.location.x).toBe("number");
				expect(typeof event.pitch.location.z).toBe("number");
			}
		}

		websocket.close();
	}, 30_000);

	test("two clients share one watcher", async () => {
		const first = await connect();
		const second = await connect();

		const streamA = await first.client.game.subscribe({ gamePk: GAME_PK });
		const streamB = await second.client.game.subscribe({ gamePk: GAME_PK });

		// Held open deliberately: the subscriber count is only meaningful while
		// both clients are still iterating, and `take()` would release them.
		const iteratorA = streamA[Symbol.asyncIterator]();
		const iteratorB = streamB[Symbol.asyncIterator]();

		const [firstA, firstB] = await Promise.all([iteratorA.next(), iteratorB.next()]);

		expect(firstA.value.t).toBe("snapshot");
		expect(firstB.value.t).toBe("snapshot");

		const health = await fetch(`http://localhost:${PORT}/health`).then(response => response.json());
		const watchers = health.watchers as Array<{ gamePk: number; subscribers: number }>;
		const watcher = watchers.find(entry => entry.gamePk === GAME_PK);

		// The resource property this whole architecture exists for: many
		// viewers, one upstream poll loop.
		expect(watchers.filter(entry => entry.gamePk === GAME_PK)).toHaveLength(1);
		expect(watcher!.subscribers).toBeGreaterThanOrEqual(2);

		await iteratorA.return?.(undefined);
		await iteratorB.return?.(undefined);
		first.websocket.close();
		second.websocket.close();
	}, 30_000);

	test("schedule.byDate is reachable over the same socket", async () => {
		const { client, websocket } = await connect();

		// Plain request/response shares the socket with the event stream.
		const games = await client.schedule.byDate({ date: "2026-08-16" });

		expect(Array.isArray(games)).toBe(true);
		expect(games.length).toBeGreaterThan(0);
		expect(games[0]!.gamePk).toBeGreaterThan(0);
		expect(games[0]!.teams.home.name).toBeTruthy();

		websocket.close();
	}, 30_000);
});

describe("replay mode is self-consistent", () => {
	// A replay server holds one recorded game. Before this was enforced, every
	// gamePk resolved to that recording: the schedule looked normal and every
	// game opened the same one.
	test("reports which game it is replaying", async () => {
		const { client, websocket } = await connect();

		const info = await client.system.info();

		expect(info.replay).not.toBeNull();
		expect(info.replay!.label).toBe("live");
		expect(info.replay!.gamePk).toBe(GAME_PK);

		websocket.close();
	}, 30_000);

	test("the schedule offers only the game it can serve", async () => {
		const { client, websocket } = await connect();

		const games = await client.schedule.byDate({ date: "2026-08-16" });

		expect(games).toHaveLength(1);
		expect(games[0]!.gamePk).toBe(GAME_PK);
		expect(games[0]!.teams.home.abbreviation).toBeTruthy();

		websocket.close();
	}, 30_000);

	test("refuses a game it does not have, rather than serving the wrong one", async () => {
		const { client, websocket } = await connect();

		const other = GAME_PK + 1;
		let message = "";

		try {
			const stream = await client.game.subscribe({ gamePk: other });
			for await (const _event of stream) break;
		} catch (error) {
			message = (error as Error).message;
		}

		expect(message).toContain(String(GAME_PK));
		websocket.close();
	}, 30_000);

	test("serves its own game normally", async () => {
		const { client, websocket } = await connect();

		const stream = await client.game.subscribe({ gamePk: GAME_PK });
		const events = await take(stream, list => list.length >= 1);
		const first = events[0]!;

		expect(first.t).toBe("snapshot");
		if (first.t !== "snapshot") throw new Error("expected a snapshot");
		// The served game matches the one asked for.
		expect(first.snapshot.gamePk).toBe(GAME_PK);

		websocket.close();
	}, 30_000);
});
