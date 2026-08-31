import { sql } from "drizzle-orm";

import { db } from "../db/client.ts";
import { playFilterFragment, seasonDateFilterFragment, type SplitFilters } from "./split-filters.ts";

export interface BattingSplitRow {
	batterPk: number;
	pa: number;
	ab: number;
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
	tb: number;
	avg: string | null;
	obp: string | null;
	slg: string | null;
	ops: string | null;
	bbPct: string | null;
	kPct: string | null;
	bbK: string | null;
	iso: string | null;
	babip: string | null;
	woba: string | null;
	wrcPlus: number | null;
	qualified: boolean;
}

/**
 * Generalized version of `batting_stats_season.sql` (baseball-etl) — same
 * counting/rate-stat logic and the same `public.*` SQL functions, but over
 * an arbitrary `plays` filter instead of a fixed (batter, season) grain.
 *
 * wRC+'s league-average wOBA/R-PA, park factor, and even the batter's own
 * wOBA weight constants (`woba_weights` varies slightly by season) are all
 * recomputed as PA-weighted averages across the filtered plays, since a
 * split can span multiple seasons/clubs/leagues where the reference model
 * only ever had one "primary club" and one season to key off of.
 */
export async function battingSplits(filters: SplitFilters): Promise<BattingSplitRow[]> {
	const playFilter = playFilterFragment(filters);
	const leagueFilter = playFilterFragment(filters, { excludeClub: true });
	const seasonDateFilter = seasonDateFilterFragment(filters);

	const query = sql`
		WITH filtered_plays AS (
			SELECT * FROM public.plays
			WHERE batter_pk IS NOT NULL
			${playFilter}
		),
		league_plays AS (
			SELECT * FROM public.plays
			WHERE batter_pk IS NOT NULL
			${leagueFilter}
		),
		counts AS (
			SELECT
				batter_pk,
				COUNT(*)::INTEGER AS pa,
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
			GROUP BY batter_pk
		),
		totals AS (
			SELECT
				batter_pk,
				pa,
				(singles + doubles + triples + home_runs) AS h,
				singles, doubles, triples, home_runs,
				bb, ibb, (bb + ibb) AS bb_total, hbp, so, sf, sh,
				(singles + 2 * doubles + 3 * triples + 4 * home_runs) AS tb,
				(pa - (bb + ibb + hbp + sf + sh + ci)) AS ab
			FROM counts
		),
		league_batting AS (
			SELECT
				ch.league_pk,
				pl.season,
				COUNT(*)::INTEGER AS pa,
				COUNT(*) FILTER (WHERE pl.is_walk)::INTEGER AS bb,
				COUNT(*) FILTER (WHERE pl.is_intentional_walk)::INTEGER AS ibb,
				COUNT(*) FILTER (WHERE pl.is_hit_by_pitch)::INTEGER AS hbp,
				COUNT(*) FILTER (WHERE pl.is_single)::INTEGER AS singles,
				COUNT(*) FILTER (WHERE pl.is_double)::INTEGER AS doubles,
				COUNT(*) FILTER (WHERE pl.is_triple)::INTEGER AS triples,
				COUNT(*) FILTER (WHERE pl.is_home_run)::INTEGER AS home_runs,
				COUNT(*) FILTER (WHERE pl.is_sacrifice_fly)::INTEGER AS sf,
				COUNT(*) FILTER (WHERE pl.is_sacrifice_bunt)::INTEGER AS sh,
				COUNT(*) FILTER (WHERE pl.is_catcher_interference)::INTEGER AS ci
			FROM league_plays AS pl
			JOIN public.clubs_history AS ch
				ON ch.club_pk = pl.batting_club_pk AND ch.season = pl.season
			GROUP BY ch.league_pk, pl.season
		),
		league_runs AS (
			SELECT league_pk, season, SUM(runs)::INTEGER AS runs
			FROM (
				SELECT ch.league_pk, g.season, g.home_score AS runs
				FROM public.games AS g
				JOIN public.clubs_history AS ch
					ON ch.club_pk = g.home_club_pk AND ch.season = g.season
				WHERE g.game_type = 'R' AND g.abstract_game_state = 'Final'
				UNION ALL
				SELECT ch.league_pk, g.season, g.away_score AS runs
				FROM public.games AS g
				JOIN public.clubs_history AS ch
					ON ch.club_pk = g.away_club_pk AND ch.season = g.season
				WHERE g.game_type = 'R' AND g.abstract_game_state = 'Final'
			) AS runs_by_team_league
			GROUP BY league_pk, season
		),
		league_rates AS (
			SELECT
				lb.league_pk,
				lb.season,
				public.woba(
					lb.bb, lb.hbp, lb.singles, lb.doubles, lb.triples, lb.home_runs,
					(lb.pa - (lb.bb + lb.ibb + lb.hbp + lb.sf + lb.sh + lb.ci)), lb.sf,
					ww.wbb, ww.whbp, ww.w1b, ww.w2b, ww.w3b, ww.whr
				) AS lg_woba,
				lr.runs::NUMERIC / NULLIF(lb.pa, 0) AS lg_r_pa
			FROM league_batting AS lb
			JOIN league_runs AS lr
				ON lr.league_pk = lb.league_pk AND lr.season = lb.season
			LEFT JOIN public.woba_weights AS ww
				ON ww.pk = lb.season
		),
		-- Per-play league/park/weight context, so a split spanning multiple
		-- clubs, leagues, or seasons gets a PA-weighted average rather than
		-- picking one "primary" club/season the way the season model does.
		play_context AS (
			SELECT
				fp.batter_pk,
				lgr.lg_woba,
				lgr.lg_r_pa,
				pf.basic_5yr AS park_factor,
				ww.woba_scale,
				ww.wbb, ww.whbp, ww.w1b, ww.w2b, ww.w3b, ww.whr
			FROM filtered_plays AS fp
			LEFT JOIN public.clubs_history AS ch
				ON ch.club_pk = fp.batting_club_pk AND ch.season = fp.season
			LEFT JOIN league_rates AS lgr
				ON lgr.league_pk = ch.league_pk AND lgr.season = fp.season
			-- Prior-season park factors, same convention as batting_stats_season.sql.
			LEFT JOIN public.park_factors AS pf
				ON pf.club_pk = fp.batting_club_pk AND pf.season = fp.season - 1
			LEFT JOIN public.woba_weights AS ww
				ON ww.pk = fp.season
		),
		weighted_context AS (
			SELECT
				batter_pk,
				AVG(lg_woba) AS lg_woba,
				AVG(lg_r_pa) AS lg_r_pa,
				AVG(park_factor) AS park_factor,
				AVG(woba_scale) AS woba_scale,
				AVG(wbb) AS wbb, AVG(whbp) AS whbp,
				AVG(w1b) AS w1b, AVG(w2b) AS w2b, AVG(w3b) AS w3b, AVG(whr) AS whr
			FROM play_context
			GROUP BY batter_pk
		),
		-- "Qualified" (3.1 PA per team game, same convention as
		-- batting_stats_season.sql) generalized to the split's own
		-- season/date range: team games played is scoped to that range
		-- (not the whole season) so a narrow date-range split isn't held
		-- to a full-season schedule length.
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
			SELECT fp.batter_pk, MAX(cgp.games_played) AS games_played
			FROM (SELECT DISTINCT batter_pk, batting_club_pk FROM filtered_plays) AS fp
			JOIN club_games_played AS cgp ON cgp.club_pk = fp.batting_club_pk
			GROUP BY fp.batter_pk
		)
		SELECT
			totals.batter_pk::INTEGER AS "batterPk",
			pa, ab, h, singles, doubles, triples,
			home_runs AS "homeRuns",
			bb, ibb, hbp, so, sf, sh, tb,
			public.batting_avg(h, ab) AS avg,
			public.on_base_pct(h, bb_total, hbp, ab, sf) AS obp,
			public.slugging_pct(tb, ab) AS slg,
			public.ops(h, bb_total, hbp, ab, sf, tb) AS ops,
			public.bb_pct(bb_total, pa) AS "bbPct",
			public.k_pct(so, pa) AS "kPct",
			public.bb_k_ratio(bb_total, so) AS "bbK",
			public.iso(h, tb, ab) AS iso,
			public.babip(h, home_runs, ab, so, sf) AS babip,
			public.woba(bb, hbp, singles, doubles, triples, home_runs, ab, sf, wc.wbb, wc.whbp, wc.w1b, wc.w2b, wc.w3b, wc.whr) AS woba,
			public.wrc_plus(
				public.woba(bb, hbp, singles, doubles, triples, home_runs, ab, sf, wc.wbb, wc.whbp, wc.w1b, wc.w2b, wc.w3b, wc.whr),
				wc.lg_woba, wc.woba_scale, wc.lg_r_pa, wc.park_factor
			) AS "wrcPlus",
			COALESCE(pa >= ROUND(3.1 * pgp.games_played), FALSE) AS qualified
		FROM totals
		LEFT JOIN weighted_context AS wc ON wc.batter_pk = totals.batter_pk
		LEFT JOIN player_games_played AS pgp ON pgp.batter_pk = totals.batter_pk
		ORDER BY pa DESC
	`;

	// bun-sql's PgQueryResultHKT resolves execute() to the row array directly
	// (unlike node-postgres's `{ rows: [...] }` wrapper).
	const rows = await db.execute(query);
	return rows as unknown as BattingSplitRow[];
}
