import { describe, expect, test } from "bun:test";

import { loadGumboFixture } from "./fixtures.ts";
import { toScheduleGameFromGumbo } from "../src/server/transform/schedule.ts";

const live = toScheduleGameFromGumbo(await loadGumboFixture("live"));
const final = toScheduleGameFromGumbo(await loadGumboFixture("final"));

describe("toScheduleGameFromGumbo", () => {
	test("a live game carries team logos keys, R/H/E and the current matchup", () => {
		expect(live.status.isLive).toBe(true);
		expect(live.status.isFinal).toBe(false);
		expect(live.situation).not.toBeNull();

		for (const side of [live.teams.away, live.teams.home]) {
			expect(side.id).toBeGreaterThan(0);
			expect(side.shortName).toBeTruthy();
			expect(side.abbreviation).toBeTruthy();
			expect(typeof side.score).toBe("number");
			expect(typeof side.hits).toBe("number");
			expect(typeof side.errors).toBe("number");
		}

		const pitcher = live.situation!.pitcher;
		const batter = live.situation!.batter;

		expect(pitcher).not.toBeNull();
		expect(pitcher!.id).toBeGreaterThan(0);
		expect(pitcher!.lastName).toBeTruthy();
		expect(pitcher!.lastName.includes(" ")).toBe(false);

		expect(batter).not.toBeNull();
		expect(batter!.id).toBeGreaterThan(0);
		expect(batter!.lastName).toBeTruthy();
		expect(batter!.lastName.includes(" ")).toBe(false);

		expect(live.decisions).toBeNull();
	});

	test("live matchup stats are season lines, not the game log", () => {
		const pitcher = live.situation!.pitcher!;
		const batter = live.situation!.batter!;

		// GUMBO season splits omit `summary`; we format the same line the
		// schedule hydrate would have sent.
		expect(pitcher.statsSummary).toMatch(/^\d+-\d+, .+ ERA$/);
		expect(batter.statsSummary).toMatch(/^\.\d+\/\.\d+\/\.\d+$/);
	});

	test("a final game drops the live situation and fills winner/loser", () => {
		expect(final.status.isFinal).toBe(true);
		expect(final.status.isLive).toBe(false);
		expect(final.situation).toBeNull();
		expect(final.decisions).not.toBeNull();

		expect(final.decisions!.winner).not.toBeNull();
		expect(final.decisions!.loser).not.toBeNull();
		expect(final.decisions!.winner!.lastName).toBeTruthy();
		expect(final.decisions!.loser!.lastName).toBeTruthy();

		// Decisions use the game log ("W", "L, 2.1 IP") rather than the season line.
		expect(final.decisions!.winner!.gameSummary).toBeTruthy();
		expect(final.decisions!.loser!.gameSummary).toBeTruthy();
	});

	test("lastName prefers the roster last name over the full name", () => {
		expect(live.teams.home.shortName).not.toBe(live.teams.home.name);
		expect(final.teams.away.shortName).toBeTruthy();
	});
});
