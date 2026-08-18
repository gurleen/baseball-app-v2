import {
	getBatterSeasonStatsFromGumbo,
	getBatterStatsFromGumbo,
	getPitcherSeasonStatsFromGumbo,
	getPitcherStatsFromGumbo,
	getPlayerFromGumbo,
	type GumboFeed,
} from "../mlb/schemas/gumbo.ts";
import type { ScheduleGame as MlbScheduleGame } from "../mlb/schemas/schedule.ts";
import type {
	ScheduleDecisions,
	ScheduleGame,
	SchedulePlayer,
	ScheduleSituation,
	ScheduleTeam,
} from "../procedures/schedule.ts";
import { toHalfInning } from "./state.ts";

/**
 * Reduces MLB's hydrated schedule entry (or a GUMBO feed, in replay) to the
 * fields a game card actually renders. Raw splits, linescore sub-objects and
 * GUMBO player maps stay on this side of the boundary.
 */

interface NamedRef {
	id: number;
	lastName?: string;
	boxscoreName?: string;
	fullName?: string;
	name?: string;
}

interface StatSplit {
	type: { displayName: string };
	group: { displayName: string };
	stats: Record<string, unknown>;
}

type StatGroup = "pitching" | "hitting";

function lastNameOf(player: NamedRef): string {
	if (player.lastName) return player.lastName;
	if (player.boxscoreName) return player.boxscoreName;
	const full = player.fullName ?? player.name;
	if (!full) return "";
	return full.split(/\s+/).at(-1) ?? full;
}

function splitSummary(splits: StatSplit[] | undefined, type: string, group: StatGroup): string | null {
	const split = splits?.find(entry => entry.type.displayName === type && entry.group.displayName === group);
	return group === "pitching" ? pitchingLine(split?.stats) : hittingLine(split?.stats);
}

function pitchingLine(stats: Record<string, unknown> | { summary?: string; wins?: number; losses?: number; era?: string | number } | null | undefined): string | null {
	if (!stats) return null;
	if (typeof stats.summary === "string" && stats.summary.length > 0) return stats.summary;

	const { wins, losses, era } = stats;
	if (typeof wins === "number" && typeof losses === "number" && (typeof era === "string" || typeof era === "number")) {
		return `${wins}-${losses}, ${era} ERA`;
	}

	return null;
}

function hittingLine(stats: Record<string, unknown> | { summary?: string; avg?: string | number; obp?: string | number; slg?: string | number } | null | undefined): string | null {
	if (!stats) return null;
	if (typeof stats.summary === "string" && stats.summary.length > 0) return stats.summary;

	const { avg, obp, slg } = stats;
	if (avg != null && obp != null && slg != null) return `${avg}/${obp}/${slg}`;

	return null;
}

function toSchedulePlayer(
	player: (NamedRef & { stats?: StatSplit[] }) | undefined,
	group: StatGroup,
): SchedulePlayer | null {
	if (!player) return null;

	return {
		id: player.id,
		lastName: lastNameOf(player),
		statsSummary: splitSummary(player.stats, "statsSingleSeason", group),
		gameSummary: splitSummary(player.stats, "gameLog", group),
	};
}

function gumboSummary(feed: GumboFeed, playerId: number, group: StatGroup, game: boolean): string | null {
	const stats =
		group === "pitching"
			? game
				? getPitcherStatsFromGumbo(feed, playerId)
				: getPitcherSeasonStatsFromGumbo(feed, playerId)
			: game
				? getBatterStatsFromGumbo(feed, playerId)
				: getBatterSeasonStatsFromGumbo(feed, playerId);

	return group === "pitching" ? pitchingLine(stats) : hittingLine(stats);
}

function toGumboPlayer(feed: GumboFeed, ref: NamedRef | undefined, group: StatGroup): SchedulePlayer | null {
	if (!ref) return null;

	const person = getPlayerFromGumbo(feed, ref.id);

	return {
		id: ref.id,
		lastName: lastNameOf({
			id: ref.id,
			lastName: person?.lastName,
			boxscoreName: person?.boxscoreName,
			fullName: person?.fullName ?? ref.fullName,
			name: ref.name,
		}),
		statsSummary: gumboSummary(feed, ref.id, group, false),
		gameSummary: gumboSummary(feed, ref.id, group, true),
	};
}

