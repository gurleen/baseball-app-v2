import type { Play, PlayEvent, ReviewDetails } from "../mlb/schemas/gumbo.ts";
import type { SavantPitchRow } from "../mlb/schemas/savant.ts";
import type {
	AbsChallengeMetrics,
	AbsReview,
	BattedBallMetrics,
	Pitch,
	PitchCall,
	PitchKind,
	PitchMetrics,
} from "../../shared/models.ts";

/** GUMBO's reviewType for an automated ball-strike challenge. */
const ABS_REVIEW_TYPE = "MJ";

/**
 * Maps a GUMBO pitch call code to the result vocabulary @hydra-tv/sports
 * colors by. Codes come from /api/v1/pitchCodes.
 */
function pitchKindFromCall(code: string, isInPlay: boolean): PitchKind {
	if (isInPlay) return "inplay";
	switch (code) {
		case "H": // hit by pitch
			return "hbp";
		case "F": // foul
		case "R": // foul bunt
		case "L": // foul bunt (missed)
		case "T": // foul tip
			return "foul";
		case "B": // ball
		case "*B": // ball in dirt
		case "I": // intentional ball
		case "P": // pitchout
		case "V": // automatic ball
			return "ball";
		default:
			return "strike";
	}
}

/** Swinging strikes, foul balls and balls in play all imply a swing. */
const SWING_CODES = new Set(["S", "W", "T", "F", "R", "L", "M", "Q", "D", "E", "X"]);

function toCall(event: PlayEvent): PitchCall {
	const call = event.details.call;
	const code = call?.code ?? "";
	const isInPlay = event.details.isInPlay === true;

	return {
		code,
		name: call?.description ?? event.details.description ?? "",
		kind: pitchKindFromCall(code, isInPlay),
		isStrike: event.details.isStrike === true,
		isSwing: SWING_CODES.has(code),
		isInPlay,
	};
}

function isAbsReview(review: ReviewDetails | undefined): review is ReviewDetails {
	return review?.reviewType === ABS_REVIEW_TYPE;
}

function toAbsReview(
	review: ReviewDetails | undefined,
	savant: SavantPitchRow | undefined,
): AbsReview | null {
	const challenge = savant?.abs_challenge;
	const savantIsAbs = savant?.is_abs_challenge === true || challenge != null;

	if (isAbsReview(review)) {
		return {
			isOverturned: review.isOverturned,
			inProgress: review.inProgress ?? challenge?.is_in_progress ?? false,
			reviewType: review.reviewType,
			challengeTeamId: review.challengeTeamId ?? challenge?.challenge_team_id ?? null,
			challengerId: review.player?.id ?? challenge?.challenging_player_id ?? null,
		};
	}

	if (!savantIsAbs) return null;

	return {
		isOverturned: challenge?.is_overturned ?? false,
		inProgress: challenge?.is_in_progress ?? false,
		reviewType: ABS_REVIEW_TYPE,
		challengeTeamId: challenge?.challenge_team_id ?? null,
		challengerId: challenge?.challenging_player_id ?? null,
	};
}

/**
 * Resolves the ABS review attached to a pitch. MLB has published this in
 * three different places across feed generations, in priority order:
 *
 *   1. directly on the pitch event (older pattern, reviewType "MJ")
 *   2. on the action event immediately following the pitch (also older)
 *   3. on the play itself — which applies to the *last* pitch of the at-bat
 *      (current pattern)
 *
 * Manager challenges (MO / MC / MA) are ignored — they are not ABS.
 */
function resolveReview(play: Play, event: PlayEvent, eventIndex: number): ReviewDetails | undefined {
	if (isAbsReview(event.reviewDetails)) return event.reviewDetails;

	const next = play.playEvents[eventIndex + 1];
	if (next && !next.isPitch && isAbsReview(next.reviewDetails)) return next.reviewDetails;

	const isLastPitch = !play.playEvents.slice(eventIndex + 1).some(later => later.isPitch);
	if (isLastPitch && isAbsReview(play.reviewDetails)) return play.reviewDetails;

	return undefined;
}

function toAbsChallengeMetrics(row: SavantPitchRow): AbsChallengeMetrics | null {
	const challenge = row.abs_challenge;
	if (!challenge && row.is_abs_challenge !== true) return null;

	return {
		edgeDistance: challenge?.edge_distance ?? challenge?.edge_distance_calc ?? null,
		isBatter: challenge?.is_batter ?? null,
		challengerType: challenge?.challenging_player_type ?? null,
	};
}

/**
 * Statcast measurements for a pitch, or null when Savant has nothing tracked.
 *
 * Swing, batted-ball, and ABS tracking are independent channels: bat speed
 * appears on any tracked swing, batted-ball fields require contact, and ABS
 * miss-by lands on challenged called pitches that often have neither.
 */
