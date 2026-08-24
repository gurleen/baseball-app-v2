import { RPCHandler as FetchRPCHandler } from "@orpc/server/fetch";
import { RPCHandler as BunWsRPCHandler } from "@orpc/server/bun-ws";

import index from "../index.html";
import { gameRegistry } from "./game/registry.ts";
import { router } from "./router.ts";

const port = Number(process.env.PORT ?? 3030);
const isDev = process.env.NODE_ENV !== "production";

// Two adapters over one router. The WebSocket handler carries everything the
// live game page needs — including the `game.subscribe` event iterator — while
// the fetch handler covers plain request/response calls (and anything that
// runs before the socket is open).
const wsHandler = new BunWsRPCHandler(router);
const httpHandler = new FetchRPCHandler(router);

const server = Bun.serve({
	port,
	hostname: "0.0.0.0",
	routes: {
		"/": index,
		"/game/*": index,
		"/batting": index,
	},
	async fetch(request, server) {
		const url = new URL(request.url);

		if (url.pathname === "/ws") {
			if (server.upgrade(request)) return undefined;
			return new Response("WebSocket upgrade failed", { status: 400 });
		}

		if (url.pathname === "/health") {
			return Response.json({ ok: true, watchers: gameRegistry.stats() });
		}

		const result = await httpHandler.handle(request, { prefix: "/rpc" });
		if (result.matched) return result.response;

		return new Response("Not Found", { status: 404 });
	},
	websocket: {
		message: (ws, message) => wsHandler.message(ws, message),
		close: ws => wsHandler.close(ws),
	},
	development: isDev
		? {
				hmr: true,
				console: true,
			}
		: false,
});

// Stop the poll loops on shutdown rather than leaving upstream requests in
// flight against MLB.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		gameRegistry.stopAll();
		void server.stop(true).then(() => process.exit(0));
	});
}

console.log(`listening on ${server.url}`);
