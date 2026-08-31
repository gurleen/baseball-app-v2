import { sql } from "drizzle-orm";

import { db } from "../db/client.ts";
import { playFilterFragment, seasonDateFilterFragment, type SplitFilters } from "./split-filters.ts";

export interface PitchingSplitRow {
	pitcherPk: number;
	pa: number;
	ip: string | null;
	outs: number;
	h: number;
	singles: number;
	doubles: number;
	triples: number;
	homeRuns: number;
	bb: number;
	ibb: number;
	hbp: number;
	so: number;
	sf: number;
	sh: number;
	runs: number;
	earnedRuns: number;
	era: string | null;
	whip: string | null;
	k9: string | null;
	bb9: string | null;
	hr9: string | null;
	babip: string | null;
	fip: string | null;
	lobPct: string | null;
	qualified: boolean;
}

/**
 * Generalized version of `pitching_stats_season.sql` (baseball-etl) — same
 * counting/rate-stat logic and `public.*` SQL functions, over an arbitrary
 * `plays` filter instead of a fixed (pitcher, season) grain. Unlike batting,
 * none of these rate stats need a league/park baseline, so this is a
 * straight generalization: filter `plays`, restrict `pitcher_runs_charged`
 * to the same filtered play set via its natural key, aggregate.
 */
export async function pitchingSplits(filters: SplitFilters): Promise<PitchingSplitRow[]> {
	const playFilter = playFilterFragment(filters);
	const seasonDateFilter = seasonDateFilterFragment(filters);

	const query = sql`
		WITH filtered_plays AS (
			SELECT * FROM public.plays
			WHERE pitcher_pk IS NOT NULL
			${playFilter}
		),
		counts AS (
			SELECT
				pitcher_pk,
				COUNT(*)::INTEGER AS pa,
				SUM(outs_recorded)::INTEGER AS outs,
				COUNT(*) FILTER (WHERE is_single)::INTEGER AS singles,
				COUNT(*) FILTER (WHERE is_double)::INTEGER AS doubles,
				COUNT(*) FILTER (WHERE is_triple)::INTEGER AS triples,
				COUNT(*) FILTER (WHERE is_home_run)::INTEGER AS home_runs,
				COUNT(*) FILTER (WHERE is_walk)::INTEGER AS bb,
				COUNT(*) FILTER (WHERE is_intentional_walk)::INTEGER AS ibb,
				COUNT(*) FILTER (WHERE is_hit_by_pitch)::INTEGER AS hbp,
				COUNT(*) FILTER (WHERE is_strikeout)::INTEGER AS so,
				COUNT(*) FILTER (WHERE is_sacrifice_fly)::INTEGER AS sf,
				COUNT(*) FILTER (WHERE is_sacrifice_bunt)::INTEGER AS sh,
				COUNT(*) FILTER (WHERE is_catcher_interference)::INTEGER AS ci
			FROM filtered_plays
			GROUP BY pitcher_pk
		),
		-- pitcher_runs_charged's play_seq points at the scoring event, which is
		-- often NOT a plate appearance (wild pitch, balk, passed ball, steal) —
		-- those rows don't exist in \`plays\` at all, so joining on the exact
		-- play key would silently drop real runs. Instead, restrict to games
		-- where this pitcher recorded at least one filtered PA: exact for
		-- season/date/club/hand filters (a pitcher's hand and the games/clubs
		-- they pitched for don't vary within a game), approximate for
		-- situational filters (inning/outs/count) since a run's own inning
		-- isn't tracked on pitcher_runs_charged — a known limitation.
		runs_charged AS (
			SELECT
				prc.pitcher_pk,
				COUNT(*)::INTEGER AS runs,
				COUNT(*) FILTER (WHERE prc.is_earned)::INTEGER AS earned_runs
			FROM public.pitcher_runs_charged AS prc
			JOIN (SELECT DISTINCT source_id, game_id, pitcher_pk FROM filtered_plays) AS fp
				ON fp.source_id = prc.source_id AND fp.game_id = prc.game_id AND fp.pitcher_pk = prc.pitcher_pk
			GROUP BY prc.pitcher_pk
		),
		totals AS (
			SELECT
				counts.pitcher_pk,
				pa,
				outs,
				ROUND((outs / 3) + (outs % 3) / 10.0, 1) AS ip,
				(singles + doubles + triples + home_runs) AS h,
				singles, doubles, triples, home_runs,
				bb, ibb, (bb + ibb) AS bb_total, hbp, so, sf, sh,
				(pa - (bb + ibb + hbp + sf + sh + ci)) AS ab,
				COALESCE(rc.runs, 0) AS runs,
				COALESCE(rc.earned_runs, 0) AS earned_runs
			FROM counts
			LEFT JOIN runs_charged AS rc ON rc.pitcher_pk = counts.pitcher_pk
		),
		-- "Qualified" (1 IP per team game, same convention as
		-- pitching_stats_season.sql) generalized to the split's own
		-- season/date range: see batting-splits.ts for the same pattern.
		club_games_played AS (
			SELECT club_pk, COUNT(*)::INTEGER AS games_played
			FROM (
				SELECT home_club_pk AS club_pk, season, game_date FROM public.games
				WHERE game_type = 'R' AND abstract_game_state = 'Final' ${seasonDateFilter}
				UNION ALL
				SELECT away_club_pk AS club_pk, season, game_date FROM public.games
				WHERE game_type = 'R' AND abstract_game_state = 'Final' ${seasonDateFilter}
			) AS played
			GROUP BY club_pk
		),
		player_games_played AS (
			SELECT fp.pitcher_pk, MAX(cgp.games_played) AS games_played
			FROM (SELECT DISTINCT pitcher_pk, pitching_club_pk FROM filtered_plays) AS fp
			JOIN club_games_played AS cgp ON cgp.club_pk = fp.pitching_club_pk
			GROUP BY fp.pitcher_pk
		)
		SELECT
			totals.pitcher_pk::INTEGER AS "pitcherPk",
			pa, ip, outs, h, singles, doubles, triples,
			home_runs AS "homeRuns",
			bb, ibb, hbp, so, sf, sh, runs,
			earned_runs AS "earnedRuns",
			public.era(earned_runs, outs) AS era,
			public.whip(bb_total, h, outs) AS whip,
			public.k9(so, outs) AS k9,
			public.bb9(bb_total, outs) AS bb9,
			public.hr9(home_runs, outs) AS hr9,
			public.babip(h, home_runs, ab, so, sf) AS babip,
			-- FIP's constant is season-specific (woba_weights.c_fip); average it
			-- across the filtered plays' own seasons, same PA-weighting approach
			-- as batting-splits.ts uses for league/park context.
			public.fip(home_runs, bb_total, hbp, so, outs, fip_ctx.c_fip) AS fip,
			public.lob_pct(h, bb_total, hbp, runs, home_runs) AS "lobPct",
			COALESCE(outs >= pgp.games_played * 3, FALSE) AS qualified
		FROM totals
		LEFT JOIN (
			SELECT fp.pitcher_pk, AVG(ww.c_fip) AS c_fip
			FROM filtered_plays AS fp
			LEFT JOIN public.woba_weights AS ww ON ww.pk = fp.season
			GROUP BY fp.pitcher_pk
		) AS fip_ctx ON fip_ctx.pitcher_pk = totals.pitcher_pk
		LEFT JOIN player_games_played AS pgp ON pgp.pitcher_pk = totals.pitcher_pk
		ORDER BY ip DESC
	`;

	const rows = await db.execute(query);
	return rows as unknown as PitchingSplitRow[];
}
