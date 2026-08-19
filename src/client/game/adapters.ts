import type {
	BattingLine,
	GameSnapshot,
	HalfInning,
	Handedness,
	Pitch,
	PitchMixEntry,
	PitchingLine,
	PlayAction,
	PlaySummary,
	TeamBox,
	TeamRef,
} from "../../shared/models.ts";

// ============================================================
// Projections from our domain models onto @hydra-tv/sports props.
//
// Kept separate from the components, and pure, so the mapping can be tested
// without rendering — the failure mode otherwise is an empty chart with no
// error, which is easy to miss.
// ============================================================

export type SportsPitchResult = "ball" | "called" | "swinging" | "foul" | "inplay" | "hbp";

export interface StrikeZonePitch {
	x: number;
	z: number;
	type?: string;
	result?: SportsPitchResult;
	number?: number;
	label?: string;
}

export interface SequencePitch {
	type?: string;
	velocity?: number;
	spin?: number;
	result?: string;
	kind?: "ball" | "strike" | "foul" | "inplay";
	count?: string;
	x?: number;
	z?: number;
}

/**
 * The library splits strikes into called and swinging, which our `PitchKind`
 * folds together — `call.isSwing` recovers the distinction.
 */
export function toSportsResult(pitch: Pitch): SportsPitchResult {
	switch (pitch.call.kind) {
		case "ball":
			return "ball";
		case "foul":
			return "foul";
		case "inplay":
			return "inplay";
		case "hbp":
			return "hbp";
		case "strike":
			return pitch.call.isSwing ? "swinging" : "called";
	}
}

/** Pitches with a tracked location, ready for StrikeZonePlot. */
export function toStrikeZonePitches(pitches: Pitch[]): StrikeZonePitch[] {
	return pitches
		.filter((pitch): pitch is Pitch & { location: NonNullable<Pitch["location"]> } => pitch.location !== null)
		.map(pitch => ({
			x: pitch.location.x,
			z: pitch.location.z,
			type: pitch.type?.code,
			result: toSportsResult(pitch),
			number: pitch.pitchNumber,
			label: pitchTooltip(pitch),
		}));
}

function pitchTooltip(pitch: Pitch): string {
	const parts = [`#${pitch.pitchNumber}`];
	if (pitch.type) parts.push(pitch.type.name);
	if (pitch.velocity) parts.push(`${pitch.velocity.start.toFixed(1)} mph`);
	parts.push(pitch.call.name || pitch.description);

	const exitVelocity = pitch.metrics?.battedBall?.exitVelocity;
	if (exitVelocity !== null && exitVelocity !== undefined) parts.push(`${exitVelocity} mph EV`);

	return parts.join(" · ");
}

export function toSequencePitches(pitches: Pitch[]): SequencePitch[] {
	return pitches.map(pitch => ({
		type: pitch.type?.code,
		velocity: pitch.velocity?.start,
		spin: pitch.spinRate ?? undefined,
		result: (pitch.call.name || pitch.description).toUpperCase(),
		kind: pitch.call.kind === "hbp" ? "ball" : pitch.call.kind,
		count: `${pitch.countBefore.balls}-${pitch.countBefore.strikes}`,
		x: pitch.location?.x,
		z: pitch.location?.z,
	}));
}

const PITCH_MIX_COLORS = ["var(--ch-1)", "var(--ch-2)", "var(--ch-3)", "var(--ch-4)"] as const;

export interface PitchMixBar {
	/** Short pitch-type code — fits the BarChart label gutter. */
	label: string;
	value: number;
	count: number;
	color: string;
	averageSpeed: number | null;
}

/** Maps server-computed mix onto BarChart props. Labels use type codes so they always fit. */
export function toPitchMixBars(entries: PitchMixEntry[]): PitchMixBar[] {
	return entries.map((entry, index) => ({
		label: entry.code,
		value: entry.percent,
		count: entry.count,
		color: PITCH_MIX_COLORS[index % PITCH_MIX_COLORS.length]!,
		averageSpeed: entry.averageSpeed,
	}));
}

