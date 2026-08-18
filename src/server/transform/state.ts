import type { GumboFeed } from "../mlb/schemas/gumbo.ts";
import type { GameState, GameStatusKind, HalfInning } from "../../shared/models.ts";

function toStatusKind(abstractCode: string): GameStatusKind {
	switch (abstractCode) {
		case "P":
			return "preview";
		case "L":
			return "live";
		case "F":
			return "final";
		default:
			return "other";
	}
}

export function toHalfInning(value: string | undefined): HalfInning | null {
	if (!value) return null;
	const normalized = value.toLowerCase();
	if (normalized === "top") return "top";
	if (normalized === "bottom") return "bottom";
	return null;
}

/** The linescore reports balls/strikes as strings in some feed versions. */
function toCountValue(value: string | number | undefined): number {
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

/**
 * Flattens status, inning, count and baserunners — which GUMBO spreads across
 * gameData.status, liveData.linescore and liveData.plays.currentPlay — into
 * one object.
 */
export function toGameState(feed: GumboFeed): GameState {
	const status = feed.gameData.status;
	const linescore = feed.liveData.linescore;
	const offense = linescore.offense;

	const kind = toStatusKind(status.abstractGameCode);

	return {
		kind,
		detail: status.detailedState,
		abstract: status.abstractGameState,
		inning: linescore.currentInning ?? null,
		halfInning: toHalfInning(linescore.inningHalf),
		inningState: linescore.inningState ?? null,
		outs: linescore.outs ?? 0,
		count: {
			balls: toCountValue(linescore.balls),
			strikes: toCountValue(linescore.strikes),
		},
		bases: {
			first: offense?.first !== undefined,
			second: offense?.second !== undefined,
			third: offense?.third !== undefined,
		},
		isFinal: kind === "final",
	};
}
