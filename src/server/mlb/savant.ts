import { MlbClient } from "./client";
import { SavantGameFeed } from "./schemas/savant";

const SAVANT_BASE_URL = process.env.SAVANT_BASE_URL ?? "https://baseballsavant.mlb.com";

// The gf payload is ~3MB and has no delta endpoint, so it gets a longer
// timeout than statsapi and is fetched far less often than GUMBO.
const SAVANT_TIMEOUT_MS = 30_000;

const savantClient = new MlbClient({
	baseUrl: SAVANT_BASE_URL,
	timeoutMs: SAVANT_TIMEOUT_MS,
});

export interface SavantGameFeedQuery {
	signal?: AbortSignal;
}

/**
 * Full Statcast game feed. Every row carries `play_id`, the same GUID GUMBO
 * puts on `playEvent.playId`, which is how the two feeds are merged.
 */
export function getSavantGameFeed(gamePk: number | string, query: SavantGameFeedQuery = {}) {
	return savantClient.request({
		path: "/gf",
		params: { game_pk: gamePk },
		schema: SavantGameFeed,
		signal: query.signal,
		init: {
			// Savant serves a bot-check page to clients without a browser UA.
			headers: { "User-Agent": "Mozilla/5.0 (compatible; baseball-app/1.0)" },
		},
	});
}
