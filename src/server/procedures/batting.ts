import { os } from "@orpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/client.ts";
import { battingStatsSeason, clubsHistory, people, plays } from "../db/schema.ts";
import { battingSplits, type BattingSplitRow } from "../stats/batting-splits.ts";
import { listClubs, type ClubOption } from "../stats/clubs.ts";
import { SplitFilters } from "../stats/split-filters.ts";

const LeadersInput = z.object({
	season: z.number().int(),
	qualifiedOnly: z.boolean().optional(),
});

export interface BattingLeader {
	batterPk: number;
	name: string;
	/** Club abbreviation, or "NTM" (e.g. "2TM") when traded mid-season. */
	club: string | null;
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
	avg: number | null;
	obp: number | null;
	slg: number | null;
	ops: number | null;
	bbPct: number | null;
	kPct: number | null;
	bbK: number | null;
	iso: number | null;
	babip: number | null;
	woba: number | null;
	wrcPlus: number | null;
	qualified: boolean;
}

function toNumber(value: string | number | null): number | null {
	if (value === null) return null;
	return typeof value === "number" ? value : Number.parseFloat(value);
}

export const battingRouter = {
	/** Seasons with batting data, newest first — populates the year picker. */
	seasons: os.handler(async (): Promise<number[]> => {
		const rows = await db
			.selectDistinct({ season: battingStatsSeason.season })
			.from(battingStatsSeason)
			.orderBy(desc(battingStatsSeason.season));

		return rows.map(row => row.season!);
	}),

	/** Clubs for the split filter's club dropdown. */
	clubs: os.handler(async (): Promise<ClubOption[]> => listClubs()),

	leaders: os.input(LeadersInput).handler(async ({ input }): Promise<BattingLeader[]> => {
		// Club(s) for a player-season aren't on battingStatsSeason (it's keyed
		// only by batterPk/season), so they're derived from the play-by-play:
		// distinct batting_club_pk per batter. A single club resolves to its
		// abbreviation; more than one collapses to "NTM" (e.g. "2TM"), matching
		// the standard "traded player" convention.
		const clubCounts = db.$with("club_counts").as(
			db
				.select({
					batterPk: plays.batterPk,
					clubCount: sql<number>`count(distinct ${plays.battingClubPk})::int`.as("club_count"),
					singleClubPk: sql<number>`min(${plays.battingClubPk})::int`.as("single_club_pk"),
				})
				.from(plays)
				.where(eq(plays.season, input.season))
				.groupBy(plays.batterPk),
		);

		const rows = await db
			.with(clubCounts)
			.select({
				batterPk: battingStatsSeason.batterPk,
				firstName: people.firstName,
				lastName: people.lastName,
				clubCount: clubCounts.clubCount,
				clubAbbreviation: clubsHistory.abbreviation,
				pa: battingStatsSeason.pa,
				ab: battingStatsSeason.ab,
				h: battingStatsSeason.h,
				singles: battingStatsSeason.singles,
				doubles: battingStatsSeason.doubles,
				triples: battingStatsSeason.triples,
				homeRuns: battingStatsSeason.homeRuns,
				bb: battingStatsSeason.bb,
				ibb: battingStatsSeason.ibb,
				hbp: battingStatsSeason.hbp,
				so: battingStatsSeason.so,
				sf: battingStatsSeason.sf,
				sh: battingStatsSeason.sh,
				tb: battingStatsSeason.tb,
				avg: battingStatsSeason.avg,
				obp: battingStatsSeason.obp,
				slg: battingStatsSeason.slg,
				ops: battingStatsSeason.ops,
				bbPct: battingStatsSeason.bbPct,
				kPct: battingStatsSeason.kPct,
				bbK: battingStatsSeason.bbK,
				iso: battingStatsSeason.iso,
				babip: battingStatsSeason.babip,
				woba: battingStatsSeason.woba,
				wrcPlus: battingStatsSeason.wrcPlus,
				qualified: battingStatsSeason.qualified,
			})
			.from(battingStatsSeason)
			.innerJoin(people, eq(people.pk, battingStatsSeason.batterPk))
			.leftJoin(clubCounts, eq(clubCounts.batterPk, battingStatsSeason.batterPk))
			.leftJoin(
				clubsHistory,
				and(eq(clubsHistory.clubPk, clubCounts.singleClubPk), eq(clubsHistory.season, battingStatsSeason.season)),
			)
			.where(
				and(
					eq(battingStatsSeason.season, input.season),
					input.qualifiedOnly ? eq(battingStatsSeason.qualified, true) : undefined,
				),
			)
			.orderBy(desc(battingStatsSeason.pa));

		return rows.map(row => ({
			batterPk: row.batterPk!,
			name: `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
			club: row.clubCount == null || row.clubCount === 0 ? null : row.clubCount === 1 ? row.clubAbbreviation : `${row.clubCount}TM`,
			pa: row.pa ?? 0,
			ab: row.ab ?? 0,
			h: row.h ?? 0,
			singles: row.singles ?? 0,
			doubles: row.doubles ?? 0,
			triples: row.triples ?? 0,
			homeRuns: row.homeRuns ?? 0,
			bb: row.bb ?? 0,
			ibb: row.ibb ?? 0,
			hbp: row.hbp ?? 0,
			so: row.so ?? 0,
			sf: row.sf ?? 0,
			sh: row.sh ?? 0,
			tb: row.tb ?? 0,
			avg: toNumber(row.avg),
			obp: toNumber(row.obp),
			slg: toNumber(row.slg),
			ops: toNumber(row.ops),
			bbPct: toNumber(row.bbPct),
			kPct: toNumber(row.kPct),
			bbK: toNumber(row.bbK),
			iso: toNumber(row.iso),
			babip: toNumber(row.babip),
			woba: toNumber(row.woba),
			wrcPlus: row.wrcPlus,
			qualified: row.qualified ?? false,
		}));
	}),

	/**
	 * Custom stat split over an arbitrary `plays` filter (date range, season
	 * range, situational, club, handedness) — see `stats/batting-splits.ts`.
	 * `qualified` is the 3.1-PA-per-team-game convention scoped to the
	 * split's own season/date range, not a fixed season-long threshold.
	 */
	splits: os.input(SplitFilters.extend({ qualifiedOnly: z.boolean().optional() })).handler(async ({ input }): Promise<Omit<BattingLeader, "club">[]> => {
		const rows = await battingSplits(input);
		if (rows.length === 0) return [];

		const batterPks = rows.map(row => row.batterPk);
		const peopleRows = await db
			.select({ pk: people.pk, firstName: people.firstName, lastName: people.lastName })
			.from(people)
			.where(inArray(people.pk, batterPks));
		const namesByPk = new Map(peopleRows.map(p => [p.pk, `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()]));

		const filteredRows = input.qualifiedOnly ? rows.filter(row => row.qualified) : rows;

		return filteredRows.map((row: BattingSplitRow) => ({
			batterPk: row.batterPk,
			name: namesByPk.get(row.batterPk) ?? "",
			pa: row.pa,
			ab: row.ab,
			h: row.h,
			singles: row.singles,
			doubles: row.doubles,
			triples: row.triples,
			homeRuns: row.homeRuns,
			bb: row.bb,
			ibb: row.ibb,
			hbp: row.hbp,
			so: row.so,
			sf: row.sf,
			sh: row.sh,
			tb: row.tb,
			avg: toNumber(row.avg),
			obp: toNumber(row.obp),
			slg: toNumber(row.slg),
			ops: toNumber(row.ops),
			bbPct: toNumber(row.bbPct),
			kPct: toNumber(row.kPct),
			bbK: toNumber(row.bbK),
			iso: toNumber(row.iso),
			babip: toNumber(row.babip),
			woba: toNumber(row.woba),
			wrcPlus: row.wrcPlus,
			qualified: row.qualified,
		}));
	}),
};