/** Formats the value column as "44% · 27". */
export function formatPitchMixBarValue(bar: PitchMixBar): string {
	return `${bar.value}% · ${bar.count}`;
}

/** Formats mean velo as "96.2", or empty when the type has no tracked speed. */
export function formatPitchMixBarSpeed(bar: PitchMixBar): string {
	if (bar.averageSpeed == null) return "";
	return bar.averageSpeed.toFixed(1);
}

/**
 * Per-batter zone bounds. Pitches carry their own, so the newest tracked one
 * describes the batter currently up; the defaults are only a league average.
 */
export function zoneBounds(pitches: Pitch[]): { zoneTop?: number; zoneBottom?: number } {
	const withZone = pitches.filter(pitch => pitch.strikeZone !== null).at(-1);
	if (!withZone?.strikeZone) return {};
	return { zoneTop: withZone.strikeZone.top, zoneBottom: withZone.strikeZone.bottom };
}

/** `TOP 3.42 · BOT 1.59 FT` — omitted until a pitch has carried the batter's zone. */
export function formatZoneBounds(bounds: { zoneTop?: number; zoneBottom?: number }): string | undefined {
	if (bounds.zoneTop === undefined || bounds.zoneBottom === undefined) return undefined;
	return `TOP ${bounds.zoneTop.toFixed(2)} · BOT ${bounds.zoneBottom.toFixed(2)} FT`;
}

// ---------- play by play ----------

export interface PlayByPlayRow {
	clock?: string;
	period?: string;
	team?: "home" | "away";
	text?: string;
	score?: string;
	kind?: "normal" | "score" | "period";
}

export type PlayLogEntry = { kind: "play"; play: PlaySummary } | { kind: "action"; action: PlayAction };

function logHalf(entry: PlayLogEntry): { inning: number; halfInning: HalfInning } {
	return entry.kind === "play"
		? { inning: entry.play.inning, halfInning: entry.play.halfInning }
		: { inning: entry.action.inning, halfInning: entry.action.halfInning };
}

/**
 * Completed at-bats interleaved with nested non-PA actions (steals, subs,
 * status changes, …), oldest first. Live-at-bat actions are included so a
 * steal can appear before the plate appearance finishes.
 */
export function toPlayLog(snapshot: GameSnapshot): PlayLogEntry[] {
	const entries: PlayLogEntry[] = [];

	for (const play of snapshot.plays) {
		for (const action of play.actions) entries.push({ kind: "action", action });
		entries.push({ kind: "play", play });
	}
	for (const action of snapshot.currentPlay?.actions ?? []) {
		entries.push({ kind: "action", action });
	}

	return entries;
}

/**
 * Completed at-bats and nested non-PA actions as a play-by-play feed, with an
 * inning marker inserted whenever the half changes.
 */
export function toPlayByPlayRows(snapshot: GameSnapshot): PlayByPlayRow[] {
	const rows: PlayByPlayRow[] = [];
	let lastHalf = "";

	for (const entry of toPlayLog(snapshot)) {
		const { inning, halfInning } = logHalf(entry);
		const half = `${halfInning}-${inning}`;
		if (half !== lastHalf) {
			rows.push({ kind: "period", period: `${halfInning === "top" ? "TOP" : "BOT"} ${inning}` });
			lastHalf = half;
		}

		if (entry.kind === "play") {
			const play = entry.play;
			rows.push({
				// The batting side owns the play, so the color bar follows it.
				team: play.halfInning === "top" ? "away" : "home",
				clock: play.scorecard ?? undefined,
				text: play.description,
				score: play.isScoringPlay ? `${play.scoreAfter.away}-${play.scoreAfter.home}` : undefined,
				kind: play.isScoringPlay ? "score" : "normal",
			});
			continue;
		}

		const action = entry.action;
		rows.push({
			team: action.halfInning === "top" ? "away" : "home",
			text: action.description,
			kind: action.isScoringPlay ? "score" : "normal",
		});
	}

	return rows;
}

