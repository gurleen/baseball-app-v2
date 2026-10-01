import { os } from '@orpc/server';
import { and, desc, eq, inArray, max } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/client.ts';
import {
	bullpenAvailability,
	bullpenUsageClub,
	bullpenUsagePitcher,
	clubsHistory,
	pitcherAppearances
} from '../db/schema.ts';
import { getActiveRoster, isPitcher } from '../mlb/roster.ts';

const ClubInput = z.object({ clubPk: z.number().int() });

export interface BullpenClub {
	clubPk: number;
	abbreviation: string;
	name: string;
}

/**
 * One active-roster pitcher. Workload fields come from `bullpen_availability`
 * and count every game type; usage fields come from `bullpen_usage_pitcher`
 * and cover regular-season relief outings only. Both are null for a pitcher
 * with no MLB appearance this season (e.g. a September call-up yet to pitch).
 */
export interface BullpenPitcher {
	pitcherPk: number;
	name: string;
	jerseyNumber: string | null;
	throws: string | null;
	role: 'reliever' | 'starter';

	lastAppearanceDate: string | null;
	lastAppearanceWasStart: boolean | null;
	lastAppearancePitches: number | null;
	lastAppearanceOuts: number | null;
	daysSinceLastAppearance: number | null;
	consecutiveDaysPitched: number | null;
	pitchesLast1Days: number | null;
	pitchesLast3Days: number | null;
	pitchesLast7Days: number | null;
	appearancesLast3Days: number | null;
	appearancesLast7Days: number | null;
	seasonStarts: number | null;
	seasonReliefAppearances: number | null;

	reliefAppearances: number | null;
	/** Baseball notation, e.g. 55.1 is 55⅓ innings. */
	reliefIp: number | null;
	outsPerAppearance: number | null;
	pitchesPerAppearance: number | null;
	multiInningPct: number | null;
	avgEntryInning: number | null;
	avgEntryLeverageIndex: number | null;
	saveSituationAppearances: number | null;
	gamesFinished: number | null;
	inheritedRunnersScoredPct: number | null;
	era: number | null;
	fip: number | null;
	whip: number | null;
	kPct: number | null;
	bbPct: number | null;
}

export interface ClubBullpen {
	season: number;
	/** Date the workload windows are measured from (today, US Eastern). */
	asOfDate: string | null;
	/** Date the roster was taken as of — the club's most recent game. */
	rosterDate: string | null;
	pitchers: BullpenPitcher[];
}

function toNumber(value: string | number | null | undefined): number | null {
	if (value === null || value === undefined) return null;
	return typeof value === 'number' ? value : Number.parseFloat(value);
}

async function latestSeason(): Promise<number | null> {
	const [row] = await db.select({ season: max(bullpenUsageClub.season) }).from(bullpenUsageClub);
	return row?.season ?? null;
}

