import { battingRouter } from "./procedures/batting.ts";
import { gameRouter } from "./procedures/game.ts";
import { scheduleRouter } from "./procedures/schedule.ts";
import { systemRouter } from "./procedures/system.ts";

export const router = {
	batting: battingRouter,
	game: gameRouter,
	schedule: scheduleRouter,
	system: systemRouter,
};

export type Router = typeof router;
