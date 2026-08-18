import type { WatcherDeps } from "../game/watcher.ts";
import type { ScheduleGame } from "../procedures/schedule.ts";
import { GumboFeed as GumboFeedSchema, type GumboFeed } from "./schemas/gumbo.ts";
import { SavantGameFeed } from "./schemas/savant.ts";
import { toScheduleGameFromGumbo } from "../transform/schedule.ts";

/**
 * Feed implementations backed by recorded fixtures instead of MLB.
 *
 * Two uses: running the app out of season or offline, and integration tests
 * that need the real server without the real network. Enabled with
 * BASEBALL_REPLAY=<label>, where the label names a pair under test/fixtures/.
 *
 * A replay serves exactly one game — the one in the fixture. The schedule is
 * narrowed to that game and any other gamePk is rejected, so the app stays
 * self-consistent rather than showing a full slate of games that all open the
 * same recording.
 *
 * Replay starts the game rewound by `rewindPlays` at-bats and advances one
 * at-bat per poll, so the delta path — new pitches, completed plays, changing
 * state — actually exercises rather than serving one static snapshot. Once the
 * fixture is exhausted the game sits at its recorded end state.
 */
export interface ReplayOptions {
	label: string;
	rewindPlays?: number;
	fixturesDir?: string;
}

export interface ReplayMode {
	label: string;
	/** The only gamePk this server can serve. */
	gamePk: number;
	deps: Partial<WatcherDeps>;
	/** The single entry the schedule reports while replaying. */
	scheduleGame: ScheduleGame;
}

async function readJsonGz(path: string): Promise<unknown> {
	const compressed = await Bun.file(path).bytes();
	return JSON.parse(new TextDecoder().decode(Bun.gunzipSync(compressed)));
}

export async function createReplayMode(options: ReplayOptions): Promise<ReplayMode> {
	const dir = options.fixturesDir ?? new URL("../../../test/fixtures/", import.meta.url).pathname;
	const rewind = options.rewindPlays ?? 30;

	const feed = GumboFeedSchema.parse(await readJsonGz(`${dir}${options.label}.gumbo.json.gz`));
	const savant = SavantGameFeed.parse(await readJsonGz(`${dir}${options.label}.savant.json.gz`));

	const allPlays = feed.liveData.plays.allPlays;
	let cursor = Math.max(0, allPlays.length - rewind);

	function feedAt(count: number): GumboFeed {
		const plays = allPlays.slice(0, count);
		const last = plays.at(-1);

		return {
			...feed,
			liveData: {
				...feed.liveData,
				plays: {
					...feed.liveData.plays,
					allPlays: plays,
					// Treat the newest at-bat as the one in progress, so the
					// currentPlay path is exercised too.
					currentPlay: last && !last.about.isComplete ? last : undefined,
				},
			},
		};
	}

	return {
		label: options.label,
		gamePk: feed.gamePk,
		scheduleGame: toScheduleGameFromGumbo(feed),
		deps: {
			fetchGumbo: async () => feedAt(cursor),
			fetchGumboDiff: async () => {
				cursor = Math.min(cursor + 1, allPlays.length);
				// The full-feed fallback shape: everything except `copyright`.
				const { copyright: _copyright, ...rest } = feedAt(cursor);
				return rest;
			},
			fetchSavant: async () => savant,
		},
	};
}

/** Resolved once at startup from BASEBALL_REPLAY; null when running live. */
export const replayMode: ReplayMode | null = process.env.BASEBALL_REPLAY
	? await createReplayMode({
			label: process.env.BASEBALL_REPLAY,
			rewindPlays: process.env.BASEBALL_REPLAY_REWIND
				? Number(process.env.BASEBALL_REPLAY_REWIND)
				: undefined,
		})
	: null;
