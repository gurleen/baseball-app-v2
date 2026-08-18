import type { AbsChallenges, GumboFeed, TeamData } from "../mlb/schemas/gumbo.ts";
import type { SavantGameFeed, SavantPitchRow } from "../mlb/schemas/savant.ts";
import { indexSavantPitches } from "../mlb/schemas/savant.ts";
import type {
	AbsChallengeState,
	GameDecisions,
	GameInfo,
	GameSnapshot,
	TeamRef,
} from "../../shared/models.ts";
import { toBoxscore } from "./boxscore.ts";
import { toLinescore } from "./linescore.ts";
import { toLivePlay, toPlaySummary } from "./play.ts";
import { toPitchMixByPitcher } from "./pitchMix.ts";
import { toPlayers } from "./players.ts";
import { toGameState } from "./state.ts";

function toTeamRef(team: TeamData): TeamRef {
	const wins = team.record?.wins;
	const losses = team.record?.losses;

	return {
		id: team.id,
		name: team.name,
		abbreviation: team.abbreviation,
		shortName: team.shortName,
		franchiseName: team.franchiseName ?? null,
		clubName: team.clubName ?? team.teamName ?? null,
		record: wins != null && losses != null ? `${wins}-${losses}` : null,
	};
}

function toAbsState(challenges: AbsChallenges | undefined): AbsChallengeState | null {
	if (!challenges) return null;

	return {
		home: {
			remaining: challenges.home.remaining,
			usedSuccessful: challenges.home.usedSuccessful,
			usedFailed: challenges.home.usedFailed,
		},
		away: {
			remaining: challenges.away.remaining,
			usedSuccessful: challenges.away.usedSuccessful,
			usedFailed: challenges.away.usedFailed,
		},
	};
}

function toDecisions(feed: GumboFeed): GameDecisions | null {
	const decisions = feed.liveData.decisions;
	if (!decisions) return null;

	return {
		winnerId: decisions.winner?.id ?? null,
		loserId: decisions.loser?.id ?? null,
		saveId: decisions.save?.id ?? null,
	};
}

function toGameInfo(feed: GumboFeed): GameInfo {
	const info = feed.gameData.gameInfo;
	const weather = feed.gameData.weather;
	const weatherLine =
		weather?.temp || weather?.condition
			? [weather.temp ? `${weather.temp} degrees` : null, weather.condition]
					.filter(Boolean)
					.join(", ")
			: null;

	return {
		durationMinutes: info?.gameDurationMinutes ?? null,
		attendance: info?.attendance ?? null,
		firstPitch: info?.firstPitch ?? null,
		weather: weatherLine,
		wind: weather?.wind ?? null,
		officialScorer: feed.gameData.officialScorer?.fullName ?? null,
		datacaster: feed.gameData.primaryDatacaster?.fullName ?? null,
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
	const probable = feed.gameData.probablePitchers;

	// currentPlay is repeated inside allPlays while the at-bat is live, so it
	// is excluded from the completed list to avoid a duplicate.
	const completed = plays.allPlays.filter(
		play => play.about.isComplete && play.atBatIndex !== currentPlay?.atBatIndex,
	);
	const completedSummaries = completed.map(play => toPlaySummary(play, savantByPlayId));
	const livePlay = toLivePlay(currentPlay, feed.liveData.linescore.offense?.onDeck?.id ?? null, savantByPlayId);

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
		currentPlay: livePlay,
		plays: completedSummaries,
		players: toPlayers(feed),
		boxscore: toBoxscore(feed),
		abs: toAbsState(feed.gameData.absChallenges),
		probablePitchers: {
			home: probable?.home.id ?? null,
			away: probable?.away.id ?? null,
		},
		decisions: toDecisions(feed),
		gameInfo: toGameInfo(feed),
		pitchMixByPitcher: toPitchMixByPitcher(completedSummaries, livePlay),
		updatedAt: now,
	};
}
