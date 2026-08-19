import { describe, expect, test } from "bun:test";

import { loadGumboFixture, loadSavantFixture } from "./fixtures.ts";
import { indexSavantPitches } from "../src/server/mlb/schemas/savant.ts";
import { toGameSnapshot } from "../src/server/transform/snapshot.ts";
import { diffSnapshots, iteratePitches } from "../src/server/transform/diff.ts";
import { toPitchMixByPitcher, toSeasonPitchMix } from "../src/server/transform/pitchMix.ts";
import { reduceGameEvents } from "../src/client/game/reducer.ts";
import type { GameSnapshot } from "../src/shared/models.ts";

const FIXED_NOW = 1_700_000_000_000;

async function snapshotFor(label: "final" | "live"): Promise<GameSnapshot> {
	const [gumbo, savant] = await Promise.all([loadGumboFixture(label), loadSavantFixture(label)]);
	return toGameSnapshot(gumbo, savant, FIXED_NOW);
}

describe("toGameSnapshot", () => {
	test("carries team records, probable pitchers and player names", async () => {
		const snapshot = await snapshotFor("final");

		expect(snapshot.teams.home.record).toMatch(/^\d+-\d+$/);
		expect(snapshot.teams.away.abbreviation).toBe("BAL");
		expect(snapshot.probablePitchers.home).toBeGreaterThan(0);
		expect(snapshot.probablePitchers.away).toBeGreaterThan(0);
		expect(snapshot.decisions?.winnerId).toBeGreaterThan(0);
		expect(snapshot.decisions?.loserId).toBeGreaterThan(0);
		expect(snapshot.gameInfo.officialScorer || snapshot.venue.name).toBeTruthy();

		const player = Object.values(snapshot.players)[0]!;
		expect(player.useName).toBeTruthy();
		expect(player.lastName).toBeTruthy();
	});

	test("splits ABS challenges into overturned and confirmed", async () => {
		const snapshot = await snapshotFor("live");
		if (!snapshot.abs) return;

		expect(snapshot.abs.home.remaining).toBeGreaterThanOrEqual(0);
		expect(snapshot.abs.home.usedSuccessful).toBeGreaterThanOrEqual(0);
		expect(snapshot.abs.home.usedFailed).toBeGreaterThanOrEqual(0);
	});

	test("builds a final game with no raw feed shapes leaking through", async () => {
		const snapshot = await snapshotFor("final");

		expect(snapshot.gamePk).toBe(822940);
		expect(snapshot.state.kind).toBe("final");
		expect(snapshot.state.isFinal).toBe(true);
		expect(snapshot.teams.home.abbreviation).toBe("TB");
		expect(snapshot.teams.away.abbreviation).toBe("BAL");
		expect(snapshot.plays.length).toBeGreaterThan(0);

		// Player keys are numbers, not GUMBO's "ID683002" strings.
		for (const key of Object.keys(snapshot.players)) {
			expect(Number.isInteger(Number(key))).toBe(true);
		}
	});

	test("is pure — same inputs give the same output", async () => {
		const [a, b] = await Promise.all([snapshotFor("final"), snapshotFor("final")]);
		expect(a).toEqual(b);
	});

	test("works with no Savant feed at all", async () => {
		const gumbo = await loadGumboFixture("live");
		const snapshot = toGameSnapshot(gumbo, null, FIXED_NOW);

		const pitches = [...iteratePitches(snapshot)];
		expect(pitches.length).toBeGreaterThan(0);
		// GUMBO alone still yields locations; only Statcast metrics go missing.
		expect(pitches.some(pitch => pitch.location !== null)).toBe(true);
		expect(pitches.every(pitch => pitch.metrics === null)).toBe(true);
	});
});

