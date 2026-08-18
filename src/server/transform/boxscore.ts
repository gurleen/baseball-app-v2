import type { BoxscorePlayer, BoxscoreTeamData, GumboFeed } from "../mlb/schemas/gumbo.ts";
import type { BattingLine, PitchingLine, TeamBox } from "../../shared/models.ts";
import { parsePlayerKey } from "./players.ts";

// Row keys below match @hydra-tv/sports' BoxScore "batting" / "pitching"
// presets exactly, so a TeamBox can be handed to the component untouched.

/** MLB returns rate stats as strings ("​.315", "3.42") and sometimes omits them. */
function rate(value: string | number | undefined, fallback = "-"): string {
	if (value === undefined || value === null) return fallback;
	return String(value);
}

function count(value: number | undefined): number {
	return value ?? 0;
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
	const { spot, starter } = parseBattingOrder(entry.battingOrder);

	return {
		playerId: entry.person.id,
		name: entry.person.fullName,
		position: entry.position?.abbreviation ?? null,
		starter,
		battingOrder: spot,
		ab: count(batting.atBats),
		r: count(batting.runs),
		h: count(batting.hits),
		rbi: count(batting.rbi),
		bb: count(batting.baseOnBalls),
		so: count(batting.strikeOuts),
		lob: count(batting.leftOnBase),
		avg: rate(entry.seasonStats.batting.avg),
	};
}

function toPitchingLine(entry: BoxscorePlayer, isStarter: boolean): PitchingLine {
	const pitching = entry.stats.pitching;

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
		era: rate(entry.seasonStats.pitching.era),
	};
}

function toTeamBox(side: BoxscoreTeamData): TeamBox {
	const byId = new Map<number, BoxscorePlayer>();
	for (const [key, entry] of Object.entries(side.players)) {
		const id = parsePlayerKey(key);
		if (id !== null) byId.set(id, entry);
	}

	// `batters` and `pitchers` are already in appearance order, which is the
	// order a box score reads in — so no sorting is applied here.
	const batting = side.batters
		.map(id => byId.get(id))
		.filter((entry): entry is BoxscorePlayer => entry !== undefined)
		.map(toBattingLine);

	const [starterId] = side.pitchers;
	const pitching = side.pitchers
		.map(id => byId.get(id))
		.filter((entry): entry is BoxscorePlayer => entry !== undefined)
		.map(entry => toPitchingLine(entry, entry.person.id === starterId));

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
		},
	};
}

export function toBoxscore(feed: GumboFeed): { home: TeamBox; away: TeamBox } {
	return {
		home: toTeamBox(feed.liveData.boxscore.teams.home),
		away: toTeamBox(feed.liveData.boxscore.teams.away),
	};
}
