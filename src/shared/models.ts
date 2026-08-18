// ============================================================
// Clean domain models shipped to the client.
//
// Nothing here mirrors MLB's wire format. The raw GUMBO and Savant zod
// schemas live under src/server/mlb/schemas/ and never cross to the client —
// that boundary is what keeps a feed change from rippling into components.
//
// Field shapes are chosen to feed @hydra-tv/sports directly: pitch locations
// are Statcast plate_x/plate_z in feet, batted balls are feet from home plate,
// and linescore innings use the null / "X" convention LineScore expects.
// ============================================================

// ---------- primitives ----------

export type Handedness = "L" | "R" | "S";
export type HalfInning = "top" | "bottom";

export interface TeamRef {
	id: number;
	name: string;
	abbreviation: string;
	/** Team-specific hex color, supplied by the app (MLB does not publish these). */
	color?: string;
}

export interface PlayerProfile {
	id: number;
	fullName: string;
	/** "Last, F." style short form for dense tables. */
	shortName: string;
	jerseyNumber: string | null;
	position: string | null;
	batSide: Handedness | null;
	pitchHand: Handedness | null;
}

// ---------- pitches ----------

/**
 * Statcast measurements for a pitch, from Baseball Savant. Arrives seconds
 * after the pitch itself, hence the separate `pitchMetrics` delta event.
 *
 * Swing and batted-ball tracking are deliberately separate: bat tracking fires
 * on *any* tracked swing — whiffs, fouls, and even check swings on called
 * pitches (which show up as low bat speeds, ~3-44mph) — while batted-ball
 * metrics exist only on contact. Roughly 53 of 343 pitches in a game have
 * batted-ball data; ~182 have a tracked swing.
 */
export interface PitchMetrics {
	swing: SwingMetrics | null;
	battedBall: BattedBallMetrics | null;
}

export interface SwingMetrics {
	/** MPH at the sweet spot. Low values indicate a check swing. */
	batSpeed: number;
}

export interface BattedBallMetrics {
	exitVelocity: number | null;
	launchAngle: number | null;
	/** Projected landing distance, feet. */
	distance: number | null;
	/** Expected batting average, 0–1. */
	xba: number | null;
	isBarrel: boolean | null;
	/**
	 * Landing spot in feet from home plate, +x toward right field —
	 * the coordinate space @hydra-tv/sports' SprayChart takes directly.
	 */
	hitCoords: { x: number; y: number } | null;
}

/** How a pitch was resolved, in the vocabulary @hydra-tv/sports colors by. */
export type PitchKind = "ball" | "strike" | "foul" | "inplay" | "hbp";

export interface PitchCall {
	code: string;
	name: string;
	kind: PitchKind;
	isStrike: boolean;
	isSwing: boolean;
	isInPlay: boolean;
}

export interface Pitch {
	/** Statcast GUID — the join key between GUMBO and Savant. */
	playId: string;
	atBatIndex: number;
	pitchNumber: number;
	/** Count *before* this pitch, which is what a pitch log displays. */
	countBefore: { balls: number; strikes: number };
	outs: number;
	type: { code: string; name: string } | null;
	call: PitchCall;
	description: string;
	velocity: { start: number; end: number | null } | null;
	spinRate: number | null;
	extension: number | null;
	/** plate_x / plate_z in feet, catcher's view. */
	location: { x: number; z: number } | null;
	/** 1–9 inside the zone, 11–14 outside. */
	zone: number | null;
	/** Per-batter zone bounds in feet. */
	strikeZone: { top: number; bottom: number } | null;
	/** Inches; induced vertical break excludes gravity. */
	break: { horizontal: number; inducedVertical: number; vertical: number } | null;
	absReview: AbsReview | null;
	metrics: PitchMetrics | null;
}

export interface AbsReview {
	isOverturned: boolean;
	inProgress: boolean;
	reviewType: string;
	challengeTeamId: number | null;
	challengerId: number | null;
}