export const bullpenRouter = {
	/** Clubs with bullpen data in the latest season, for the team picker. */
	clubs: os.handler(async (): Promise<BullpenClub[]> => {
		const season = await latestSeason();
		if (season === null) return [];

		const rows = await db
			.select({
				clubPk: bullpenUsageClub.clubPk,
				abbreviation: clubsHistory.abbreviation,
				name: clubsHistory.name
			})
			.from(bullpenUsageClub)
			.innerJoin(
				clubsHistory,
				and(
					eq(clubsHistory.clubPk, bullpenUsageClub.clubPk),
					eq(clubsHistory.season, bullpenUsageClub.season)
				)
			)
			.where(eq(bullpenUsageClub.season, season));

		return rows
			.map((row) => ({
				clubPk: row.clubPk!,
				abbreviation: row.abbreviation ?? String(row.clubPk),
				name: row.name ?? ''
			}))
			.sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
	}),

	/** Workload and usage for every pitcher on a club's active roster. */
	club: os.input(ClubInput).handler(async ({ input }): Promise<ClubBullpen> => {
		const season = await latestSeason();
		if (season === null) return { season: 0, asOfDate: null, rosterDate: null, pitchers: [] };

		const [lastGame] = await db
			.select({ gameDate: max(pitcherAppearances.gameDate) })
			.from(pitcherAppearances)
			.where(
				and(eq(pitcherAppearances.clubPk, input.clubPk), eq(pitcherAppearances.season, season))
			);
		const rosterDate = lastGame?.gameDate ?? null;

		const roster = (await getActiveRoster(input.clubPk, rosterDate ?? undefined)).filter(isPitcher);
		const pitcherPks = roster.map((entry) => entry.person.id);
		if (pitcherPks.length === 0) return { season, asOfDate: null, rosterDate, pitchers: [] };

		const [availabilityRows, usageRows] = await Promise.all([
			db.select().from(bullpenAvailability).where(inArray(bullpenAvailability.pk, pitcherPks)),
			db
				.select()
				.from(bullpenUsagePitcher)
				.where(
					and(
						inArray(bullpenUsagePitcher.pitcherPk, pitcherPks),
						eq(bullpenUsagePitcher.season, season)
					)
				)
				.orderBy(desc(bullpenUsagePitcher.reliefAppearances))
		]);

		const availabilityByPk = new Map(availabilityRows.map((row) => [row.pk, row]));
		// A pitcher traded mid-season has one usage row per club. Prefer this
		// club's; otherwise the row with the most relief outings (the query
		// orders by that, so the first row seen wins).
		const usageByPk = new Map<number, (typeof usageRows)[number]>();
		for (const row of usageRows) {
			const existing = usageByPk.get(row.pitcherPk!);
			if (!existing || (row.clubPk === input.clubPk && existing.clubPk !== input.clubPk)) {
				usageByPk.set(row.pitcherPk!, row);
			}
		}

		const pitchers = roster.map((entry): BullpenPitcher => {
			const availability = availabilityByPk.get(entry.person.id);
			const usage = usageByPk.get(entry.person.id);
			const starts = availability?.seasonStarts ?? 0;
			const reliefAppearances = availability?.seasonReliefAppearances ?? 0;

			return {
				pitcherPk: entry.person.id,
				name: entry.person.fullName,
				jerseyNumber: entry.jerseyNumber ?? null,
				throws: entry.person.pitchHand?.code ?? null,
				role: starts > reliefAppearances ? 'starter' : 'reliever',

				lastAppearanceDate: availability?.lastAppearanceDate ?? null,
				lastAppearanceWasStart: availability?.lastAppearanceWasStart ?? null,
				lastAppearancePitches: availability?.lastAppearancePitches ?? null,
				lastAppearanceOuts: availability?.lastAppearanceOuts ?? null,
				daysSinceLastAppearance: availability?.daysSinceLastAppearance ?? null,
				consecutiveDaysPitched: availability?.consecutiveDaysPitched ?? null,
				pitchesLast1Days: availability?.pitchesLast1Days ?? null,
				pitchesLast3Days: availability?.pitchesLast3Days ?? null,
				pitchesLast7Days: availability?.pitchesLast7Days ?? null,
				appearancesLast3Days: availability?.appearancesLast3Days ?? null,
				appearancesLast7Days: availability?.appearancesLast7Days ?? null,
				seasonStarts: availability?.seasonStarts ?? null,
				seasonReliefAppearances: availability?.seasonReliefAppearances ?? null,

				reliefAppearances: usage?.reliefAppearances ?? null,
				reliefIp: toNumber(usage?.ip),
				outsPerAppearance: toNumber(usage?.outsPerAppearance),
				pitchesPerAppearance: toNumber(usage?.pitchesPerAppearance),
				multiInningPct:
					usage && usage.reliefAppearances && usage.multiInningAppearances !== null
						? usage.multiInningAppearances / usage.reliefAppearances
						: null,
				avgEntryInning: toNumber(usage?.avgEntryInning),
				avgEntryLeverageIndex: toNumber(usage?.avgEntryLeverageIndex),
				saveSituationAppearances: usage?.saveSituationAppearances ?? null,
				gamesFinished: usage?.gamesFinished ?? null,
				inheritedRunnersScoredPct: toNumber(usage?.inheritedRunnersScoredPct),
				era: toNumber(usage?.era),
				fip: toNumber(usage?.fip),
				whip: toNumber(usage?.whip),
				kPct: toNumber(usage?.kPct),
				bbPct: toNumber(usage?.bbPct)
			};
		});

		return {
			season,
			asOfDate: availabilityRows[0]?.asOfDate ?? null,
			rosterDate,
			pitchers
		};
	})
};
