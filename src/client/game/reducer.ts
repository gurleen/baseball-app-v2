import type { GameEvent } from "../../shared/events.ts";
import type { GameSnapshot, Pitch } from "../../shared/models.ts";

/**
 * Applies one delta event to a snapshot, returning a new snapshot.
 *
 * This is the exact mirror of server/transform/diff.ts: for any pair of
 * server snapshots, replaying diffSnapshots(a, b) through this reducer
 * starting from `a` must reproduce `b`. That round-trip is covered by tests,
 * because a drift between the two would show up as subtly stale UI rather
 * than as an error.
 *
 * Returns null before the first `snapshot` event arrives.
 */
export function reduceGameEvent(snapshot: GameSnapshot | null, event: GameEvent): GameSnapshot | null {
	if (event.t === "snapshot") return event.snapshot;
	if (!snapshot) return null;

	switch (event.t) {
		case "pitch":
			return applyPitch(snapshot, event.pitch);

		case "pitchMetrics":
			return mapPitches(snapshot, pitch =>
				pitch.playId === event.playId ? { ...pitch, metrics: event.metrics } : pitch,
			);

		case "play": {
			// An at-bat can be re-sent after a replay review changes its result.
			const existing = snapshot.plays.findIndex(play => play.atBatIndex === event.play.atBatIndex);
			const plays =
				existing === -1
					? [...snapshot.plays, event.play]
					: snapshot.plays.map((play, index) => (index === existing ? event.play : play));

			return { ...snapshot, plays: plays.sort((a, b) => a.atBatIndex - b.atBatIndex) };
		}

		case "currentPlay":
			return { ...snapshot, currentPlay: event.currentPlay };

		case "state":
			return { ...snapshot, state: event.state };

		case "linescore":
			return { ...snapshot, linescore: event.linescore };

		case "boxscore":
			return { ...snapshot, boxscore: event.boxscore };

		case "heartbeat":
			return snapshot;
	}
}

/**
 * A pitch belongs to the at-bat in progress unless its atBatIndex matches a
 * completed play — which happens when the final pitch of an at-bat and the
 * play's completion arrive in the same tick.
 */
function applyPitch(snapshot: GameSnapshot, pitch: Pitch): GameSnapshot {
	const playIndex = snapshot.plays.findIndex(play => play.atBatIndex === pitch.atBatIndex);

	if (playIndex !== -1) {
		return {
			...snapshot,
			plays: snapshot.plays.map((play, index) =>
				index === playIndex ? { ...play, pitches: upsertPitch(play.pitches, pitch) } : play,
			),
		};
	}

	if (snapshot.currentPlay?.atBatIndex === pitch.atBatIndex) {
		return {
			...snapshot,
			currentPlay: { ...snapshot.currentPlay, pitches: upsertPitch(snapshot.currentPlay.pitches, pitch) },
		};
	}

	// A pitch for an at-bat we haven't been told about yet; the `currentPlay`
	// event in the same batch will carry it.
	return snapshot;
}

function upsertPitch(pitches: Pitch[], pitch: Pitch): Pitch[] {
	const index = pitches.findIndex(existing => existing.playId === pitch.playId);
	if (index === -1) return [...pitches, pitch];
	return pitches.map((existing, at) => (at === index ? pitch : existing));
}

function mapPitches(snapshot: GameSnapshot, fn: (pitch: Pitch) => Pitch): GameSnapshot {
	return {
		...snapshot,
		plays: snapshot.plays.map(play => ({ ...play, pitches: play.pitches.map(fn) })),
		currentPlay: snapshot.currentPlay
			? { ...snapshot.currentPlay, pitches: snapshot.currentPlay.pitches.map(fn) }
			: null,
	};
}

export function reduceGameEvents(snapshot: GameSnapshot | null, events: GameEvent[]): GameSnapshot | null {
	return events.reduce(reduceGameEvent, snapshot);
}
