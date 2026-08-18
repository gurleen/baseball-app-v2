import { describe, expect, test } from "bun:test";

import { GameStore } from "../src/client/game/store.ts";
import type { GameEvent } from "../src/shared/events.ts";
import type { GameSnapshot, Pitch } from "../src/shared/models.ts";
import { loadGumboFixture, loadSavantFixture } from "./fixtures.ts";
import { toGameSnapshot } from "../src/server/transform/snapshot.ts";

const base = toGameSnapshot(await loadGumboFixture("live"), await loadSavantFixture("live"), 0);

/** A controllable clock, so delay behaviour is tested without real waiting. */
function fakeClock(start = 1_000_000) {
	let current = start;
	return {
		now: () => current,
		advance: (ms: number) => {
			current += ms;
		},
	};
}

function pitchEvent(playId: string): GameEvent {
	const template = base.plays.at(-1)!.pitches[0]!;
	const pitch: Pitch = { ...template, playId, atBatIndex: base.currentPlay!.atBatIndex };
	return { t: "pitch", pitch };
}

function snapshotEvent(snapshot: GameSnapshot = base): GameEvent {
	return { t: "snapshot", snapshot };
}

describe("GameStore delay buffer", () => {
	test("with no delay, displayed tracks live immediately", () => {
		const store = new GameStore();
		store.push(snapshotEvent());

		const before = store.getSnapshot().displayed!.currentPlay!.pitches.length;
		store.push(pitchEvent("new-1"));

		const state = store.getSnapshot();
		expect(state.displayed!.currentPlay!.pitches.length).toBe(before + 1);
		expect(state.live).toEqual(state.displayed!);
		expect(state.queued).toBe(0);
	});

	test("with a delay, live advances but displayed holds", () => {
		const clock = fakeClock();
		const store = new GameStore(clock.now);
		store.push(snapshotEvent());
		store.setDelayMs(6_000);

		const before = store.getSnapshot().displayed!.currentPlay!.pitches.length;
		store.push(pitchEvent("delayed-1"));

		const held = store.getSnapshot();
		// The server's view moved on; the viewer's has not.
		expect(held.live!.currentPlay!.pitches.length).toBe(before + 1);
		expect(held.displayed!.currentPlay!.pitches.length).toBe(before);
		expect(held.queued).toBe(1);
	});

	test("a queued event becomes visible once the delay elapses", async () => {
		const store = new GameStore();
		store.push(snapshotEvent());
		store.setDelayMs(60);

		const before = store.getSnapshot().displayed!.currentPlay!.pitches.length;
		store.push(pitchEvent("delayed-2"));
		expect(store.getSnapshot().displayed!.currentPlay!.pitches.length).toBe(before);

		await Bun.sleep(120);

		const state = store.getSnapshot();
		expect(state.displayed!.currentPlay!.pitches.length).toBe(before + 1);
		expect(state.queued).toBe(0);
	});

	test("events stay queued while paused and flush on resume", async () => {
		const store = new GameStore();
		store.push(snapshotEvent());
		store.setDelayMs(10);
		store.setPaused(true);

		const before = store.getSnapshot().displayed!.currentPlay!.pitches.length;
		store.push(pitchEvent("paused-1"));
		store.push(pitchEvent("paused-2"));

		await Bun.sleep(50);
		expect(store.getSnapshot().displayed!.currentPlay!.pitches.length).toBe(before);
		expect(store.getSnapshot().queued).toBe(2);

		store.setPaused(false);
		await Bun.sleep(50);

		expect(store.getSnapshot().displayed!.currentPlay!.pitches.length).toBe(before + 2);
	});

	test("calibrating from a pause sets the delay to the elapsed time", () => {
		const clock = fakeClock();
		const store = new GameStore(clock.now);
		store.push(snapshotEvent());

		// The viewer pauses, waits for the same pitch to reach their TV, resumes.
		const pausedAt = clock.now();
		store.setPaused(true);
		clock.advance(7_400);
		store.calibrateFrom(pausedAt);

		expect(store.getSnapshot().delayMs).toBe(7_400);
		expect(store.getSnapshot().paused).toBe(false);
	});

	test("a resync snapshot clears the queue rather than replaying stale deltas", () => {
		const store = new GameStore();
		store.push(snapshotEvent());
		store.setDelayMs(10_000);
		store.push(pitchEvent("stale-1"));
		expect(store.getSnapshot().queued).toBe(1);

		// Reconnect: the server sends current state.
		const resynced: GameSnapshot = { ...base, updatedAt: 999 };
		store.push(snapshotEvent(resynced));

		const state = store.getSnapshot();
		expect(state.queued).toBe(0);
		expect(state.displayed!.updatedAt).toBe(999);
		expect(state.live!.updatedAt).toBe(999);
	});

	test("reset drops the delay and jumps displayed to live", () => {
		const store = new GameStore();
		store.push(snapshotEvent());
		store.setDelayMs(5_000);
		store.push(pitchEvent("reset-1"));

		store.reset();

		const state = store.getSnapshot();
		expect(state.delayMs).toBe(0);
		expect(state.queued).toBe(0);
		expect(state.displayed).toEqual(state.live!);
	});

	test("notifies subscribers and stops after unsubscribe", () => {
		const store = new GameStore();
		let calls = 0;
		const unsubscribe = store.subscribe(() => (calls += 1));

		store.push(snapshotEvent());
		expect(calls).toBeGreaterThan(0);

		const seen = calls;
		unsubscribe();
		store.push(pitchEvent("after-unsub"));
		expect(calls).toBe(seen);
	});
});

describe("stall detection", () => {
	test("lastEventAt moves on every event, unlike live.updatedAt", () => {
		const clock = fakeClock();
		const store = new GameStore(clock.now);

		store.push(snapshotEvent());
		const joinedAt = store.getSnapshot().lastEventAt;
		const snapshotTime = store.getSnapshot().live!.updatedAt;

		clock.advance(4_000);
		store.push(pitchEvent("later"));

		const state = store.getSnapshot();
		expect(state.lastEventAt).toBe(joinedAt! + 4_000);
		// Deltas carry no timestamp, so the snapshot's own clock stands still —
		// which is exactly why a separate arrival time is tracked.
		expect(state.live!.updatedAt).toBe(snapshotTime);
	});
});
