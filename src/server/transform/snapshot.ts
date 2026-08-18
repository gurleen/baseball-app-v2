import type { AbsChallenges, GumboFeed, TeamData } from "../mlb/schemas/gumbo.ts";
import type { SavantGameFeed, SavantPitchRow } from "../mlb/schemas/savant.ts";
import { indexSavantPitches } from "../mlb/schemas/savant.ts";
import type { AbsChallengeState, GameSnapshot, TeamRef } from "../../shared/models.ts";
import { toBoxscore } from "./boxscore.ts";
import { toLinescore } from "./linescore.ts";
import { toLivePlay, toPlaySummary } from "./play.ts";
import { toPlayers } from "./players.ts";
import { toGameState } from "./state.ts";

function toTeamRef(team: TeamData): TeamRef {
	return {
		id: team.id,
		name: team.name,
		abbreviation: team.abbreviation,
	};
}

function toAbsState(challenges: AbsChallenges | undefined): AbsChallengeState | null {
	if (!challenges) return null;

	return {
		home: {
			remaining: challenges.home.remaining,
			used: challenges.home.usedSuccessful + challenges.home.usedFailed,
		},
		away: {
			remaining: challenges.away.remaining,
			used: challenges.away.usedSuccessful + challenges.away.usedFailed,
		},
	};
}

/**
 * Builds the complete client-facing view of a game from the raw feeds.
 *
 * Pure: no clock, no network, no mutation of its inputs — `now` is injected
 * so the same fixtures always produce the same snapshot in tests.
 */
export function toGameSnapshot(
	feed: GumboFeed,
	savant: SavantGameFeed | Map<string, SavantPitchRow> | null,
	now: number = Date.now(),
): GameSnapshot {
	const savantByPlayId =
		savant instanceof Map ? savant : savant ? indexSavantPitches(savant) : new Map<string, SavantPitchRow>();

	const plays = feed.liveData.plays;
	const currentPlay = plays.currentPlay;

	// currentPlay is repeated inside allPlays while the at-bat is live, so it
	// is excluded from the completed list to avoid a duplicate.
	const completed = plays.allPlays.filter(
		play => play.about.isComplete && play.atBatIndex !== currentPlay?.atBatIndex,
	);

	return {
		gamePk: feed.gamePk,
		state: toGameState(feed),
		teams: {
			home: toTeamRef(feed.gameData.teams.home),
			away: toTeamRef(feed.gameData.teams.away),
		},
		venue: { id: feed.gameData.venue.id, name: feed.gameData.venue.name },
		datetime: {
			startsAt: feed.gameData.datetime.dateTime,
			dayNight: feed.gameData.datetime.dayNight ?? null,
		},
		linescore: toLinescore(feed),
		currentPlay: toLivePlay(currentPlay, feed.liveData.linescore.offense?.onDeck?.id ?? null, savantByPlayId),
		plays: completed.map(play => toPlaySummary(play, savantByPlayId)),
		players: toPlayers(feed),
		boxscore: toBoxscore(feed),
		abs: toAbsState(feed.gameData.absChallenges),
		updatedAt: now,
	};
}
