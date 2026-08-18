import type { GameEvent } from "../../shared/events.ts";
import type { GameSnapshot, Pitch } from "../../shared/models.ts";

/**
 * Produces the delta events that carry `previous` forward to `next`.
 *
 * Diffing two domain snapshots — rather than interpreting MLB's raw JSON-Patch
 * ops — keeps this logic in our own vocabulary and independent of how MLB
 * happens to structure its document. The client's reducer is the exact mirror
 * of this function; the round-trip is covered by tests.
 */
export function diffSnapshots(previous: GameSnapshot | null, next: GameSnapshot): GameEvent[] {
	if (!previous) return [{ t: "snapshot", snapshot: next }];

	const events: GameEvent[] = [];

	// Pitches first: they are the events a viewer is actually waiting on.
	const seen = collectPitches(previous);
	for (const pitch of iteratePitches(next)) {
		const before = seen.get(pitch.playId);

		if (!before) {
			events.push({ t: "pitch", pitch });
			continue;
		}

		// Statcast metrics land seconds after the pitch itself, so a pitch we
		// already sent can still gain metrics later.
		if (!before.metrics && pitch.metrics) {
			events.push({ t: "pitchMetrics", playId: pitch.playId, metrics: pitch.metrics });
		}
	}

	if (!shallowEqual(previous.pitchMixByPitcher, next.pitchMixByPitcher)) {
		events.push({ t: "pitchMix", pitchMixByPitcher: next.pitchMixByPitcher });
	}

	// Completed at-bats.
	const previousPlays = new Set(previous.plays.map(play => play.atBatIndex));
	for (const play of next.plays) {
		if (!previousPlays.has(play.atBatIndex)) events.push({ t: "play", play });
	}

	if (!shallowEqual(previous.currentPlay, next.currentPlay)) {
		events.push({ t: "currentPlay", currentPlay: next.currentPlay });
	}
	if (!shallowEqual(previous.state, next.state)) {
		events.push({ t: "state", state: next.state });
	}
	if (!shallowEqual(previous.linescore, next.linescore)) {
		events.push({ t: "linescore", linescore: next.linescore });
	}
	if (!shallowEqual(previous.boxscore, next.boxscore)) {
		events.push({ t: "boxscore", boxscore: next.boxscore });
	}
	if (!shallowEqual(previous.abs, next.abs)) {
		events.push({ t: "abs", abs: next.abs });
	}
	if (!shallowEqual(previous.decisions, next.decisions)) {
		events.push({ t: "decisions", decisions: next.decisions });
	}
	if (!shallowEqual(previous.gameInfo, next.gameInfo)) {
		events.push({ t: "gameInfo", gameInfo: next.gameInfo });
	}

	return events;
}

/** Every pitch in a snapshot — completed at-bats plus the one in progress. */
export function* iteratePitches(snapshot: GameSnapshot): Generator<Pitch> {
	for (const play of snapshot.plays) {
		for (const pitch of play.pitches) yield pitch;
	}
	for (const pitch of snapshot.currentPlay?.pitches ?? []) yield pitch;
}

function collectPitches(snapshot: GameSnapshot): Map<string, Pitch> {
	const byPlayId = new Map<string, Pitch>();
	for (const pitch of iteratePitches(snapshot)) byPlayId.set(pitch.playId, pitch);
	return byPlayId;
}

/**
 * Structural equality by JSON shape. These objects are small, plain and
 * built fresh each tick, so this is both correct and cheap enough at the
 * 2s poll interval — and it avoids hand-maintaining a comparator per model.
 */
function shallowEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	return JSON.stringify(a) === JSON.stringify(b);
}
