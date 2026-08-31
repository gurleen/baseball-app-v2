import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";

export const SplitFilters = z.object({
	seasonFrom: z.number().int().optional(),
	seasonTo: z.number().int().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	inning: z.number().int().optional(),
	halfInning: z.enum(["top", "bottom"]).optional(),
	outsAfter: z.number().int().optional(),
	balls: z.number().int().optional(),
	strikes: z.number().int().optional(),
	battingClubPk: z.number().int().optional(),
	pitchingClubPk: z.number().int().optional(),
	/** "B" = switch hitter (bats from either side depending on pitcher_hand). */
	batterHand: z.enum(["L", "R", "B"]).optional(),
	pitcherHand: z.enum(["L", "R"]).optional(),
});

export type SplitFilters = z.infer<typeof SplitFilters>;

/**
 * A raw `AND ...` SQL fragment (possibly empty) over `public.plays` columns,
 * built from the given filters. `excludeClub` drops the club conditions —
 * used for the league-wide baseline population, which must span every club.
 */
export function playFilterFragment(filters: SplitFilters, opts: { excludeClub?: boolean } = {}): SQL {
	const parts: SQL[] = [];

	if (filters.seasonFrom !== undefined) parts.push(sql`season >= ${filters.seasonFrom}`);
	if (filters.seasonTo !== undefined) parts.push(sql`season <= ${filters.seasonTo}`);
	if (filters.dateFrom !== undefined) parts.push(sql`game_date >= ${filters.dateFrom}`);
	if (filters.dateTo !== undefined) parts.push(sql`game_date <= ${filters.dateTo}`);
	if (filters.inning !== undefined) parts.push(sql`inning = ${filters.inning}`);
	if (filters.halfInning !== undefined) parts.push(sql`half_inning = ${filters.halfInning}`);
	if (filters.outsAfter !== undefined) parts.push(sql`outs_after = ${filters.outsAfter}`);
	if (filters.balls !== undefined) parts.push(sql`balls = ${filters.balls}`);
	if (filters.strikes !== undefined) parts.push(sql`strikes = ${filters.strikes}`);
	if (!opts.excludeClub) {
		if (filters.battingClubPk !== undefined) parts.push(sql`batting_club_pk = ${filters.battingClubPk}`);
		if (filters.pitchingClubPk !== undefined) parts.push(sql`pitching_club_pk = ${filters.pitchingClubPk}`);
	}
	if (filters.batterHand !== undefined) parts.push(sql`batter_hand = ${filters.batterHand}`);
	if (filters.pitcherHand !== undefined) parts.push(sql`pitcher_hand = ${filters.pitcherHand}`);

	return parts.length > 0 ? sql`AND ${sql.join(parts, sql` AND `)}` : sql``;
}

/**
 * Season/date-only fragment (for `public.games`, which has no situational,
 * club, or handedness columns) — used to scope the "qualified" games-played
 * threshold to the same season/date range as the split itself.
 */
export function seasonDateFilterFragment(filters: SplitFilters): SQL {
	const parts: SQL[] = [];

	if (filters.seasonFrom !== undefined) parts.push(sql`season >= ${filters.seasonFrom}`);
	if (filters.seasonTo !== undefined) parts.push(sql`season <= ${filters.seasonTo}`);
	if (filters.dateFrom !== undefined) parts.push(sql`game_date >= ${filters.dateFrom}`);
	if (filters.dateTo !== undefined) parts.push(sql`game_date <= ${filters.dateTo}`);

	return parts.length > 0 ? sql`AND ${sql.join(parts, sql` AND `)}` : sql``;
}
