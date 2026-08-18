import type {
	AbsChallengeState,
	GameDecisions,
	GameInfo,
	GameSnapshot,
	GameState,
	Linescore,
	LivePlay,
	PitchMetrics,
	Pitch,
	PlaySummary,
	TeamBox,
} from "./models.ts";

// ============================================================
// The wire protocol between the game watcher and its subscribers.
//
// A subscriber receives exactly one `snapshot` on join, then deltas. The
// client reduces these back into a GameSnapshot (see client/game/reducer.ts),
// which is the mirror image of the differ that produces them on the server.
// ============================================================

export type GameEvent =
	/** Full state. Sent on join, and again whenever a subscriber falls behind. */
	| { t: "snapshot"; snapshot: GameSnapshot }
	/** A pitch was thrown. Statcast metrics may not have landed yet. */
	| { t: "pitch"; pitch: Pitch }
	/**
	 * Savant caught up on a pitch already delivered. Separate from `pitch`
	 * because GUMBO runs about one pitch ahead of Savant during a live game —
	 * waiting for both would visibly delay the pitch on screen.
	 */
	| { t: "pitchMetrics"; playId: string; metrics: PitchMetrics }
	/** An at-bat completed. */
	| { t: "play"; play: PlaySummary }
	/** The at-bat in progress changed (new batter, or a pitch appended). */
	| { t: "currentPlay"; currentPlay: LivePlay | null }
	| { t: "linescore"; linescore: Linescore }
	| { t: "state"; state: GameState }
	| { t: "boxscore"; boxscore: { home: TeamBox; away: TeamBox } }
	| { t: "abs"; abs: AbsChallengeState | null }
	| { t: "decisions"; decisions: GameDecisions | null }
	| { t: "gameInfo"; gameInfo: GameInfo }
	/** Keeps the socket warm and lets the client detect a stalled feed. */
	| { t: "heartbeat"; at: number };

export type GameEventType = GameEvent["t"];
