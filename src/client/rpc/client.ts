import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { RouterClient } from "@orpc/server";

import type { Router } from "../../server/router.ts";
import { ReconnectingSocket } from "./socket.ts";

function websocketUrl(): string {
	const protocol = location.protocol === "https:" ? "wss:" : "ws:";
	return `${protocol}//${location.host}/ws`;
}

/**
 * Connection state, exposed so the UI can show "reconnecting" rather than
 * silently going stale. The socket reconnects on its own; oRPC's link holds
 * this one facade for the life of the page.
 */
const connectionListeners = new Set<(connected: boolean) => void>();
let socketConnected = false;

export function onConnectionChange(listener: (connected: boolean) => void): () => void {
	connectionListeners.add(listener);
	return () => connectionListeners.delete(listener);
}

export function isSocketConnected(): boolean {
	return socketConnected;
}

function setConnected(connected: boolean) {
	socketConnected = connected;
	for (const listener of connectionListeners) listener(connected);
}

export const socket = new ReconnectingSocket({
	url: websocketUrl(),
	onOpen: () => setConnected(true),
	onClose: () => setConnected(false),
});

// One socket serves both plain calls and the live game event iterator.
const link = new RPCLink({ websocket: socket });

export const client: RouterClient<Router> = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
