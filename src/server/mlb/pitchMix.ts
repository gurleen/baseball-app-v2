import { mlbClient } from "./client";
import { PitchArsenalResponse } from "./schemas/pitchArsenal";

export interface PitcherPitchArsenalQuery {
	signal?: AbortSignal;
}

/**
 * Full-season pitch-type usage for one pitcher. Fetched once per pitcher when
 * they appear in a watched game — not on the GUMBO poll cadence.
 */
export function getPitcherPitchArsenal(
	personId: number,
	season: string | number,
	query: PitcherPitchArsenalQuery = {},
) {
	return mlbClient.request({
		path: `/people/${personId}/stats`,
		params: {
			stats: "pitchArsenal",
			group: "pitching",
			season,
		},
		schema: PitchArsenalResponse,
		signal: query.signal,
	});
}
