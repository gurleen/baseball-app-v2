import { sql } from "drizzle-orm";

import { db } from "../db/client.ts";

export interface ClubOption {
	clubPk: number;
	abbreviation: string;
}

/** One row per club, using each club's most recent abbreviation (handles relocations/rebrands). */
export async function listClubs(): Promise<ClubOption[]> {
	const rows = await db.execute(sql`
		SELECT DISTINCT ON (club_pk) club_pk::INTEGER AS "clubPk", abbreviation
		FROM public.clubs_history
		ORDER BY club_pk, season DESC
	`);
	return (rows as unknown as ClubOption[]).sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
}
