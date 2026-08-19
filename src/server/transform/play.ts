import type { Play } from "../mlb/schemas/gumbo.ts";
import type { SavantPitchRow } from "../mlb/schemas/savant.ts";
import type { LivePlay, PlayAction, PlaySummary } from "../../shared/models.ts";
import { getScorecardCodeFromPlay } from "./scorecard.ts";
import { toPitches } from "./pitch.ts";
import { toHalfInning } from "./state.ts";

export function toPlayActions(play: Play): PlayAction[] {
	const inning = play.about.inning;
	const halfInning = toHalfInning(play.about.halfInning) ?? "top";
	const actions: PlayAction[] = [];

	for (const eventIndex of play.actionIndex) {
		const event = play.playEvents[eventIndex];
		if (!event) continue;

		actions.push({
			atBatIndex: play.atBatIndex,
			eventIndex,
			inning,
			halfInning,
			eventType: event.details.eventType ?? null,
			event: event.details.event ?? null,
			description: event.details.description ?? event.details.event ?? event.details.eventType ?? "",
			isScoringPlay: event.details.isScoringPlay ?? false,
			isOut: event.details.isOut ?? false,
			playerId: event.player?.id ?? null,
			replacedPlayerId: event.replacedPlayer?.id ?? null,
		});
	}

	return actions;
}

export function toPlaySummary(play: Play, savantByPlayId: Map<string, SavantPitchRow>): PlaySummary {
	return {
		atBatIndex: play.atBatIndex,
		inning: play.about.inning,
		halfInning: toHalfInning(play.about.halfInning) ?? "top",
		batterId: play.matchup.batter.id,
		pitcherId: play.matchup.pitcher.id,
		eventType: play.result.eventType ?? null,
		event: play.result.event ?? null,
		description: play.result.description ?? "",
		rbi: play.result.rbi ?? 0,
		isScoringPlay: play.about.isScoringPlay ?? false,
		isOut: play.result.isOut ?? false,
		// Computed here rather than on the client so the notation logic stays
		// with the feed knowledge it depends on.
		scorecard: getScorecardCodeFromPlay(play) || null,
		scoreAfter: { home: play.result.homeScore, away: play.result.awayScore },
		pitches: toPitches(play, savantByPlayId),
		actions: toPlayActions(play),
	};
}

export function toLivePlay(
	play: Play | undefined,
	onDeckId: number | null,
	savantByPlayId: Map<string, SavantPitchRow>,
): LivePlay | null {
	if (!play) return null;

	return {
		atBatIndex: play.atBatIndex,
		inning: play.about.inning,
		halfInning: toHalfInning(play.about.halfInning) ?? "top",
		batterId: play.matchup.batter.id,
		pitcherId: play.matchup.pitcher.id,
		onDeckId,
		description: play.result.description ?? null,
		pitches: toPitches(play, savantByPlayId),
		actions: toPlayActions(play),
	};
}