export function toPitchMetrics(row: SavantPitchRow | undefined): PitchMetrics | null {
	if (!row) return null;

	const swing = row.batSpeed !== null ? { batSpeed: row.batSpeed } : null;

	const exitVelocity = row.hit_speed ?? row.launch_speed ?? null;
	const launchAngle = row.hit_angle ?? row.launch_angle ?? null;
	const hasContact = exitVelocity !== null || launchAngle !== null || row.hit_distance !== null;

	const battedBall: BattedBallMetrics | null = hasContact
		? {
				exitVelocity,
				launchAngle,
				distance: row.hit_distance ?? null,
				xba: row.xba ?? null,
				isBarrel: row.is_barrel ?? null,
				hitCoords:
					row.hc_x_ft !== null && row.hc_y_ft !== null ? { x: row.hc_x_ft, y: row.hc_y_ft } : null,
			}
		: null;

	const abs = toAbsChallengeMetrics(row);

	if (!swing && !battedBall && !abs) return null;
	return { swing, battedBall, abs };
}

/**
 * Builds a domain Pitch from a GUMBO pitch event, optionally merged with its
 * Savant row. Tracking values prefer GUMBO (it is the faster feed) and fall
 * back to Savant, which fills gaps on pitches GUMBO published untracked.
 */
export function toPitch(
	play: Play,
	event: PlayEvent,
	eventIndex: number,
	savant: SavantPitchRow | undefined,
): Pitch | null {
	if (!event.isPitch || !event.playId) return null;

	const pitchData = event.pitchData;
	const coords = pitchData?.coordinates;
	const breaks = pitchData?.breaks;

	const startSpeed = pitchData?.startSpeed ?? savant?.start_speed ?? null;
	const x = coords?.pX ?? savant?.px ?? null;
	const z = coords?.pZ ?? savant?.pz ?? null;
	const zoneTop = pitchData?.strikeZoneTop ?? savant?.sz_top ?? null;
	const zoneBottom = pitchData?.strikeZoneBottom ?? savant?.sz_bot ?? null;

	const horizontal = breaks?.breakHorizontal ?? savant?.breakX ?? null;
	const inducedVertical = breaks?.breakVerticalInduced ?? savant?.inducedBreakZ ?? null;
	const vertical = breaks?.breakVertical ?? savant?.breakZ ?? null;

	return {
		playId: event.playId,
		atBatIndex: play.atBatIndex,
		pitchNumber: event.pitchNumber ?? savant?.pitch_number ?? 0,
		// event.count is the count *after* this pitch; preCount is the count
		// before it, which is what a pitch log shows. Fall back to Savant's
		// pre_balls/pre_strikes, then to the post-count.
		countBefore: {
			balls: event.preCount?.balls ?? asNumber(savant?.["pre_balls"]) ?? event.count.balls ?? 0,
			strikes: event.preCount?.strikes ?? asNumber(savant?.["pre_strikes"]) ?? event.count.strikes ?? 0,
		},
		outs: event.count.outs ?? 0,
		type: event.details.type?.code
			? { code: event.details.type.code, name: event.details.type.description }
			: savant?.pitch_type
				? { code: savant.pitch_type, name: savant.pitch_name ?? savant.pitch_type }
				: null,
		call: toCall(event),
		description: event.details.description ?? "",
		velocity: startSpeed !== null ? { start: startSpeed, end: pitchData?.endSpeed ?? savant?.end_speed ?? null } : null,
		spinRate: breaks?.spinRate ?? savant?.spin_rate ?? null,
		extension: pitchData?.extension ?? savant?.extension ?? null,
		location: x !== null && z !== null ? { x, z } : null,
		zone: pitchData?.zone ?? savant?.zone ?? null,
		strikeZone: zoneTop !== null && zoneBottom !== null ? { top: zoneTop, bottom: zoneBottom } : null,
		break:
			horizontal !== null && inducedVertical !== null && vertical !== null
				? { horizontal, inducedVertical, vertical }
				: null,
		absReview: toAbsReview(resolveReview(play, event, eventIndex), savant),
		metrics: toPitchMetrics(savant),
	};
}

/** Savant rows are loose, so unknown extra fields come back as `unknown`. */
function asNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Every tracked pitch in a play, in order. */
export function toPitches(play: Play, savantByPlayId: Map<string, SavantPitchRow>): Pitch[] {
	const pitches: Pitch[] = [];

	for (const [index, event] of play.playEvents.entries()) {
		const pitch = toPitch(play, event, index, event.playId ? savantByPlayId.get(event.playId) : undefined);
		if (pitch) pitches.push(pitch);
	}

	return pitches;
}
