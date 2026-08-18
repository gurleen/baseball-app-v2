import type { FieldingCredit, Play, Runner } from "../mlb/schemas/gumbo.ts";

const DIRECT_SCORECARD_CODES: Record<string, string> = {
	single: "1B",
	double: "2B",
	triple: "3B",
	home_run: "HR",
	walk: "BB",
	intent_walk: "IBB",
	hit_by_pitch: "HBP",
	catcher_interf: "CI",
	field_error: "E",
	reached_on_error: "E",
	strikeout: "K",
	balk: "BK",
	wild_pitch: "WP",
	passed_ball: "PB",
	stolen_base: "SB",
	caught_stealing: "CS",
	pickoff_caught_stealing: "POCS",
	pickoff_1b: "PO",
	pickoff_2b: "PO",
	pickoff_3b: "PO",
	defensive_indiff: "DI",
};

const AIR_OUT_EVENT_TYPES = new Set([
	"flyout",
	"lineout",
	"popup",
	"pop_out",
	"foul_out",
]);

const DOUBLE_PLAY_EVENT_TYPES = new Set([
	"double_play",
	"grounded_into_double_play",
	"strikeout_double_play",
	"sac_fly_double_play",
	"sac_bunt_double_play",
	"runner_double_play",
]);

const TRIPLE_PLAY_EVENT_TYPES = new Set(["triple_play", "grounded_into_triple_play"]);

const POSITION_TO_SCORECARD_CODE: Record<string, string> = {
	P: "1",
	C: "2",
	"1B": "3",
	"2B": "4",
	"3B": "5",
	SS: "6",
	LF: "7",
	CF: "8",
	RF: "9",
	PITCHER: "1",
	CATCHER: "2",
	FIRST: "3",
	FIRSTBASE: "3",
	SECONDBASE: "4",
	SECOND: "4",
	THIRDBASE: "5",
	THIRD: "5",
	SHORTSTOP: "6",
	LEFTFIELD: "7",
	LEFT: "7",
	CENTERFIELD: "8",
	CENTER: "8",
	RIGHTFIELD: "9",
	RIGHT: "9",
};

const normalizeEventType = (value?: string) => value?.trim().toLowerCase().replaceAll(" ", "_") ?? "";

const normalizeText = (value?: string) => value?.trim().toLowerCase() ?? "";

const getBattedBallOutPrefix = (play: Play, eventType: string): "F" | "L" | "P" | null => {
	const resultText = normalizeText(play.result.description ?? play.result.event);

	if (
		eventType === "popup"
		|| eventType === "pop_out"
		|| resultText.includes("pops out")
		|| resultText.includes("popup")
	) {
		return "P";
	}

	if (
		eventType === "lineout"
		|| eventType === "line_out"
		|| resultText.includes("lines out")
		|| resultText.includes("lined out")
		|| resultText.includes("lineout")
	) {
		return "L";
	}

	if (
		AIR_OUT_EVENT_TYPES.has(eventType)
		|| resultText.includes("flies out")
		|| resultText.includes("fly out")
		|| resultText.includes("foul out")
	) {
		return "F";
	}

	return null;
};

const isLookingStrikeout = (play: Play): boolean => {
	const resultText = normalizeText(play.result.description ?? play.result.event);

	if (resultText.includes("looking") || resultText.includes("called out on strikes")) {
		return true;
	}

	for (let index = play.playEvents.length - 1; index >= 0; index -= 1) {
		const event = play.playEvents[index];

		if (!event?.isPitch) {
			continue;
		}

		const callDescription = normalizeText(event.details.call?.description);

		if (callDescription.includes("called strike")) {
			return true;
		}

		if (callDescription) {
			return false;
		}
	}

	return false;
};

const getScorecardPositionCode = (credit: FieldingCredit): string | null => {
	const rawCode = String(credit.position.code).trim().toUpperCase();

	if (/^[1-9]$/.test(rawCode)) {
		return rawCode;
	}

	const abbreviation = credit.position.abbreviation.trim().toUpperCase();

	if (POSITION_TO_SCORECARD_CODE[abbreviation]) {
		return POSITION_TO_SCORECARD_CODE[abbreviation];
	}

	const normalizedName = credit.position.name.replaceAll(/[^A-Za-z]/g, "").toUpperCase();
	return POSITION_TO_SCORECARD_CODE[normalizedName] ?? POSITION_TO_SCORECARD_CODE[rawCode] ?? null;
};

const getOutRunners = (play: Play): Runner[] => {
	return play.runners
		.filter((runner) => runner.movement.isOut)
		.slice()
		.sort((left, right) => (left.movement.outNumber ?? Number.MAX_SAFE_INTEGER) - (right.movement.outNumber ?? Number.MAX_SAFE_INTEGER));
};

const getRelevantCredits = (play: Play): FieldingCredit[] => {
	const outRunners = getOutRunners(play);

	if (outRunners.length > 0) {
		return outRunners.flatMap((runner) => runner.credits ?? []);
	}

	return play.runners.flatMap((runner) => runner.credits ?? []);
};

const getFieldingSequence = (play: Play): string[] => {
	const positions: string[] = [];

	for (const credit of getRelevantCredits(play)) {
		const positionCode = getScorecardPositionCode(credit);

		if (!positionCode || positions[positions.length - 1] === positionCode) {
			continue;
		}

		positions.push(positionCode);
	}

	return positions;
};

const formatSequence = (sequence: string[]) => sequence.join("-");

export const getScorecardCodeFromPlay = (play: Play): string => {
	const eventType = normalizeEventType(play.result.eventType ?? play.result.event);
	const sequence = getFieldingSequence(play);
	const sequenceText = formatSequence(sequence);
	const battedBallOutPrefix = getBattedBallOutPrefix(play, eventType);

	if (!eventType) {
		return play.result.event ?? play.result.description ?? "Play";
	}

	if (eventType === "field_error" || eventType === "reached_on_error") {
		return sequence[0] ? `E${sequence[0]}` : "E";
	}

	if (eventType === "fielders_choice") {
		return sequenceText ? `FC${sequenceText}` : "FC";
	}

	if (eventType === "sac_bunt") {
		return sequenceText ? `${sequenceText} SH` : "SH";
	}

	if (eventType === "sac_fly") {
		return sequenceText ? `${sequenceText} SF` : "SF";
	}

	if (eventType === "strikeout") {
		return isLookingStrikeout(play) ? "ꓘ" : "K";
	}

	if (DIRECT_SCORECARD_CODES[eventType]) {
		return DIRECT_SCORECARD_CODES[eventType];
	}

	if (sequenceText) {
		if (battedBallOutPrefix) {
			const primaryFielder = sequence[0];
			const battedBallCode = primaryFielder ? `${battedBallOutPrefix}${primaryFielder}` : battedBallOutPrefix;

			if (TRIPLE_PLAY_EVENT_TYPES.has(eventType)) {
				return `${battedBallCode} TP`;
			}

			if (DOUBLE_PLAY_EVENT_TYPES.has(eventType)) {
				return `${battedBallCode} DP`;
			}

			return battedBallCode;
		}

		if (TRIPLE_PLAY_EVENT_TYPES.has(eventType)) {
			return `${sequenceText} TP`;
		}

		if (DOUBLE_PLAY_EVENT_TYPES.has(eventType)) {
			return `${sequenceText} DP`;
		}

		if (sequence.length === 1) {
			return `${sequenceText}U`;
		}

		return sequenceText;
	}

	return play.result.event ?? play.result.description ?? "Play";
};
