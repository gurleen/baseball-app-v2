import type { PitchArsenalResponse } from "../mlb/schemas/pitchArsenal.ts";
import type { LivePlay, PitchMixEntry, PlaySummary } from "../../shared/models.ts";

/**
 * In-game pitch-type usage per pitcher. Walks completed at-bats plus the live
 * one, buckets typed pitches by code, and returns usage percentages.
 */
export function toPitchMixByPitcher(
	plays: PlaySummary[],
	currentPlay: LivePlay | null,
): Record<number, PitchMixEntry[]> {
	const byPitcher = new Map<number, Map<string, { label: string; count: number; speedSum: number; speedCount: number }>>();

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

/**
 * Full-season arsenal from Stats API. `percentage` arrives as a 0–1 fraction;
 * we store 0–100 to match the in-game mix. Empty payloads (no splits, or a
 * pitcher with no arsenal this season) become `[]`.
 */
export function toSeasonPitchMix(payload: PitchArsenalResponse): PitchMixEntry[] {
	const splits = payload.stats[0]?.splits ?? [];
	if (splits.length === 0) return [];

	return splits
		.map(split => ({
			code: split.stat.type.code,
			label: split.stat.type.description,
			count: split.stat.count,
			percent: Math.round(split.stat.percentage * 100),
			averageSpeed: split.stat.averageSpeed ?? null,
		}))
		.sort((left, right) => right.count - left.count);
}

function addPitches(
	byPitcher: Map<number, Map<string, { label: string; count: number; speedSum: number; speedCount: number }>>,
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
		const speed = pitch.velocity?.start;
		if (existing) {
			existing.count += 1;
			if (speed != null) {
				existing.speedSum += speed;
				existing.speedCount += 1;
			}
		} else {
			buckets.set(pitch.type.code, {
				label: pitch.type.name,
				count: 1,
				speedSum: speed ?? 0,
				speedCount: speed != null ? 1 : 0,
			});
		}
	}
}

function toEntries(
	buckets: Map<string, { label: string; count: number; speedSum: number; speedCount: number }>,
): PitchMixEntry[] {
	const total = [...buckets.values()].reduce((sum, bucket) => sum + bucket.count, 0);
	if (total === 0) return [];

	return [...buckets.entries()]
		.map(([code, { label, count, speedSum, speedCount }]) => ({
			code,
			label,
			count,
			percent: Math.round((count / total) * 100),
			averageSpeed: speedCount > 0 ? speedSum / speedCount : null,
		}))
		.sort((left, right) => right.count - left.count);
}
