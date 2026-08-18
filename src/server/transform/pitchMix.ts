import type { LivePlay, PitchMixEntry, PlaySummary } from "../../shared/models.ts";

/**
 * In-game pitch-type usage per pitcher. Walks completed at-bats plus the live
 * one, buckets typed pitches by code, and returns usage percentages.
 */
export function toPitchMixByPitcher(
	plays: PlaySummary[],
	currentPlay: LivePlay | null,
): Record<number, PitchMixEntry[]> {
	const byPitcher = new Map<number, Map<string, { label: string; count: number }>>();

	for (const play of plays) {
		addPitches(byPitcher, play.pitcherId, play.pitches);
	}
	if (currentPlay) {
		addPitches(byPitcher, currentPlay.pitcherId, currentPlay.pitches);
	}

	const result: Record<number, PitchMixEntry[]> = {};
	for (const [pitcherId, buckets] of byPitcher) {
		const entries = toEntries(buckets);
		if (entries.length > 0) result[pitcherId] = entries;
	}
	return result;
}

function addPitches(
	byPitcher: Map<number, Map<string, { label: string; count: number }>>,
	pitcherId: number,
	pitches: PlaySummary["pitches"],
) {
	let buckets = byPitcher.get(pitcherId);
	if (!buckets) {
		buckets = new Map();
		byPitcher.set(pitcherId, buckets);
	}

	for (const pitch of pitches) {
		if (!pitch.type) continue;
		const existing = buckets.get(pitch.type.code);
		if (existing) {
			existing.count += 1;
		} else {
			buckets.set(pitch.type.code, { label: pitch.type.name, count: 1 });
		}
	}
}

function toEntries(buckets: Map<string, { label: string; count: number }>): PitchMixEntry[] {
	const total = [...buckets.values()].reduce((sum, bucket) => sum + bucket.count, 0);
	if (total === 0) return [];

	return [...buckets.entries()]
		.map(([code, { label, count }]) => ({
			code,
			label,
			count,
			percent: Math.round((count / total) * 100),
		}))
		.sort((left, right) => right.count - left.count);
}
