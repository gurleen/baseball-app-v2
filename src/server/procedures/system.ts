import { os } from "@orpc/server";

import { replayMode } from "../mlb/replay.ts";

export const systemRouter = {
	/**
	 * What this server is serving. The client badges the UI when replaying, so
	 * recorded data is never mistaken for a live game.
	 */
	info: os.handler(() => ({
		replay: replayMode ? { label: replayMode.label, gamePk: replayMode.gamePk } : null,
	})),
};