describe("pitch transform", () => {
	test("every pitch carries a playId and a resolved call", async () => {
		const snapshot = await snapshotFor("final");

		for (const pitch of iteratePitches(snapshot)) {
			expect(pitch.playId).toBeTruthy();
			expect(pitch.call.kind).toBeTruthy();
			expect(pitch.countBefore.balls).toBeLessThanOrEqual(3);
			expect(pitch.countBefore.strikes).toBeLessThanOrEqual(2);
		}
	});

	test("locations are in Statcast plate_x/plate_z feet, the range StrikeZonePlot expects", async () => {
		const snapshot = await snapshotFor("final");
		const located = [...iteratePitches(snapshot)].filter(pitch => pitch.location !== null);

		expect(located.length).toBeGreaterThan(300);
		for (const pitch of located) {
			// A 4ft x 5ft plot window; anything outside this is a unit error.
			expect(Math.abs(pitch.location!.x)).toBeLessThan(4);
			expect(pitch.location!.z).toBeGreaterThan(-1);
			expect(pitch.location!.z).toBeLessThan(8);
		}
	});

	test("merges Savant batted-ball metrics onto the right pitch", async () => {
		const [gumbo, savant] = await Promise.all([loadGumboFixture("final"), loadSavantFixture("final")]);
		const snapshot = toGameSnapshot(gumbo, savant, FIXED_NOW);
		const index = indexSavantPitches(savant);

		const batted = [...iteratePitches(snapshot)].filter(pitch => pitch.metrics?.battedBall);
		expect(batted.length).toBe(savant.exit_velocity.length);

		for (const pitch of batted) {
			const row = index.get(pitch.playId);
			expect(row).toBeDefined();
			// Savant string-encodes these ("85.9", ".010"); they must arrive as numbers.
			const exitVelocity = pitch.metrics!.battedBall!.exitVelocity;
			if (exitVelocity !== null) {
				expect(typeof exitVelocity).toBe("number");
				expect(exitVelocity).toBe((row!.hit_speed ?? row!.launch_speed)!);
			}
		}
	});

	test("batted-ball metrics appear only on contact", async () => {
		const snapshot = await snapshotFor("final");

		for (const pitch of iteratePitches(snapshot)) {
			if (!pitch.metrics?.battedBall) continue;
			expect(pitch.call.isInPlay).toBe(true);
		}
	});

	test("swing tracking covers whiffs and fouls, not just contact", async () => {
		const snapshot = await snapshotFor("final");
		const tracked = [...iteratePitches(snapshot)].filter(pitch => pitch.metrics?.swing);

		// Bat tracking is far more common than contact — conflating the two
		// was a real bug, so this asserts they stay distinct.
		const batted = tracked.filter(pitch => pitch.metrics!.battedBall !== null);
		expect(tracked.length).toBeGreaterThan(batted.length * 2);
		expect(tracked.some(pitch => pitch.call.kind === "strike" && !pitch.call.isInPlay)).toBe(true);
		expect(tracked.some(pitch => pitch.call.kind === "foul")).toBe(true);

		for (const pitch of tracked) {
			expect(pitch.metrics!.swing!.batSpeed).toBeGreaterThan(0);
		}
	});
});

