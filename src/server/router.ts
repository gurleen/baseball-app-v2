import { gameRouter } from "./procedures/game.ts";
import { scheduleRouter } from "./procedures/schedule.ts";
import { systemRouter } from "./procedures/system.ts";

export const router = {
	game: gameRouter,
	schedule: scheduleRouter,
	system: systemRouter,
};

export type Router = typeof router;
