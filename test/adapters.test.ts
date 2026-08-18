import { describe, expect, test } from "bun:test";

import {
	absChallengeRows,
	canShowAtBat,
	currentLineup,
	formatZoneBounds,
	periodLabel,
	toPlayByPlayRows,
	toSequencePitches,
	toSportsResult,
	toSprayBalls,
	toStrikeZonePitches,
	zoneBounds,
} from "../src/client/game/adapters.ts";
import { toGameSnapshot } from "../src/server/transform/snapshot.ts";
import { iteratePitches } from "../src/server/transform/diff.ts";
import { loadGumboFixture, loadSavantFixture } from "./fixtures.ts";

const snapshot = toGameSnapshot(await loadGumboFixture("final"), await loadSavantFixture("final"), 0);
const allPitches = [...iteratePitches(snapshot)];

describe("StrikeZonePlot projection", () => {
	test("keeps every tracked pitch and drops only untracked ones", () => {
		const plotted = toStrikeZonePitches(allPitches);
		const tracked = allPitches.filter(pitch => pitch.location !== null);

		expect(plotted.length).toBe(tracked.length);
		expect(plotted.length).toBeGreaterThan(300);
	});

	test("coordinates stay in the plot's 4ft x 5ft window", () => {
		for (const pitch of toStrikeZonePitches(allPitches)) {
			expect(Math.abs(pitch.x)).toBeLessThan(4);
			expect(pitch.z).toBeGreaterThan(-1);
			expect(pitch.z).toBeLessThan(8);
		}
	});

	test("splits strikes into called and swinging, which the library colors apart", () => {
		const results = new Set(toStrikeZonePitches(allPitches).map(pitch => pitch.result));

		expect(results.has("called")).toBe(true);
		expect(results.has("swinging")).toBe(true);
		expect(results.has("ball")).toBe(true);
		expect(results.has("foul")).toBe(true);
		// "strike" is ours, not theirs — leaking it would render as uncolored.
		expect(results.has("strike" as never)).toBe(false);
	});

	test("every result is a value the library understands", () => {
		const allowed = new Set(["ball", "called", "swinging", "foul", "inplay", "hbp"]);
		for (const pitch of allPitches) {
			expect(allowed.has(toSportsResult(pitch))).toBe(true);
		}
	});
});

describe("zoneBounds", () => {
	test("uses the batter's own zone rather than the league-average default", () => {
		const bounds = zoneBounds(snapshot.plays.at(-1)!.pitches);

		expect(bounds.zoneTop).toBeGreaterThan(2.5);
		expect(bounds.zoneTop).toBeLessThan(4.5);
		expect(bounds.zoneBottom).toBeGreaterThan(1);
		expect(bounds.zoneBottom).toBeLessThan(2.5);
	});

	test("returns nothing when no pitch is tracked, so the component defaults apply", () => {
		expect(zoneBounds([])).toEqual({});
	});
});

describe("formatZoneBounds", () => {
	test("prints top and bottom in feet to two decimals", () => {
		expect(formatZoneBounds({ zoneTop: 3.42, zoneBottom: 1.59 })).toBe("TOP 3.42 · BOT 1.59 FT");
	});

	test("returns nothing when the batter's zone has not been tracked yet", () => {
		expect(formatZoneBounds({})).toBeUndefined();
		expect(formatZoneBounds({ zoneTop: 3.42 })).toBeUndefined();
		expect(formatZoneBounds({ zoneBottom: 1.59 })).toBeUndefined();
	});
});

describe("PitchSequence projection", () => {
	test("carries count, velocity and location per pitch", () => {
		const play = snapshot.plays.find(entry => entry.pitches.length >= 4)!;
		const rows = toSequencePitches(play.pitches);

		expect(rows).toHaveLength(play.pitches.length);
		expect(rows[0]!.count).toMatch(/^\d-\d$/);
		expect(rows.some(row => typeof row.velocity === "number")).toBe(true);
		expect(rows.some(row => typeof row.x === "number")).toBe(true);
	});

	test("maps kinds to the four the component colors", () => {
		const allowed = new Set(["ball", "strike", "foul", "inplay"]);
		for (const play of snapshot.plays) {
			for (const row of toSequencePitches(play.pitches)) {
				expect(allowed.has(row.kind!)).toBe(true);
			}
		}
	});
});

