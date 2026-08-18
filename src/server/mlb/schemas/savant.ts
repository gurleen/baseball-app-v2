import { z } from "zod";

// ============================================================
// Baseball Savant game feed (https://baseballsavant.mlb.com/gf?game_pk=)
//
// This feed is ~3MB of loosely-typed JSON and MLB changes it without notice,
// so every object here is loose: unknown fields pass through untouched and
// only the handful of fields we actually consume are described. The one field
// we genuinely depend on is `play_id`, the Statcast GUID that also appears on
// GUMBO's playEvent.playId — that is what lets the two feeds be joined.
//
// Batted-ball metrics arrive as *strings* ("85.9", ".010", "312") while pitch
// tracking arrives as numbers, hence `numeric()` below.
// ============================================================

/** Accepts a number, a numeric string, null or undefined; yields number | null. */
const numeric = z
	.union([z.number(), z.string(), z.null()])
	.optional()
	.transform(value => {
		if (value === null || value === undefined || value === "") return null;
		const parsed = typeof value === "number" ? value : Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : null;
	});

/** Savant encodes booleans as 0/1 ints in some fields and real booleans in others. */
const boolish = z
	.union([z.boolean(), z.number(), z.string(), z.null()])
	.optional()
	.transform(value => {
		if (value === null || value === undefined || value === "") return null;
		if (typeof value === "boolean") return value;
		if (typeof value === "number") return value !== 0;
		return value === "Y" || value === "true" || value === "1";
	});

/**
 * One pitch as Savant sees it. Rows in `team_home`/`team_away` are pitches;
 * rows in `exit_velocity` are the subset that were put in play, carrying the
 * extra batted-ball fields.
 */
export const SavantPitchRow = z.looseObject({
	/**
	 * Statcast GUID. Absent on `type: "no_pitch"` rows — automatic strikes and
	 * balls from replay-review outcomes and pitch-timer violations, where no
	 * pitch was thrown and so there is nothing in GUMBO to join to. Rows
	 * without one are dropped by {@link indexSavantPitches}.
	 */
	play_id: z.string().nullish(),
	/** "pitch" | "no_pitch" | ... */
	type: z.string().optional(),

	// Identity / sequencing — used to order and to fall back on when play_id is absent.
	inning: z.number().optional(),
	half_inning: z.string().optional(),
	ab_number: z.number().optional(),
	pitch_number: z.number().optional(),
	batter: z.number().optional(),
	pitcher: z.number().optional(),

	// Pitch tracking. Present for tracked pitches; absent for e.g. automatic balls.
	pitch_type: z.string().nullish(),
	pitch_name: z.string().nullish(),
	start_speed: numeric,
	end_speed: numeric,
	spin_rate: numeric,
	extension: numeric,
	sz_top: numeric,
	sz_bot: numeric,
	zone: numeric,
	px: numeric,
	pz: numeric,
	breakX: numeric,
	inducedBreakZ: numeric,
	breakZ: numeric,
	is_abs_challenge: boolish,
	isSword: boolish,

	// Batted-ball metrics — only on `exit_velocity` rows, and string-encoded.
	hit_speed: numeric,
	hit_angle: numeric,
	hit_distance: numeric,
	launch_speed: numeric,
	launch_angle: numeric,
	batSpeed: numeric,
	xba: numeric,
	is_barrel: boolish,
	/** Batted-ball landing spot in feet from home plate; +x toward right field. */
	hc_x_ft: numeric,
	hc_y_ft: numeric,
});

export type SavantPitchRow = z.infer<typeof SavantPitchRow>;

export const SavantGameFeed = z.looseObject({
	game_status: z.string().optional(),
	game_status_code: z.string().optional(),
	gamedayType: z.string().optional(),
	hasAbs: z.boolean().optional(),
	team_home: z.array(SavantPitchRow).default([]),
	team_away: z.array(SavantPitchRow).default([]),
	exit_velocity: z.array(SavantPitchRow).default([]),
});

export type SavantGameFeed = z.infer<typeof SavantGameFeed>;

/**
 * Indexes a Savant feed by `play_id` for joining onto GUMBO pitches.
 * `exit_velocity` rows are merged last so their batted-ball metrics win over
 * the same pitch's entry in `team_home`/`team_away`, which lacks them.
 */
export function indexSavantPitches(feed: SavantGameFeed): Map<string, SavantPitchRow> {
	const byPlayId = new Map<string, SavantPitchRow>();

	for (const row of [...feed.team_home, ...feed.team_away, ...feed.exit_velocity]) {
		if (!row.play_id) continue;
		const existing = byPlayId.get(row.play_id);
		byPlayId.set(row.play_id, existing ? { ...existing, ...row } : row);
	}

	return byPlayId;
}
