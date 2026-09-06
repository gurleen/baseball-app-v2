import { join, normalize } from "node:path";

import { RPCHandler as FetchRPCHandler } from "@orpc/server/fetch";
import { RPCHandler as BunWsRPCHandler } from "@orpc/server/bun-ws";

import { gameRegistry } from "./game/registry.ts";
import { router } from "./router.ts";

const port = Number(process.env.PORT ?? 3030);
const isDev = process.env.NODE_ENV !== "production";

// Vite owns the client bundle (`bun run build` -> dist/). In dev the frontend
// is served by Vite on its own port and this server only answers /rpc, /ws and
// /health; in production it also serves dist/ with an SPA fallback, so every
// client route works on a hard refresh without being enumerated here.
const distDir = normalize(new URL("../../dist/", import.meta.url).pathname);
const indexHtml = join(distDir, "index.html");

// Two adapters over one router. The WebSocket handler carries everything the
// live game page needs — including the `game.subscribe` event iterator — while
// the fetch handler covers plain request/response calls (and anything that
// runs before the socket is open).
const wsHandler = new BunWsRPCHandler(router);
const httpHandler = new FetchRPCHandler(router);

/**
 * A built asset if the path names one, otherwise index.html so the client
 * router can resolve the URL itself. Returns 404 only when there is no build
 * at all — in dev that is the expected answer, since Vite serves the frontend.
 */
async function serveClient(pathname: string): Promise<Response> {
	// `normalize` collapses any "..", and the prefix check then keeps the
	// resolved path inside dist/ — without it, "/../.env" would escape.
	const requested = normalize(join(distDir, pathname));
	if (requested.startsWith(distDir)) {
		const asset = Bun.file(requested);
		if (await asset.exists()) return new Response(asset);
	}

	const shell = Bun.file(indexHtml);
	if (await shell.exists()) return new Response(shell);

	return new Response(
		isDev ? "No client build. Run `bun run dev:web` for the Vite dev server, or `bun run build`." : "Not Found",
		{ status: 404 },
	);
}

const server = Bun.serve({
	port,
	hostname: "0.0.0.0",
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

		return serveClient(url.pathname);
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