// ---------- spray chart ----------

export interface SprayBall {
	x?: number;
	y?: number;
	result?: "single" | "double" | "triple" | "homer" | "out";
	label?: string;
}

const HIT_RESULTS: Record<string, SprayBall["result"]> = {
	single: "single",
	double: "double",
	triple: "triple",
	home_run: "homer",
};

/**
 * Batted balls with Statcast landing coordinates, for SprayChart.
 * Coordinates come from Savant in feet from home plate, which is the space the
 * component already takes — no conversion.
 */
export function toSprayBalls(plays: PlaySummary[], teamFilter?: "home" | "away"): SprayBall[] {
	const balls: SprayBall[] = [];

	for (const play of plays) {
		if (teamFilter && (play.halfInning === "top" ? "away" : "home") !== teamFilter) continue;

		for (const pitch of play.pitches) {
			const coords = pitch.metrics?.battedBall?.hitCoords;
			if (!coords) continue;

			const exitVelocity = pitch.metrics?.battedBall?.exitVelocity;
			balls.push({
				x: coords.x,
				y: coords.y,
				result: HIT_RESULTS[play.eventType ?? ""] ?? "out",
				label: exitVelocity ? `${play.description} (${exitVelocity} mph)` : play.description,
			});
		}
	}

	return balls;
}

// ---------- misc ----------

export function teamSideOf(snapshot: GameSnapshot, side: "home" | "away"): TeamRef {
	return snapshot.teams[side];
}

/** "TOP 7" / "MID 7" — the label above the score. */
export function periodLabel(snapshot: GameSnapshot): string {
	const { state } = snapshot;
	if (state.kind === "final") return "";
	if (!state.inning) return state.detail.toUpperCase();

	if (state.inningState === "Middle" || state.inningState === "End") {
		return `${state.inningState.toUpperCase()} ${state.inning}`;
	}

	return `${state.halfInning === "top" ? "TOP" : "BOT"} ${state.inning}`;
}

/** The at-bat in progress, or the last completed one between innings / after the final out. */
export function displayedPlay(snapshot: GameSnapshot) {
	return snapshot.currentPlay ?? snapshot.plays.at(-1) ?? null;
}

export function canShowAtBat(snapshot: GameSnapshot): boolean {
	const play = displayedPlay(snapshot);
	return play !== null && snapshot.players[play.batterId] !== undefined;
}

export function offenseSide(snapshot: GameSnapshot): "home" | "away" | null {
	const half = snapshot.currentPlay?.halfInning ?? snapshot.state.halfInning;
	if (!half) return null;
	return half === "top" ? "away" : "home";
}

export function findBattingLine(snapshot: GameSnapshot, playerId: number): BattingLine | undefined {
	for (const side of ["away", "home"] as const) {
		const box = snapshot.boxscore[side];
		const found = box.batting.find(line => line.playerId === playerId) ?? box.bench.find(line => line.playerId === playerId);
		if (found) return found;
	}
	return undefined;
}

export function findPitchingLine(snapshot: GameSnapshot, playerId: number): PitchingLine | undefined {
	for (const side of ["away", "home"] as const) {
		const box = snapshot.boxscore[side];
		const found =
			box.pitching.find(line => line.playerId === playerId) ?? box.bullpen.find(line => line.playerId === playerId);
		if (found) return found;
	}
	return undefined;
}

export function probablePitcherLine(snapshot: GameSnapshot, side: "home" | "away"): PitchingLine | undefined {
	const id = snapshot.probablePitchers[side];
	if (id !== null) return findPitchingLine(snapshot, id) ?? snapshot.boxscore[side].pitching[0];
	return snapshot.boxscore[side].pitching[0];
}

function linesById(box: TeamBox): Map<number, BattingLine> {
	return new Map([...box.batting, ...box.bench].map(line => [line.playerId, line]));
}