// ---------- plays ----------

export interface PlaySummary {
	atBatIndex: number;
	inning: number;
	halfInning: HalfInning;
	batterId: number;
	pitcherId: number;
	/** Normalized event type, e.g. "single", "strikeout". */
	eventType: string | null;
	event: string | null;
	description: string;
	rbi: number;
	isScoringPlay: boolean;
	isOut: boolean;
	/** Scorecard notation — "K", "ꓘ", "6-3", "F8 DP" — computed server-side. */
	scorecard: string | null;
	scoreAfter: { home: number; away: number };
	pitches: Pitch[];
}

/** The at-bat in progress. Same shape as a completed play, minus the result. */
export interface LivePlay {
	atBatIndex: number;
	inning: number;
	halfInning: HalfInning;
	batterId: number;
	pitcherId: number;
	onDeckId: number | null;
	description: string | null;
	pitches: Pitch[];
}

// ---------- game state ----------

export type GameStatusKind = "preview" | "live" | "final" | "other";

export interface GameState {
	kind: GameStatusKind;
	/** MLB's own label, e.g. "In Progress", "Warmup", "Final". */
	detail: string;
	abstract: string;
	inning: number | null;
	halfInning: HalfInning | null;
	/** "Middle"/"End" mean between halves — no batter is up. */
	inningState: string | null;
	outs: number;
	count: { balls: number; strikes: number };
	bases: { first: boolean; second: boolean; third: boolean };
	isFinal: boolean;
}

/** One inning's runs. `null` = not yet played, `"X"` = home half never batted. */
export type InningRuns = number | null | "X";

export interface LinescoreSide {
	runs: number;
	hits: number;
	errors: number;
	leftOnBase: number;
	innings: InningRuns[];
}

export interface Linescore {
	currentInning: number | null;
	scheduledInnings: number;
	home: LinescoreSide;
	away: LinescoreSide;
}

// ---------- boxscore ----------
// Row keys match @hydra-tv/sports' BoxScore "batting" and "pitching" presets.

export interface BattingLine {
	playerId: number;
	name: string;
	position: string | null;
	starter: boolean;
	battingOrder: number | null;
	ab: number;
	r: number;
	h: number;
	rbi: number;
	bb: number;
	so: number;
	lob: number;
	avg: string;
}

export interface PitchingLine {
	playerId: number;
	name: string;
	starter: boolean;
	ip: string;
	h: number;
	r: number;
	er: number;
	bb: number;
	so: number;
	hr: number;
	pitches: number;
	strikes: number;
	era: string;
}

export interface TeamBox {
	batting: BattingLine[];
	pitching: PitchingLine[];
	battingTotals: Omit<BattingLine, "playerId" | "name" | "position" | "starter" | "battingOrder">;
	pitchingTotals: Omit<PitchingLine, "playerId" | "name" | "starter">;
}

// ---------- snapshot ----------

export interface Venue {
	id: number;
	name: string;
}

export interface GameDatetime {
	/** ISO instant of first pitch. */
	startsAt: string;
	dayNight: string | null;
}

export interface AbsChallengeState {
	home: { remaining: number; used: number };
	away: { remaining: number; used: number };
}

/**
 * The complete client-side view of a game. Sent whole on subscribe and on
 * resync; afterwards the client maintains it by reducing GameEvent deltas.
 */
export interface GameSnapshot {
	gamePk: number;
	state: GameState;
	teams: { home: TeamRef; away: TeamRef };
	venue: Venue;
	datetime: GameDatetime;
	linescore: Linescore;
	currentPlay: LivePlay | null;
	/** Completed at-bats, oldest first. */
	plays: PlaySummary[];
	/** Keyed by numeric player id — not GUMBO's "ID683002" strings. */
	players: Record<number, PlayerProfile>;
	boxscore: { home: TeamBox; away: TeamBox };
	abs: AbsChallengeState | null;
	/** Epoch ms when the server built this snapshot. */
	updatedAt: number;
}
