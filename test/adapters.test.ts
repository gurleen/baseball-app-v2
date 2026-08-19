import { describe, expect, test } from "bun:test";

import {
	absCallLabel,
	absChallengeRows,
	canShowAtBat,
	currentLineup,
	formatMissBy,
	formatMissDirection,
	formatZoneBounds,
	meanZoneBounds,
	missDirection,
	periodLabel,
	toAbsZonePitches,
	toPlayByPlayRows,
	toPlayLog,
	toPitchMixBars,
	formatPitchMixBarValue,
	formatPitchMixBarSpeed,
	toSequencePitches,
	toSportsResult,
	toSprayBalls,
	toStrikeZonePitches,
	umpCallLabel,
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

describe("PitchMix projection", () => {
	test("maps server mix entries onto BarChart rows with short codes and data-viz colors", () => {
		const bars = toPitchMixBars([
			{ code: "FF", label: "4-Seam Fastball", count: 44, percent: 44, averageSpeed: 96.2 },
			{ code: "SL", label: "Slider", count: 27, percent: 27, averageSpeed: null },
		]);

		expect(bars).toEqual([
			{ label: "FF", value: 44, count: 44, color: "var(--ch-1)", averageSpeed: 96.2 },
			{ label: "SL", value: 27, count: 27, color: "var(--ch-2)", averageSpeed: null },
		]);
	});

	test("formats the value column with percent and pitch count", () => {
		const bar = toPitchMixBars([{ code: "FF", label: "4-Seam", count: 51, percent: 57, averageSpeed: 96.198 }])[0]!;
		expect(formatPitchMixBarValue(bar)).toBe("57% · 51");
		expect(formatPitchMixBarSpeed(bar)).toBe("96.2");
	});

	test("formats a missing speed as empty", () => {
		const bar = toPitchMixBars([{ code: "UN", label: "Unknown", count: 1, percent: 100, averageSpeed: null }])[0]!;
		expect(formatPitchMixBarSpeed(bar)).toBe("");
	});
});

describe("PlayByPlay projection", () => {
	test("inserts an inning marker whenever the half changes", () => {
		const rows = toPlayByPlayRows(snapshot);
		const markers = rows.filter(row => row.kind === "period");

		expect(markers.length).toBeGreaterThan(10);
		expect(markers[0]!.period).toMatch(/^(TOP|BOT) \d+$/);
		// The first row is a marker, not a play.
		expect(rows[0]!.kind).toBe("period");
	});

	test("attributes plays to the batting side and marks scoring plays", () => {
		const log = toPlayLog(snapshot);
		const rows = toPlayByPlayRows(snapshot).filter(row => row.kind !== "period");

		expect(rows.length).toBe(log.length);
		expect(log.length).toBeGreaterThan(snapshot.plays.length);

		for (const [index, row] of rows.entries()) {
			const entry = log[index]!;
			const halfInning = entry.kind === "play" ? entry.play.halfInning : entry.action.halfInning;
			expect(row.team).toBe(halfInning === "top" ? "away" : "home");
			if (entry.kind === "play" && entry.play.isScoringPlay) {
				expect(row.kind).toBe("score");
				expect(row.score).toMatch(/^\d+-\d+$/);
			}
			if (entry.kind === "action") {
				expect(row.clock).toBeUndefined();
				expect(row.text).toBe(entry.action.description);
			}
		}
	});

	test("lists nested actions before the plate appearance they belong to", async () => {
		const live = toGameSnapshot(await loadGumboFixture("live"), await loadSavantFixture("live"), 0);
		const log = toPlayLog(live);
		const caught = log.findIndex(
			entry => entry.kind === "action" && entry.action.eventType === "caught_stealing_2b",
		);
		const walk = log.findIndex(entry => entry.kind === "play" && entry.play.atBatIndex === 18);

		expect(caught).toBeGreaterThan(-1);
		expect(walk).toBeGreaterThan(caught);
		expect(log.some(entry => entry.kind === "action" && entry.action.description === "Status Change - Pre-Game")).toBe(
			true,
		);
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

	test("ABS rows carry location and Statcast miss-by", () => {
		const rows = absChallengeRows(snapshot);
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.every(row => row.location !== null)).toBe(true);
		expect(rows.every(row => row.edgeDistance != null && row.edgeDistance > 0)).toBe(true);
		expect(toAbsZonePitches(rows)).toHaveLength(rows.length);
		const bounds = meanZoneBounds(rows);
		expect(bounds.zoneTop).toBeGreaterThan(bounds.zoneBottom!);
	});
});

describe("ABS miss-by helpers", () => {
	test("formatMissBy converts Statcast feet to inches", () => {
		expect(formatMissBy(0.025)).toBe('0.30"');
		expect(formatMissBy(null)).toBeUndefined();
		expect(formatMissBy(undefined)).toBeUndefined();
	});

	test("missDirection reports high/low/inside/outside from catcher's view", () => {
		const zone = { top: 3.5, bottom: 1.5 };
		expect(missDirection({ x: 0, z: 4 }, zone, "R")).toBe("high");
		expect(missDirection({ x: 0, z: 1 }, zone, "R")).toBe("low");
		expect(missDirection({ x: 1.2, z: 2.5 }, zone, "R")).toBe("outside");
		expect(missDirection({ x: -1.2, z: 2.5 }, zone, "R")).toBe("inside");
		expect(missDirection({ x: 1.2, z: 2.5 }, zone, "L")).toBe("inside");
		expect(missDirection({ x: -1.2, z: 2.5 }, zone, "L")).toBe("outside");
		expect(formatMissDirection("high")).toBe("HIGH");
		expect(missDirection(null, zone, "R")).toBeNull();
	});

	test("ABS call flips the ump call when the challenge is overturned", () => {
		expect(umpCallLabel("C", "Called Strike")).toBe("Called Strike");
		expect(absCallLabel("C", "Called Strike", false)).toBe("Called Strike");
		expect(absCallLabel("C", "Called Strike", true)).toBe("Called Ball");
		expect(absCallLabel("B", "Ball", true)).toBe("Called Strike");
	});
});
