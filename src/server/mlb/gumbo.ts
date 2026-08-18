import { z } from "zod";

import { MlbClient } from "./client";
import { GumboFeed } from "./schemas/gumbo";

const GUMBO_BASE_URL = "https://ws.statsapi.mlb.com/api/v1.1";
export const DEFAULT_GUMBO_LANGUAGE = "en";

const gumboClient = new MlbClient({
	baseUrl: GUMBO_BASE_URL,
});

export interface MlbGameFeedQuery {
	language?: string;
	signal?: AbortSignal;
}

export const JsonPatchOperation = z.object({
	op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
	path: z.string(),
	from: z.string().optional(),
	value: z.unknown().optional(),
});

export type JsonPatchOperation = z.infer<typeof JsonPatchOperation>;

export const MlbGameFeedDiffPatchEntry = z.object({
	diff: z.array(JsonPatchOperation),
});

export const MlbGameFeedDiffPatch = z.array(MlbGameFeedDiffPatchEntry);
export const MlbGameFeedDiffPatchFallback = GumboFeed.omit({ copyright: true });
export const MlbGameFeedDiffPatchResponse = z.union([MlbGameFeedDiffPatch, MlbGameFeedDiffPatchFallback]);
export type MlbGameFeedDiffPatchEntry = z.infer<typeof MlbGameFeedDiffPatchEntry>;
export type MlbGameFeedDiffPatch = z.infer<typeof MlbGameFeedDiffPatch>;
export type MlbGameFeedDiffPatchFallback = z.infer<typeof MlbGameFeedDiffPatchFallback>;
export type MlbGameFeedDiffPatchResponse = z.infer<typeof MlbGameFeedDiffPatchResponse>;

export interface MlbGameFeedDiffPatchQuery extends MlbGameFeedQuery {
	startTimecode: string;
	pushUpdateId: string;
}

export function getMlbGameFeed(gameId: number | string, query: MlbGameFeedQuery = {}) {
	const { signal, language = DEFAULT_GUMBO_LANGUAGE } = query;

	return gumboClient.request({
		path: `/game/${gameId}/feed/live`,
		params: { language },
		schema: GumboFeed,
		signal,
	});
}

export function getMlbGameFeedDiffPatch(gameId: number | string, query: MlbGameFeedDiffPatchQuery) {
	const {
		signal,
		language = DEFAULT_GUMBO_LANGUAGE,
		startTimecode,
		pushUpdateId,
	} = query;

	return gumboClient.request({
		path: `/game/${gameId}/feed/live/diffPatch`,
		params: {
			language,
			startTimecode,
			pushUpdateId,
		},
		schema: MlbGameFeedDiffPatchResponse,
		signal,
	});
}
