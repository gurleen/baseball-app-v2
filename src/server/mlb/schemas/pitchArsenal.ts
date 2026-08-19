import { z } from "zod";

// ============================================================
// MLB Stats API pitch arsenal
// GET /api/v1/people/{id}/stats?stats=pitchArsenal&group=pitching&season=
//
// `percentage` is a 0–1 fraction. Unknown fields pass through; we only
// consume code, description, count and percentage.
// ============================================================

export const PitchArsenalType = z.object({
	code: z.string(),
	description: z.string(),
});

export const PitchArsenalStat = z.looseObject({
	percentage: z.number(),
	count: z.number(),
	averageSpeed: z.number().optional(),
	type: PitchArsenalType,
});

export const PitchArsenalSplit = z.looseObject({
	stat: PitchArsenalStat,
});

export const PitchArsenalStats = z.looseObject({
	splits: z.array(PitchArsenalSplit).optional(),
});

export const PitchArsenalResponse = z.object({
	stats: z.array(PitchArsenalStats),
});

export type PitchArsenalType = z.infer<typeof PitchArsenalType>;
export type PitchArsenalStat = z.infer<typeof PitchArsenalStat>;
export type PitchArsenalSplit = z.infer<typeof PitchArsenalSplit>;
export type PitchArsenalResponse = z.infer<typeof PitchArsenalResponse>;