describe("PlayByPlay projection", () => {
	test("inserts an inning marker whenever the half changes", () => {
		const rows = toPlayByPlayRows(snapshot.plays);
		const markers = rows.filter(row => row.kind === "period");

		expect(markers.length).toBeGreaterThan(10);
		expect(markers[0]!.period).toMatch(/^(TOP|BOT) \d+$/);
		// The first row is a marker, not a play.
		expect(rows[0]!.kind).toBe("period");
	});

	test("attributes plays to the batting side and marks scoring plays", () => {
		const rows = toPlayByPlayRows(snapshot.plays).filter(row => row.kind !== "period");

		expect(rows.length).toBe(snapshot.plays.length);
		for (const [index, row] of rows.entries()) {
			const play = snapshot.plays[index]!;
			expect(row.team).toBe(play.halfInning === "top" ? "away" : "home");
			if (play.isScoringPlay) {
				expect(row.kind).toBe("score");
				expect(row.score).toMatch(/^\d+-\d+$/);
			}
		}
	});
});

describe("SprayChart projection", () => {
	test("plots batted balls in feet from home plate", () => {
		const balls = toSprayBalls(snapshot.plays);

		expect(balls.length).toBeGreaterThan(0);
		for (const ball of balls) {
			// A ball in play is within the park; a unit error would blow past this.
			expect(Math.abs(ball.x!)).toBeLessThan(500);
			expect(ball.y!).toBeGreaterThan(-50);
			expect(ball.y!).toBeLessThan(600);
		}
	});

	test("labels hit types and defaults the rest to outs", () => {
		const balls = toSprayBalls(snapshot.plays);
		const allowed = new Set(["single", "double", "triple", "homer", "out"]);

		for (const ball of balls) expect(allowed.has(ball.result!)).toBe(true);
	});

	test("filters to one side", () => {
		const all = toSprayBalls(snapshot.plays);
		const home = toSprayBalls(snapshot.plays, "home");
		const away = toSprayBalls(snapshot.plays, "away");

		expect(home.length + away.length).toBe(all.length);
		expect(home.length).toBeGreaterThan(0);
	});
});

describe("periodLabel", () => {
	test("is blank for a finished game, since Scoreboard already says FINAL", () => {
		expect(periodLabel(snapshot)).toBe("");
	});

	test("reads TOP/BOT during play", () => {
		const live = { ...snapshot, state: { ...snapshot.state, kind: "live" as const, inning: 7, halfInning: "top" as const, inningState: "Top" } };
		expect(periodLabel(live)).toBe("TOP 7");
	});

	test("marks the break between halves", () => {
		const between = { ...snapshot, state: { ...snapshot.state, kind: "live" as const, inning: 7, halfInning: "top" as const, inningState: "Middle" } };
		expect(periodLabel(between)).toBe("MIDDLE 7");
	});
});

describe("lineup and ABS projections", () => {
	test("current lineup follows battingOrder", () => {
		const lineup = currentLineup(snapshot.boxscore.home);
		expect(lineup.length).toBeGreaterThan(0);
		expect(lineup[0]!.slot).toBe(1);
		expect(lineup.every((row, index) => row.slot === index + 1 || snapshot.boxscore.home.battingOrder.length === 0)).toBe(true);
	});

	test("a finished game still has an at-bat to show", () => {
		expect(canShowAtBat(snapshot)).toBe(true);
	});

	test("ABS rows come from pitches that went to review", () => {
		const rows = absChallengeRows(snapshot);
		for (const row of rows) {
			expect(row.batterId).toBeGreaterThan(0);
			expect(row.inning).toBeGreaterThan(0);
		}
	});
});
