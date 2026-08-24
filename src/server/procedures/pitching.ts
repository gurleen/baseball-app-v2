import { os } from "@orpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/client.ts";
import { clubsHistory, people, pitchingStatsSeason, plays } from "../db/schema.ts";

const LeadersInput = z.object({
	season: z.number().int(),
	qualifiedOnly: z.boolean().optional(),
});

export interface PitchingLeader {
	pitcherPk: number;
	name: string;
	/** Club abbreviation, or "NTM" (e.g. "2TM") when traded mid-season. */
	club: string | null;
	pa: number;
	ip: number | null;
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
	era: number | null;
	whip: number | null;
	k9: number | null;
	bb9: number | null;
	hr9: number | null;
	babip: number | null;
	fip: number | null;
	lobPct: number | null;
	qualified: boolean;
}

function toNumber(value: string | number | null): number | null {
	if (value === null) return null;
	return typeof value === "number" ? value : Number.parseFloat(value);
}

export const pitchingRouter = {
	/** Seasons with pitching data, newest first — populates the year picker. */
	seasons: os.handler(async (): Promise<number[]> => {
		const rows = await db
			.selectDistinct({ season: pitchingStatsSeason.season })
			.from(pitchingStatsSeason)
			.orderBy(desc(pitchingStatsSeason.season));

		return rows.map(row => row.season!);
	}),

	leaders: os.input(LeadersInput).handler(async ({ input }): Promise<PitchingLeader[]> => {
		// Club(s) for a player-season aren't on pitchingStatsSeason (it's keyed
		// only by pitcherPk/season), so they're derived from the play-by-play:
		// distinct pitching_club_pk per pitcher. A single club resolves to its
		// abbreviation; more than one collapses to "NTM" (e.g. "2TM"), matching
		// the standard "traded player" convention.
		const clubCounts = db.$with("club_counts").as(
			db
				.select({
					pitcherPk: plays.pitcherPk,
					clubCount: sql<number>`count(distinct ${plays.pitchingClubPk})::int`.as("club_count"),
					singleClubPk: sql<number>`min(${plays.pitchingClubPk})::int`.as("single_club_pk"),
				})
				.from(plays)
				.where(eq(plays.season, input.season))
				.groupBy(plays.pitcherPk),
		);

		const rows = await db
			.with(clubCounts)
			.select({
				pitcherPk: pitchingStatsSeason.pitcherPk,
				firstName: people.firstName,
				lastName: people.lastName,
				clubCount: clubCounts.clubCount,
				clubAbbreviation: clubsHistory.abbreviation,
				pa: pitchingStatsSeason.pa,
				ip: pitchingStatsSeason.ip,
				outs: pitchingStatsSeason.outs,
				h: pitchingStatsSeason.h,
				singles: pitchingStatsSeason.singles,
				doubles: pitchingStatsSeason.doubles,
				triples: pitchingStatsSeason.triples,
				homeRuns: pitchingStatsSeason.homeRuns,
				bb: pitchingStatsSeason.bb,
				ibb: pitchingStatsSeason.ibb,
				hbp: pitchingStatsSeason.hbp,
				so: pitchingStatsSeason.so,
				sf: pitchingStatsSeason.sf,
				sh: pitchingStatsSeason.sh,
				runs: pitchingStatsSeason.runs,
				earnedRuns: pitchingStatsSeason.earnedRuns,
				era: pitchingStatsSeason.era,
				whip: pitchingStatsSeason.whip,
				k9: pitchingStatsSeason.k9,
				bb9: pitchingStatsSeason.bb9,
				hr9: pitchingStatsSeason.hr9,
				babip: pitchingStatsSeason.babip,
				fip: pitchingStatsSeason.fip,
				lobPct: pitchingStatsSeason.lobPct,
				qualified: pitchingStatsSeason.qualified,
			})
			.from(pitchingStatsSeason)
			.innerJoin(people, eq(people.pk, pitchingStatsSeason.pitcherPk))
			.leftJoin(clubCounts, eq(clubCounts.pitcherPk, pitchingStatsSeason.pitcherPk))
			.leftJoin(
				clubsHistory,
				and(eq(clubsHistory.clubPk, clubCounts.singleClubPk), eq(clubsHistory.season, pitchingStatsSeason.season)),
			)
			.where(
				and(
					eq(pitchingStatsSeason.season, input.season),
					input.qualifiedOnly ? eq(pitchingStatsSeason.qualified, true) : undefined,
				),
			)
			.orderBy(desc(pitchingStatsSeason.ip));

		return rows.map(row => ({
			pitcherPk: row.pitcherPk!,
			name: `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
			club: row.clubCount == null || row.clubCount === 0 ? null : row.clubCount === 1 ? row.clubAbbreviation : `${row.clubCount}TM`,
			pa: row.pa ?? 0,
			ip: toNumber(row.ip),
			outs: row.outs ?? 0,
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
			runs: row.runs ?? 0,
			earnedRuns: row.earnedRuns ?? 0,
			era: toNumber(row.era),
			whip: toNumber(row.whip),
			k9: toNumber(row.k9),
			bb9: toNumber(row.bb9),
			hr9: toNumber(row.hr9),
			babip: toNumber(row.babip),
			fip: toNumber(row.fip),
			lobPct: toNumber(row.lobPct),
			qualified: row.qualified ?? false,
		}));
	}),
};