function countValue(value: string | number | undefined): number {
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function occupied(runner: unknown): boolean {
	return runner != null;
}

function isWarmup(detailedState: string, flags?: { isWarmup?: boolean }): boolean {
	return detailedState === "Warmup" || flags?.isWarmup === true;
}

function toInning(linescore: {
	currentInning?: number;
	inningHalf?: string;
	inningState?: string | null;
} | null | undefined): ScheduleGame["inning"] {
	if (!linescore?.currentInning) return null;

	return {
		number: linescore.currentInning,
		half: toHalfInning(linescore.inningHalf),
		state: linescore.inningState ?? null,
	};
}

function toStatus(code: string, detail: string, warmup: boolean): ScheduleGame["status"] {
	return {
		detail,
		isFinal: code === "F",
		isLive: code === "L",
		isPreview: code === "P",
		isWarmup: warmup,
	};
}

export function toScheduleGameFromMlb(game: MlbScheduleGame): ScheduleGame {
	const code = game.status.abstractGameCode;
	const linescore = game.linescore;
	const live = code === "L";
	const final = code === "F";

	const awayLine = linescore?.teams?.away;
	const homeLine = linescore?.teams?.home;

	return {
		gamePk: game.gamePk,
		startsAt: game.gameDate,
		status: toStatus(code, game.status.detailedState, isWarmup(game.status.detailedState, game.statusFlags)),
		teams: {
			away: {
				id: game.teams.away.team.id,
				name: game.teams.away.team.name ?? "",
				shortName: game.teams.away.team.shortName ?? game.teams.away.team.name ?? "",
				abbreviation: game.teams.away.team.abbreviation ?? "",
				score: game.teams.away.score ?? awayLine?.runs ?? null,
				hits: awayLine?.hits ?? null,
				errors: awayLine?.errors ?? null,
				record: game.teams.away.leagueRecord
					? `${game.teams.away.leagueRecord.wins}-${game.teams.away.leagueRecord.losses}`
					: null,
				probablePitcher: toSchedulePlayer(game.teams.away.probablePitcher, "pitching"),
			},
			home: {
				id: game.teams.home.team.id,
				name: game.teams.home.team.name ?? "",
				shortName: game.teams.home.team.shortName ?? game.teams.home.team.name ?? "",
				abbreviation: game.teams.home.team.abbreviation ?? "",
				score: game.teams.home.score ?? homeLine?.runs ?? null,
				hits: homeLine?.hits ?? null,
				errors: homeLine?.errors ?? null,
				record: game.teams.home.leagueRecord
					? `${game.teams.home.leagueRecord.wins}-${game.teams.home.leagueRecord.losses}`
					: null,
				probablePitcher: toSchedulePlayer(game.teams.home.probablePitcher, "pitching"),
			},
		},
		venue: game.venue?.name ?? null,
		inning: toInning(linescore),
		situation: live && linescore ? toMlbSituation(linescore) : null,
		decisions: final ? toMlbDecisions(game.decisions) : null,
	};
}

function toMlbSituation(linescore: NonNullable<MlbScheduleGame["linescore"]>): ScheduleSituation {
	const offense = linescore.offense;
	const defense = linescore.defense;

	return {
		balls: countValue(linescore.balls),
		strikes: countValue(linescore.strikes),
		outs: linescore.outs ?? 0,
		bases: {
			first: occupied(offense?.first),
			second: occupied(offense?.second),
			third: occupied(offense?.third),
		},
		pitcher: toSchedulePlayer(defense?.pitcher, "pitching"),
		batter: toSchedulePlayer(offense?.batter, "hitting"),
		onDeck: toSchedulePlayer(offense?.onDeck, "hitting"),
		inHole: toSchedulePlayer(offense?.inHole, "hitting"),
	};
}

function toMlbDecisions(decisions: MlbScheduleGame["decisions"]): ScheduleDecisions {
	return {
		winner: toSchedulePlayer(decisions?.winner, "pitching"),
		loser: toSchedulePlayer(decisions?.loser, "pitching"),
		save: toSchedulePlayer(decisions?.save, "pitching"),
	};
}

export function toScheduleGameFromGumbo(feed: GumboFeed): ScheduleGame {
	const code = feed.gameData.status.abstractGameCode;
	const linescore = feed.liveData.linescore;
	const live = code === "L";
	const final = code === "F";

	return {
		gamePk: feed.gamePk,
		startsAt: feed.gameData.datetime.dateTime,
		status: toStatus(code, feed.gameData.status.detailedState, isWarmup(feed.gameData.status.detailedState)),
		teams: {
			away: toGumboTeam(feed, "away"),
			home: toGumboTeam(feed, "home"),
		},
		venue: feed.gameData.venue.name,
		inning: toInning(linescore),
		situation: live ? toGumboSituation(feed) : null,
		decisions: final ? toGumboDecisions(feed) : null,
	};
}

function toGumboTeam(feed: GumboFeed, side: "home" | "away"): ScheduleTeam {
	const team = feed.gameData.teams[side];
	const line = feed.liveData.linescore.teams[side];
	const probable = feed.gameData.probablePitchers?.[side];
	const record = team.record?.leagueRecord;

	return {
		id: team.id,
		name: team.name,
		shortName: team.shortName,
		abbreviation: team.abbreviation,
		score: line.runs ?? null,
		hits: line.hits ?? null,
		errors: line.errors ?? null,
		record: record ? `${record.wins}-${record.losses}` : null,
		probablePitcher: toGumboPlayer(feed, probable, "pitching"),
	};
}

function toGumboSituation(feed: GumboFeed): ScheduleSituation {
	const linescore = feed.liveData.linescore;
	const offense = linescore.offense;
	const defense = linescore.defense;

	return {
		balls: countValue(linescore.balls),
		strikes: countValue(linescore.strikes),
		outs: linescore.outs ?? 0,
		bases: {
			first: occupied(offense?.first),
			second: occupied(offense?.second),
			third: occupied(offense?.third),
		},
		pitcher: toGumboPlayer(feed, defense?.pitcher, "pitching"),
		batter: toGumboPlayer(feed, offense?.batter, "hitting"),
		onDeck: toGumboPlayer(feed, offense?.onDeck, "hitting"),
		inHole: toGumboPlayer(feed, offense?.inHole, "hitting"),
	};
}

function toGumboDecisions(feed: GumboFeed): ScheduleDecisions {
	const decisions = feed.liveData.decisions;

	return {
		winner: toGumboPlayer(feed, decisions?.winner, "pitching"),
		loser: toGumboPlayer(feed, decisions?.loser, "pitching"),
		save: toGumboPlayer(feed, decisions?.save, "pitching"),
	};
}