describe("play actions", () => {
	function allActions(snapshot: GameSnapshot) {
		return [...snapshot.plays.flatMap(play => play.actions), ...(snapshot.currentPlay?.actions ?? [])];
	}

	test("lifts every GUMBO actionIndex entry, including status changes", async () => {
		const [gumbo, snapshot] = await Promise.all([loadGumboFixture("live"), snapshotFor("live")]);
		const currentPlay = gumbo.liveData.plays.currentPlay;
		const expected = gumbo.liveData.plays.allPlays
			.filter(play => play.about.isComplete && play.atBatIndex !== currentPlay?.atBatIndex)
			.flatMap(play => play.actionIndex.map(index => play.playEvents[index]).filter(event => event != null));
		const liveExpected = (currentPlay?.actionIndex ?? [])
			.map(index => currentPlay?.playEvents[index])
			.filter(event => event != null);

		const actions = allActions(snapshot);
		expect(actions.length).toBe(expected.length + liveExpected.length);
		expect(actions.some(action => action.description === "Status Change - Pre-Game")).toBe(true);
		expect(actions.some(action => action.description === "Status Change - Warmup")).toBe(true);
		expect(actions.some(action => action.description === "Status Change - In Progress")).toBe(true);
	});

	test("carries stolen-base-class, substitution, and ejection actions on the parent at-bat", async () => {
		const snapshot = await snapshotFor("live");

		const caughtStealing = snapshot.plays.find(play => play.atBatIndex === 18);
		expect(caughtStealing?.eventType).toBe("walk");
		expect(caughtStealing?.actions.map(action => action.eventType)).toContain("caught_stealing_2b");
		expect(caughtStealing?.actions.some(action => /caught stealing/i.test(action.description))).toBe(true);

		const wildPitch = snapshot.plays.find(play => play.atBatIndex === 19);
		expect(wildPitch?.actions.map(action => action.eventType)).toContain("wild_pitch");

		const pitchingChange = snapshot.plays.find(play => play.atBatIndex === 50);
		expect(pitchingChange?.actions.map(action => action.eventType)).toContain("pitching_substitution");
		expect(pitchingChange?.actions.some(action => /Pitching Change/i.test(action.description))).toBe(true);

		const ejection = snapshot.plays.find(play => play.atBatIndex === 63);
		expect(ejection?.actions.map(action => action.eventType)).toContain("ejection");
	});

	test("carries defensive substitutions from a completed game", async () => {
		const snapshot = await snapshotFor("final");
		const play = snapshot.plays.find(entry => entry.actions.some(action => action.eventType === "defensive_substitution"));

		expect(play).toBeDefined();
		expect(play!.actions.some(action => /Defensive Substitution/i.test(action.description))).toBe(true);
		expect(play!.actions.some(action => action.playerId != null && action.replacedPlayerId != null)).toBe(true);
	});
});

describe("pitch mix", () => {
	test("snapshot includes in-game mix for pitchers who have thrown", async () => {
		const snapshot = await snapshotFor("final");
		const starterId = snapshot.boxscore.home.pitching[0]!.playerId;
		const mix = snapshot.pitchMixByPitcher[starterId];

		expect(mix).toBeDefined();
		expect(mix!.length).toBeGreaterThan(0);
		expect(mix!.reduce((sum, entry) => sum + entry.percent, 0)).toBeGreaterThanOrEqual(99);
		expect(mix!.reduce((sum, entry) => sum + entry.percent, 0)).toBeLessThanOrEqual(100);
		expect(mix!.some(entry => entry.averageSpeed != null && entry.averageSpeed > 70)).toBe(true);
	});

	test("counts match a manual tally from the play log", async () => {
		const snapshot = await snapshotFor("final");
		const starterId = snapshot.boxscore.home.pitching[0]!.playerId;
		const manual = new Map<string, number>();

		for (const play of snapshot.plays) {
			if (play.pitcherId !== starterId) continue;
			for (const pitch of play.pitches) {
				if (!pitch.type) continue;
				manual.set(pitch.type.code, (manual.get(pitch.type.code) ?? 0) + 1);
			}
		}
		if (snapshot.currentPlay?.pitcherId === starterId) {
			for (const pitch of snapshot.currentPlay.pitches) {
				if (!pitch.type) continue;
				manual.set(pitch.type.code, (manual.get(pitch.type.code) ?? 0) + 1);
			}
		}

		const mix = snapshot.pitchMixByPitcher[starterId]!;
		expect(mix.reduce((sum, entry) => sum + entry.count, 0)).toBe([...manual.values()].reduce((a, b) => a + b, 0));
		for (const entry of mix) {
			expect(entry.count).toBe(manual.get(entry.code) ?? 0);
		}
	});

	test("toPitchMixByPitcher returns nothing for a pitcher who has not appeared", async () => {
		const snapshot = await snapshotFor("final");
		expect(toPitchMixByPitcher(snapshot.plays, snapshot.currentPlay)[999_999_999]).toBeUndefined();
	});

	test("snapshot defaults season mix to empty — the watcher overlays fetched arsenals", async () => {
		const snapshot = await snapshotFor("live");
		expect(snapshot.seasonPitchMixByPitcher).toEqual({});
	});

	test("toSeasonPitchMix converts 0–1 percentages and sorts by count", () => {
		const mix = toSeasonPitchMix({
			stats: [
				{
					splits: [
						{
							stat: {
								percentage: 0.12350598,
								count: 31,
								type: { code: "SL", description: "Slider" },
							},
						},
						{
							stat: {
								percentage: 0.47808766,
								count: 120,
								averageSpeed: 96.19834884166669,
								type: { code: "FF", description: "Four-seam FB" },
							},
						},
						{
							stat: {
								percentage: 0.23904383,
								count: 60,
								type: { code: "CU", description: "Curveball" },
							},
						},
					],
				},
			],
		});

		expect(mix.map(entry => entry.code)).toEqual(["FF", "CU", "SL"]);
		expect(mix[0]).toEqual({
			code: "FF",
			label: "Four-seam FB",
			count: 120,
			percent: 48,
			averageSpeed: 96.19834884166669,
		});
		expect(mix[1]!.percent).toBe(24);
		expect(mix[1]!.averageSpeed).toBeNull();
		expect(mix[2]!.percent).toBe(12);
	});

	test("toSeasonPitchMix returns nothing for an empty arsenal payload", () => {
		expect(toSeasonPitchMix({ stats: [] })).toEqual([]);
		expect(toSeasonPitchMix({ stats: [{ splits: [] }] })).toEqual([]);
	});
});