/** Current 1–9, batting-spot order. `line` is missing only if the player is not yet in the box. */
export function currentLineup(box: TeamBox): { slot: number; playerId: number; line: BattingLine | undefined }[] {
	const byId = linesById(box);
	if (box.battingOrder.length > 0) {
		return box.battingOrder.map((playerId, index) => ({
			slot: index + 1,
			playerId,
			line: byId.get(playerId),
		}));
	}

	return box.batting
		.filter(line => line.battingOrder !== null)
		.sort((left, right) => (left.battingOrder ?? 0) - (right.battingOrder ?? 0))
		.map(line => ({ slot: line.battingOrder ?? 0, playerId: line.playerId, line }));
}

/** Opening-day 1–9; falls back to the current order if starters are not marked. */
export function startingLineup(box: TeamBox): { slot: number; playerId: number; line: BattingLine | undefined }[] {
	const starters = box.batting
		.filter(line => line.starter && line.battingOrder !== null)
		.sort((left, right) => (left.battingOrder ?? 0) - (right.battingOrder ?? 0))
		.map(line => ({ slot: line.battingOrder ?? 0, playerId: line.playerId, line }));

	return starters.length > 0 ? starters : currentLineup(box);
}

export function batterSlash(line: BattingLine): string {
	if (line.avg === "-" && line.obp === "-" && line.slg === "-") return "";
	return `${line.avg}/${line.obp}/${line.slg}`;
}

export interface AbsChallengeRow {
	playId: string;
	/** 1-based order among ABS challenges this game, oldest first. */
	index: number;
	inning: number;
	halfInning: HalfInning;
	batterId: number;
	pitcherId: number;
	callName: string;
	callCode: string;
	result: SportsPitchResult;
	type: string | null;
	velocity: number | null;
	location: { x: number; z: number } | null;
	strikeZone: { top: number; bottom: number } | null;
	/** Statcast feet to the ABS zone edge; null until Savant publishes it. */
	edgeDistance: number | null;
	isOverturned: boolean;
	inProgress: boolean;
	challengeTeamId: number | null;
	challengerId: number | null;
	challengerType: string | null;
	isBatter: boolean | null;
	batterHand: Handedness | null;
}

/** Pitches (completed + current) that went to an automated-ball-strike review. */
export function absChallengeRows(snapshot: GameSnapshot): AbsChallengeRow[] {
	const plays = [...snapshot.plays, ...(snapshot.currentPlay ? [snapshot.currentPlay] : [])];

	const rows: AbsChallengeRow[] = [];
	for (const play of plays) {
		for (const pitch of play.pitches) {
			if (!pitch.absReview) continue;
			const abs = pitch.metrics?.abs;
			rows.push({
				playId: pitch.playId,
				index: rows.length + 1,
				inning: play.inning,
				halfInning: play.halfInning,
				batterId: play.batterId,
				pitcherId: play.pitcherId,
				callName: pitch.call.name,
				callCode: pitch.call.code,
				result: toSportsResult(pitch),
				type: pitch.type?.code ?? null,
				velocity: pitch.velocity?.start ?? null,
				location: pitch.location,
				strikeZone: pitch.strikeZone,
				edgeDistance: abs?.edgeDistance ?? null,
				isOverturned: pitch.absReview.isOverturned,
				inProgress: pitch.absReview.inProgress,
				challengeTeamId: pitch.absReview.challengeTeamId,
				challengerId: pitch.absReview.challengerId,
				challengerType: abs?.challengerType ?? null,
				isBatter: abs?.isBatter ?? null,
				batterHand: snapshot.players[play.batterId]?.batSide ?? null,
			});
		}
	}
	return rows;
}

/** Mean batter zone across challenges — a composite plot cannot use one stance. */
export function meanZoneBounds(rows: AbsChallengeRow[]): { zoneTop?: number; zoneBottom?: number } {
	const zones = rows.map(row => row.strikeZone).filter((zone): zone is NonNullable<typeof zone> => zone !== null);
	if (zones.length === 0) return {};
	return {
		zoneTop: zones.reduce((sum, zone) => sum + zone.top, 0) / zones.length,
		zoneBottom: zones.reduce((sum, zone) => sum + zone.bottom, 0) / zones.length,
	};
}

