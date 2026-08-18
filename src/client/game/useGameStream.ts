import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { client, isSocketConnected, onConnectionChange } from "../rpc/client.ts";
import { GameStore, type GameStoreState } from "./store.ts";

export interface UseGameStreamResult extends GameStoreState {
	setDelayMs: (delayMs: number) => void;
	setPaused: (paused: boolean) => void;
	calibrateFrom: (pausedAt: number) => void;
	reset: () => void;
}

/**
 * Subscribes to a game's event stream and exposes both the live and the
 * display-delayed view of it.
 *
 * The stream is an oRPC event iterator over the shared WebSocket; aborting the
 * controller on unmount ends it, which is what releases the server-side
 * watcher reference.
 */
export function useGameStream(gamePk: number): UseGameStreamResult {
	const store = useMemo(() => new GameStore(), [gamePk]);
	const storeRef = useRef(store);
	storeRef.current = store;

	const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

	useEffect(() => {
		const controller = new AbortController();
		let cancelled = false;
		let attempt = 0;

		store.setConnected(isSocketConnected());
		const stopWatchingSocket = onConnectionChange(connected => store.setConnected(connected));

		/**
		 * The socket reconnects underneath us, but the *subscription* does not —
		 * a dropped connection ends the iterator, so it has to be re-established.
		 * The server replays a fresh snapshot on resubscribe, which resyncs the
		 * client rather than leaving it stale.
		 */
		async function consume(): Promise<void> {
			while (!cancelled && !controller.signal.aborted) {
				try {
					const stream = await client.game.subscribe({ gamePk }, { signal: controller.signal });
					attempt = 0;
					store.setError(null);

					for await (const event of stream) {
						if (cancelled) return;
						store.push(event);
					}
				} catch (error) {
					if (cancelled || controller.signal.aborted) return;
					store.setError(error instanceof Error ? error : new Error("Game stream failed"));
				}

				if (cancelled || controller.signal.aborted) return;

				// Backoff with jitter so a server restart doesn't bring every open
				// tab back in the same instant.
				attempt += 1;
				const delay = Math.min(500 * 2 ** (attempt - 1), 15_000) + Math.random() * 250;
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}

		void consume();

		return () => {
			cancelled = true;
			stopWatchingSocket();
			controller.abort();
			store.destroy();
		};
	}, [gamePk, store]);

	return {
		...state,
		setDelayMs: delayMs => storeRef.current.setDelayMs(delayMs),
		setPaused: paused => storeRef.current.setPaused(paused),
		calibrateFrom: pausedAt => storeRef.current.calibrateFrom(pausedAt),
		reset: () => storeRef.current.reset(),
	};
}
