import { os } from "@orpc/server";
import { z } from "zod";

import { getSchedule } from "../mlb/schedule.ts";
import { replayMode } from "../mlb/replay.ts";
import { toScheduleGameFromMlb } from "../transform/schedule.ts";
import type { HalfInning } from "../../shared/models.ts";

const ScheduleInput = z.object({
	/** YYYY-MM-DD. Defaults to today in the server's timezone. */
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
});

export interface SchedulePlayer {
	id: number;
	lastName: string;
	/** Season line — starting pitchers and the live matchup. */
	statsSummary: string | null;
	/** Game log line — decisions and due-up. */
	gameSummary: string | null;
}

export interface ScheduleTeam {
	id: number;
	name: string;
	shortName: string;
	abbreviation: string;
	score: number | null;
	hits: number | null;
	errors: number | null;
	record: string | null;
	probablePitcher: SchedulePlayer | null;
}

export interface ScheduleSituation {
	balls: number;
	strikes: number;
	outs: number;
	bases: { first: boolean; second: boolean; third: boolean };
	pitcher: SchedulePlayer | null;
	batter: SchedulePlayer | null;
	onDeck: SchedulePlayer | null;
	inHole: SchedulePlayer | null;
}

export interface ScheduleDecisions {
	winner: SchedulePlayer | null;
	loser: SchedulePlayer | null;
	save: SchedulePlayer | null;
}

export interface ScheduleGame {
	gamePk: number;
	startsAt: string;
	status: {
		detail: string;
		isFinal: boolean;
		isLive: boolean;
		isPreview: boolean;
		isWarmup: boolean;
	};
	teams: { home: ScheduleTeam; away: ScheduleTeam };
	venue: string | null;
	/** Only meaningful once a game is underway. */
	inning: { number: number; half: HalfInning | null; state: string | null } | null;
	situation: ScheduleSituation | null;
	decisions: ScheduleDecisions | null;
}

export const scheduleRouter = {
	/**
	 * The schedule surface, already reduced to what a game card renders —
	 * MLB's date-grouped envelope and hydrated sub-objects stay on the server.
	 */
	byDate: os.input(ScheduleInput).handler(async ({ input, signal }): Promise<ScheduleGame[]> => {
		// Replaying: report only the game this server can actually serve, so
		// the schedule never offers a game that opens someone else's recording.
		if (replayMode) return [replayMode.scheduleGame];

		const response = await getSchedule({ date: input.date, signal });

		return response.dates.flatMap(date => date.games.map(toScheduleGameFromMlb));
	}),
};
