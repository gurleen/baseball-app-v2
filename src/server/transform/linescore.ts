import type { GumboFeed } from "../mlb/schemas/gumbo.ts";
import type { InningRuns, Linescore, LinescoreSide } from "../../shared/models.ts";

/**
 * Builds the inning-by-inning runs array in the convention
 * @hydra-tv/sports' LineScore expects:
 *
 *   number  runs scored
 *   null    inning not yet played (renders as a dim dot)
 *   "X"     home half that never needed to be batted
 *
 * GUMBO simply omits `runs` for an unplayed half, which is ambiguous between
 * those last two, so the "X" case is derived: the home team doesn't bat when
 * the game is over and they are ahead.
 */
function toInnings(feed: GumboFeed, side: "home" | "away"): InningRuns[] {
	const linescore = feed.liveData.linescore;
	const scheduled = linescore.scheduledInnings;
	const played = linescore.innings.length;
	const length = Math.max(scheduled, played);

	const isFinal = feed.gameData.status.abstractGameCode === "F";
	const homeRuns = linescore.teams.home.runs ?? 0;
	const awayRuns = linescore.teams.away.runs ?? 0;
	const homeWonWithoutBatting = isFinal && homeRuns > awayRuns;

	const innings: InningRuns[] = [];

	for (let index = 0; index < length; index += 1) {
		const inning = linescore.innings[index];
		const runs = inning?.[side].runs;

		if (runs !== undefined) {
			innings.push(runs);
			continue;
		}

		// The home team's last half is "X" when they clinched without batting.
		// Every other blank is an inning that simply hasn't happened yet.
		const isLastPlayedInning = index === played - 1;
		if (side === "home" && homeWonWithoutBatting && (isLastPlayedInning || index >= played)) {
			innings.push(index < Math.max(played, scheduled) && index >= played ? null : "X");
			continue;
		}

		innings.push(null);
	}

	return innings;
}

function toSide(feed: GumboFeed, side: "home" | "away"): LinescoreSide {
	const team = feed.liveData.linescore.teams[side];

	return {
		runs: team.runs ?? 0,
		hits: team.hits ?? 0,
		errors: team.errors ?? 0,
		leftOnBase: team.leftOnBase ?? 0,
		moundVisitsRemaining: feed.gameData.moundVisits?.[side].remaining ?? null,
		innings: toInnings(feed, side),
	};
}

export function toLinescore(feed: GumboFeed): Linescore {
	return {
		currentInning: feed.liveData.linescore.currentInning ?? null,
		scheduledInnings: feed.liveData.linescore.scheduledInnings,
		home: toSide(feed, "home"),
		away: toSide(feed, "away"),
	};
}