export function toAbsZonePitches(rows: AbsChallengeRow[]): StrikeZonePitch[] {
	return rows
		.filter((row): row is AbsChallengeRow & { location: NonNullable<AbsChallengeRow["location"]> } => row.location !== null)
		.map(row => ({
			x: row.location.x,
			z: row.location.z,
			type: row.type ?? undefined,
			result: row.result,
			number: row.index,
			label: absChallengeTooltip(row),
		}));
}

function absChallengeTooltip(row: AbsChallengeRow): string {
	const parts = [`#${row.index}`];
	if (row.type) parts.push(row.type);
	parts.push(umpCallLabel(row.callCode, row.callName));
	const miss = formatMissBy(row.edgeDistance);
	if (miss) parts.push(miss);
	if (row.inProgress) parts.push("Pending");
	else parts.push(row.isOverturned ? "Overturned" : "Confirmed");
	return parts.join(" · ");
}

export function umpCallLabel(code: string, name: string): string {
	if (code === "C") return "Called Strike";
	if (code === "B" || code === "*B") return "Called Ball";
	return name || code;
}

/** ABS's call: the ump's call if confirmed, the opposite ball/strike if overturned. */
export function absCallLabel(code: string, name: string, isOverturned: boolean): string {
	const ump = umpCallLabel(code, name);
	if (!isOverturned) return ump;
	if (ump === "Called Strike") return "Called Ball";
	if (ump === "Called Ball") return "Called Strike";
	return ump;
}

/** `0.30"` from Statcast feet. Omitted when miss-by has not landed yet. */
export function formatMissBy(feet: number | null | undefined): string | undefined {
	if (feet == null || !Number.isFinite(feet)) return undefined;
	return `${(feet * 12).toFixed(2)}"`;
}

export type MissDirection = "high" | "low" | "inside" | "outside";

/** Home-plate half-width in feet (17" / 2). Direction only — not the official miss. */
const PLATE_HALF_WIDTH_FT = 8.5 / 12;

/**
 * Nearest-edge direction from Statcast catcher's view (+x toward first base).
 * Inside/outside follow the batter's handedness; switch hitters are treated as right-handed.
 */
export function missDirection(
	location: { x: number; z: number } | null,
	strikeZone: { top: number; bottom: number } | null,
	batSide: Handedness | null,
): MissDirection | null {
	if (!location || !strikeZone) return null;

	const { x, z } = location;
	const { top, bottom } = strikeZone;
	const overHigh = Math.max(0, z - top);
	const overLow = Math.max(0, bottom - z);
	const overFirst = Math.max(0, x - PLATE_HALF_WIDTH_FT);
	const overThird = Math.max(0, -PLATE_HALF_WIDTH_FT - x);

	if (overHigh === 0 && overLow === 0 && overFirst === 0 && overThird === 0) {
		const toTop = top - z;
		const toBot = z - bottom;
		const toFirst = PLATE_HALF_WIDTH_FT - x;
		const toThird = x - -PLATE_HALF_WIDTH_FT;
		const nearest = Math.min(toTop, toBot, toFirst, toThird);
		if (nearest === toTop) return "high";
		if (nearest === toBot) return "low";
		if (nearest === toFirst) return horizontalMiss(1, batSide);
		return horizontalMiss(-1, batSide);
	}

	const overflow = Math.max(overHigh, overLow, overFirst, overThird);
	if (overflow === overHigh) return "high";
	if (overflow === overLow) return "low";
	if (overflow === overFirst) return horizontalMiss(1, batSide);
	return horizontalMiss(-1, batSide);
}

function horizontalMiss(xSign: 1 | -1, batSide: Handedness | null): MissDirection {
	const rightHanded = batSide !== "L";
	if (xSign > 0) return rightHanded ? "outside" : "inside";
	return rightHanded ? "inside" : "outside";
}

export function formatMissDirection(direction: MissDirection | null): string | undefined {
	if (!direction) return undefined;
	return direction.toUpperCase();
}
