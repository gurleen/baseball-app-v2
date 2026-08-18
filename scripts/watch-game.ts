// End-to-end check of the live stream with no browser involved: connects to a
// running server over the WebSocket and prints events as they arrive.
//
//   bun run scripts/watch-game.ts <gamePk> [--url ws://localhost:3030/ws]
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";

import type { Router } from "../src/server/router.ts";
import type { GameEvent } from "../src/shared/events.ts";

const gamePk = Number(process.argv[2]);
if (!Number.isFinite(gamePk)) {
	console.error("usage: bun run scripts/watch-game.ts <gamePk> [--url <ws url>]");
	process.exit(1);
}

const urlFlag = process.argv.indexOf("--url");
const url = urlFlag === -1 ? "ws://localhost:3030/ws" : process.argv[urlFlag + 1]!;

const websocket = new WebSocket(url);
await new Promise<void>((resolve, reject) => {
	websocket.addEventListener("open", () => resolve(), { once: true });
	websocket.addEventListener("error", () => reject(new Error(`could not connect to ${url}`)), { once: true });
});

const client: RouterClient<Router> = createORPCClient(new RPCLink({ websocket }));

console.log(`subscribed to ${gamePk} via ${url}\n`);

const counts = new Map<GameEvent["t"], number>();

for await (const event of await client.game.subscribe({ gamePk })) {
	counts.set(event.t, (counts.get(event.t) ?? 0) + 1);

	switch (event.t) {
		case "snapshot": {
			const { state, teams, linescore, plays } = event.snapshot;
			console.log(
				`SNAPSHOT  ${teams.away.abbreviation} ${linescore.away.runs} @ ${teams.home.abbreviation} ${linescore.home.runs}` +
					`  ${state.detail}${state.inning ? ` ${state.halfInning} ${state.inning}` : ""}  ${plays.length} plays`,
			);
			break;
		}
		case "pitch": {
			const { pitch } = event;
			const speed = pitch.velocity ? `${pitch.velocity.start.toFixed(1)} mph` : "no tracking";
			console.log(
				`PITCH     #${pitch.pitchNumber} ${pitch.type?.code ?? "??"} ${speed}  ${pitch.call.name} (${pitch.call.kind})`,
			);
			break;
		}
		case "pitchMetrics": {
			const batted = event.metrics.battedBall;
			const swing = event.metrics.swing;
			console.log(
				`METRICS   ${event.playId.slice(0, 8)}  ` +
					(batted
						? `EV ${batted.exitVelocity ?? "-"} LA ${batted.launchAngle ?? "-"} dist ${batted.distance ?? "-"} xBA ${batted.xba ?? "-"}`
						: `bat speed ${swing?.batSpeed ?? "-"}`),
			);
			break;
		}
		case "play":
			console.log(`PLAY      [${event.play.scorecard ?? "-"}] ${event.play.description}`);
			break;
		case "state":
			console.log(`STATE     ${event.state.detail} ${event.state.count.balls}-${event.state.count.strikes}, ${event.state.outs} out`);
			break;
		case "linescore":
			console.log(`LINESCORE ${event.linescore.away.runs}-${event.linescore.home.runs}`);
			break;
		case "heartbeat":
			console.log("HEARTBEAT");
			break;
		default:
			console.log(event.t.toUpperCase());
	}
}

console.log("\nstream ended:", Object.fromEntries(counts));
