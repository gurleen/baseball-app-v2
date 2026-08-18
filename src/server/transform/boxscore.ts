import type { BoxscorePlayer, BoxscoreTeamData, GumboFeed } from "../mlb/schemas/gumbo.ts";
import type { BattingLine, PitchingLine, TeamBox } from "../../shared/models.ts";
import { parsePlayerKey } from "./players.ts";

// Row keys below match @hydra-tv/sports' BoxScore "batting" / "pitching"
// presets exactly, so a TeamBox can be handed to the component untouched.
// Extra season fields ride along for Preview / matchup cards and are ignored
// by the preset columns.

/** MLB returns rate stats as strings ("​.315", "3.42") and sometimes omits them. */
function rate(value: string | number | undefined, fallback = "-"): string {
	if (value === undefined || value === null) return fallback;
	return String(value);
}

function count(value: number | undefined): number {
	return value ?? 0;
}

function summary(value: string | undefined): string | null {
	return value && value.length > 0 ? value : null;
}

/**
 * GUMBO encodes batting order as "###": first digit is the lineup spot,
 * the last two are the sequence within it ("300" = starter batting 3rd,
 * "903" = fourth player used in the 9th spot).
 */
function parseBattingOrder(order: string | undefined) {
	if (!order) return { spot: null as number | null, starter: false };
	const spot = Number.parseInt(order.slice(0, order.length - 2), 10);
	const sequence = Number.parseInt(order.slice(-2), 10);
	return {
		spot: Number.isFinite(spot) ? spot : null,
		starter: sequence === 0,
	};
}

function toBattingLine(entry: BoxscorePlayer): BattingLine {
	const batting = entry.stats.batting;
	const season = entry.seasonStats.batting;
	const { spot, starter } = parseBattingOrder(entry.battingOrder);

	return {
		playerId: entry.person.id,
		name: entry.person.fullName,
		position: entry.position?.abbreviation ?? entry.allPositions?.at(-1)?.abbreviation ?? null,
		starter,
		battingOrder: spot,
		ab: count(batting.atBats),
		r: count(batting.runs),
		h: count(batting.hits),
		rbi: count(batting.rbi),
		bb: count(batting.baseOnBalls),
		so: count(batting.strikeOuts),
		lob: count(batting.leftOnBase),
		avg: rate(season.avg),
		obp: rate(season.obp),
		slg: rate(season.slg),
		ops: rate(season.ops),
		hr: count(season.homeRuns),
		seasonRbi: count(season.rbi),
		summary: summary(batting.summary),
	};
}

function toPitchingLine(entry: BoxscorePlayer, isStarter: boolean): PitchingLine {
	const pitching = entry.stats.pitching;
	const season = entry.seasonStats.pitching;

	return {
		playerId: entry.person.id,
		name: entry.person.fullName,
		starter: isStarter,
		ip: rate(pitching.inningsPitched, "0.0"),
		h: count(pitching.hits),
		r: count(pitching.runs),
		er: count(pitching.earnedRuns),
		bb: count(pitching.baseOnBalls),
		so: count(pitching.strikeOuts),
		hr: count(pitching.homeRuns),
		pitches: count(pitching.numberOfPitches ?? pitching.pitchesThrown),
		strikes: count(pitching.strikes),
		era: rate(season.era),
		wins: count(season.wins),
		losses: count(season.losses),
		whip: rate(season.whip),
		seasonSo: count(season.strikeOuts),
		seasonIp: rate(season.inningsPitched, "0.0"),
		bbPer9: rate(season.walksPer9Inn),
		summary: summary(pitching.summary),
	};
}

function lookup(byId: Map<number, BoxscorePlayer>, ids: number[]): BoxscorePlayer[] {
	const seen = new Set<number>();
	const out: BoxscorePlayer[] = [];
	for (const id of ids) {
		if (seen.has(id)) continue;
		seen.add(id);
		const entry = byId.get(id);
		if (entry) out.push(entry);
	}
	return out;
}

function toTeamBox(side: BoxscoreTeamData): TeamBox {
	const byId = new Map<number, BoxscorePlayer>();
	for (const [key, entry] of Object.entries(side.players)) {
		const id = parsePlayerKey(key);
		if (id !== null) byId.set(id, entry);
	}

	// `batters` and `pitchers` are already in appearance order, which is the
	// order a box score reads in — so no sorting is applied here.
	const batterIds = [...side.batters];
	for (const id of side.battingOrder) {
		if (!batterIds.includes(id)) batterIds.push(id);
	}
	const batting = lookup(byId, batterIds).map(toBattingLine);

	const [starterId] = side.pitchers;
	const pitching = lookup(byId, side.pitchers).map(entry => toPitchingLine(entry, entry.person.id === starterId));

	const appearedBatterIds = new Set(batting.map(line => line.playerId));
	const appearedPitcherIds = new Set(pitching.map(line => line.playerId));

	const bench = lookup(byId, side.bench)
		.filter(entry => !appearedBatterIds.has(entry.person.id))
		.map(toBattingLine);

	const bullpen = lookup(byId, side.bullpen)
		.filter(entry => !appearedPitcherIds.has(entry.person.id))
		.map(entry => toPitchingLine(entry, false));

	const teamBatting = side.teamStats.batting;
	const teamPitching = side.teamStats.pitching;

	return {
		batting,
		pitching,
		battingTotals: {
			ab: count(teamBatting.atBats),
			r: count(teamBatting.runs),
			h: count(teamBatting.hits),
			rbi: count(teamBatting.rbi),
			bb: count(teamBatting.baseOnBalls),
			so: count(teamBatting.strikeOuts),
			lob: count(teamBatting.leftOnBase),
			avg: rate(teamBatting.avg),
			obp: rate(teamBatting.obp),
			slg: rate(teamBatting.slg),
			ops: rate(teamBatting.ops),
			hr: count(teamBatting.homeRuns),
			seasonRbi: count(teamBatting.rbi),
			summary: summary(teamBatting.summary),
		},
		pitchingTotals: {
			ip: rate(teamPitching.inningsPitched, "0.0"),
			h: count(teamPitching.hits),
			r: count(teamPitching.runs),
			er: count(teamPitching.earnedRuns),
			bb: count(teamPitching.baseOnBalls),
			so: count(teamPitching.strikeOuts),
			hr: count(teamPitching.homeRuns),
			pitches: count(teamPitching.numberOfPitches ?? teamPitching.pitchesThrown),
			strikes: count(teamPitching.strikes),
			era: rate(teamPitching.era),
			wins: count(teamPitching.wins),
			losses: count(teamPitching.losses),
			whip: rate(teamPitching.whip),
			seasonSo: count(teamPitching.strikeOuts),
			seasonIp: rate(teamPitching.inningsPitched, "0.0"),
			bbPer9: rate(teamPitching.walksPer9Inn),
			summary: summary(teamPitching.summary),
		},
		battingOrder: side.battingOrder,
		bench,
		bullpen,
	};
}

export function toBoxscore(feed: GumboFeed): { home: TeamBox; away: TeamBox } {
	return {
		home: toTeamBox(feed.liveData.boxscore.teams.home),
		away: toTeamBox(feed.liveData.boxscore.teams.away),
	};
}