describe("linescore", () => {
	test("uses the null / \"X\" convention LineScore renders", async () => {
		const snapshot = await snapshotFor("final");
		const { home, away, scheduledInnings } = snapshot.linescore;

		expect(home.innings.length).toBeGreaterThanOrEqual(scheduledInnings);
		expect(away.innings.length).toBe(home.innings.length);

		for (const value of [...home.innings, ...away.innings]) {
			expect(value === null || value === "X" || typeof value === "number").toBe(true);
		}

		// Inning runs must add up to the line total.
		const homeSum = home.innings.reduce<number>((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
		expect(homeSum).toBe(home.runs);
	});

	test("carries mound visits remaining and ABS remaining from GUMBO", async () => {
		const snapshot = await snapshotFor("live");

		expect(snapshot.linescore.away.moundVisitsRemaining).toBe(1);
		expect(snapshot.linescore.home.moundVisitsRemaining).toBe(2);
		expect(snapshot.abs?.away.remaining).toBe(0);
		expect(snapshot.abs?.home.remaining).toBe(1);
	});
});

describe("boxscore", () => {
	test("row keys match the sports BoxScore presets and totals add up", async () => {
		const snapshot = await snapshotFor("final");
		const home = snapshot.boxscore.home;

		expect(home.batting.length).toBeGreaterThan(0);
		expect(home.pitching.length).toBeGreaterThan(0);
		expect(home.batting.some(line => line.starter)).toBe(true);
		expect(home.pitching[0]!.starter).toBe(true);

		const hits = home.batting.reduce((sum, line) => sum + line.h, 0);
		expect(hits).toBe(home.battingTotals.h);

		const runs = home.batting.reduce((sum, line) => sum + line.r, 0);
		expect(runs).toBe(home.battingTotals.r);

		expect(home.battingOrder.length).toBeGreaterThan(0);
		expect(home.batting.some(line => line.obp !== undefined)).toBe(true);
		expect(home.pitching[0]!.whip).toBeTruthy();
		expect(home.bench.length + home.bullpen.length).toBeGreaterThan(0);
	});
});

describe("diff / reduce round-trip", () => {
	test("a first diff is a single snapshot event", async () => {
		const snapshot = await snapshotFor("live");
		const events = diffSnapshots(null, snapshot);

		expect(events).toHaveLength(1);
		expect(events[0]!.t).toBe("snapshot");
	});

	test("identical snapshots produce no events", async () => {
		const snapshot = await snapshotFor("live");
		expect(diffSnapshots(snapshot, snapshot)).toHaveLength(0);
	});

	test("replaying deltas reproduces the server snapshot exactly", async () => {
		// Rewind a real game to an earlier state by dropping recent at-bats,
		// then check that the deltas carrying it forward rebuild it exactly.
		const next = await snapshotFor("live");
		const previous: GameSnapshot = {
			...next,
			plays: next.plays.slice(0, -3),
			currentPlay: null,
			state: { ...next.state, outs: 0, count: { balls: 0, strikes: 0 } },
		};

		const events = diffSnapshots(previous, next);
		expect(events.length).toBeGreaterThan(0);

		const replayed = reduceGameEvents(previous, events);
		expect(replayed).toEqual(next);
	});

	test("a late Statcast metric arrives as its own event and lands on the right pitch", async () => {
		const next = await snapshotFor("final");
		const target = [...iteratePitches(next)].find(pitch => pitch.metrics !== null);
		expect(target).toBeDefined();

		// Model the real timing: GUMBO delivered the pitch, Savant hadn't yet.
		const previous: GameSnapshot = {
			...next,
			plays: next.plays.map(play => ({
				...play,
				pitches: play.pitches.map(pitch =>
					pitch.playId === target!.playId ? { ...pitch, metrics: null } : pitch,
				),
			})),
		};

		const events = diffSnapshots(previous, next);
		const metricEvents = events.filter(event => event.t === "pitchMetrics");

		expect(metricEvents).toHaveLength(1);
		expect(metricEvents[0]).toMatchObject({ t: "pitchMetrics", playId: target!.playId });

		expect(reduceGameEvents(previous, events)).toEqual(next);
	});

	test("a new pitch on the live at-bat round-trips", async () => {
		const next = await snapshotFor("live");
		expect(next.currentPlay).not.toBeNull();

		const slicedCurrentPlay = { ...next.currentPlay!, pitches: next.currentPlay!.pitches.slice(0, -1) };
		const previous: GameSnapshot = {
			...next,
			currentPlay: slicedCurrentPlay,
			pitchMixByPitcher: toPitchMixByPitcher(next.plays, slicedCurrentPlay),
		};

		const events = diffSnapshots(previous, next);
		expect(events.some(event => event.t === "pitch")).toBe(true);
		expect(events.some(event => event.t === "pitchMix")).toBe(true);
		expect(reduceGameEvents(previous, events)).toEqual(next);
	});

	test("pitchMix delta alone updates the client view", async () => {
		const next = await snapshotFor("live");
		expect(next.currentPlay).not.toBeNull();

		const previous: GameSnapshot = {
			...next,
			currentPlay: { ...next.currentPlay!, pitches: next.currentPlay!.pitches.slice(0, -1) },
			pitchMixByPitcher: toPitchMixByPitcher(next.plays, {
				...next.currentPlay!,
				pitches: next.currentPlay!.pitches.slice(0, -1),
			}),
		};

		const events = diffSnapshots(previous, next);
		const mixEvents = events.filter(event => event.t === "pitchMix");
		expect(mixEvents).toHaveLength(1);

		const replayed = reduceGameEvents(previous, mixEvents);
		expect(replayed!.pitchMixByPitcher).toEqual(next.pitchMixByPitcher);
	});

	test("seasonPitchMix delta alone updates the client view", async () => {
		const next = await snapshotFor("live");
		const pitcherId = next.currentPlay?.pitcherId ?? next.probablePitchers.home;
		expect(pitcherId).toBeTruthy();

		const seasonMix = [{ code: "FF", label: "Four-seam FB", count: 120, percent: 48, averageSpeed: 96.2 }];
		const withSeason: GameSnapshot = {
			...next,
			seasonPitchMixByPitcher: { [pitcherId!]: seasonMix },
		};

		const events = diffSnapshots(next, withSeason);
		expect(events).toEqual([{ t: "seasonPitchMix", seasonPitchMixByPitcher: withSeason.seasonPitchMixByPitcher }]);
		expect(reduceGameEvents(next, events)).toEqual(withSeason);
	});

	test("abs, decisions and gameInfo ride their own events", async () => {
		const next = await snapshotFor("final");
		const previous: GameSnapshot = {
			...next,
			abs: null,
			decisions: null,
			gameInfo: {
				durationMinutes: null,
				attendance: null,
				firstPitch: null,
				weather: null,
				wind: null,
				officialScorer: null,
				datacaster: null,
			},
		};

		const events = diffSnapshots(previous, next);
		expect(events.some(event => event.t === "abs")).toBe(true);
		expect(events.some(event => event.t === "decisions")).toBe(true);
		expect(events.some(event => event.t === "gameInfo")).toBe(true);
		expect(reduceGameEvents(previous, events)).toEqual(next);
	});
});
