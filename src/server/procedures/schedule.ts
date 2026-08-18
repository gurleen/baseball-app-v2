import { os } from "@orpc/server";
import { z } from "zod";

import { getSchedule } from "../mlb/schedule.ts";
import { replayMode } from "../mlb/replay.ts";
import { toHalfInning } from "../transform/state.ts";
import type { HalfInning } from "../../shared/models.ts";

const ScheduleInput = z.object({
	/** YYYY-MM-DD. Defaults to today in the server's timezone. */
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
});

export interface ScheduleTeam {
	id: number;
	name: string;
	abbreviation: string;
	score: number | null;
	record: string | null;
}

export interface ScheduleGame {
	gamePk: number;
	startsAt: string;
	status: { detail: string; isFinal: boolean; isLive: boolean; isPreview: boolean };
	teams: { home: ScheduleTeam; away: ScheduleTeam };
	venue: string | null;
	/** Only meaningful once a game is underway. */
	inning: { number: number; half: HalfInning | null; state: string | null } | null;
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

		return response.dates.flatMap(date =>
			date.games.map((game): ScheduleGame => {
				const code = game.status.abstractGameCode;
				const linescore = game.linescore;

				return {
					gamePk: game.gamePk,
					startsAt: game.gameDate,
					status: {
						detail: game.status.detailedState,
						isFinal: code === "F",
						isLive: code === "L",
						isPreview: code === "P",
					},
					teams: {
						home: toScheduleTeam(game.teams.home),
						away: toScheduleTeam(game.teams.away),
					},
					venue: game.venue?.name ?? null,
					inning: linescore?.currentInning
						? {
								number: linescore.currentInning,
								half: toHalfInning(linescore.inningHalf),
								state: linescore.inningState ?? null,
							}
						: null,
				};
			}),
		);
	}),
};

type ScheduleSide = Awaited<ReturnType<typeof getSchedule>>["dates"][number]["games"][number]["teams"]["home"];

function toScheduleTeam(side: ScheduleSide): ScheduleTeam {
	const record = side.leagueRecord ? `${side.leagueRecord.wins}-${side.leagueRecord.losses}` : null;

	return {
		id: side.team.id,
		name: side.team.name ?? "",
		// Requires the `team` hydrate, which getSchedule requests by default.
		abbreviation: side.team.abbreviation ?? "",
		score: side.score ?? null,
		record,
	};
}
