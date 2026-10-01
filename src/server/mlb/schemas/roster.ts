import { z } from 'zod';

// Only the fields the bullpen page reads — `/teams/{id}/roster` with
// `hydrate=person` carries far more, and zod strips the rest.
export const RosterEntry = z.object({
	person: z.object({
		id: z.number(),
		fullName: z.string(),
		pitchHand: z.object({ code: z.string() }).optional()
	}),
	jerseyNumber: z.string().optional(),
	position: z.object({
		type: z.string(),
		abbreviation: z.string()
	}),
	status: z.object({ code: z.string() }).optional()
});
export type RosterEntry = z.infer<typeof RosterEntry>;

export const RosterResponse = z.object({
	roster: z.array(RosterEntry).default([])
});
export type RosterResponse = z.infer<typeof RosterResponse>;
