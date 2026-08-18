import { ORPCError, os } from "@orpc/server";
import { z } from "zod";

import type { GameEvent } from "../../shared/events.ts";
import type { GameSnapshot } from "../../shared/models.ts";
import { gameRegistry } from "../game/registry.ts";
import { replayMode } from "../mlb/replay.ts";

/**
 * A replay server has exactly one recorded game. Without this guard every
 * gamePk would resolve to that same recording — the schedule would look
 * normal and every game would open the same one.
 */
function assertServable(gamePk: number): void {
	if (replayMode && gamePk !== replayMode.gamePk) {
		throw new ORPCError("NOT_FOUND", {
			message: `Replaying fixture "${replayMode.label}", which only contains game ${replayMode.gamePk}.`,
		});
	}
}

const GameInput = z.object({ gamePk: z.coerce.number().int().positive() });

export const gameRouter = {
	/**
	 * Current state without subscribing. Returns null if no watcher is running
	 * for this game — callers who need state should subscribe instead.
	 */
	snapshot: os
		.input(GameInput)
		.handler(({ input }): GameSnapshot | null => {
			assertServable(input.gamePk);
			return gameRegistry.getSnapshot(input.gamePk);
		}),

	/**
	 * Live game stream. Yields one snapshot, then deltas.
	 *
	 * This is an oRPC event iterator, so it runs over the same WebSocket as
	 * every other call. `signal` aborts when the client disconnects, which
	 * ends the iterator and releases the registry's reference to the watcher.
	 */
	subscribe: os.input(GameInput).handler(async function* ({ input, signal }): AsyncGenerator<GameEvent> {
		assertServable(input.gamePk);
		yield* gameRegistry.subscribe(input.gamePk, signal);
	}),
};
