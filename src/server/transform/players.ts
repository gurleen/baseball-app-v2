import type { Boxscore, GumboFeed } from "../mlb/schemas/gumbo.ts";
import type { Handedness, PlayerProfile } from "../../shared/models.ts";

/** GUMBO keys player maps as "ID683002"; the client gets plain numbers. */
export function parsePlayerKey(key: string): number | null {
	const id = Number.parseInt(key.replace(/^ID/, ""), 10);
	return Number.isFinite(id) ? id : null;
}

function toHandedness(code: string | undefined): Handedness | null {
	return code === "L" || code === "R" || code === "S" ? code : null;
}

/**
 * Flattens gameData.players into a numeric-keyed map, enriched with the
 * jersey number and in-game position from the boxscore (gameData.players
 * carries only the player's *primary* position, not what they played today).
 */
export function toPlayers(feed: GumboFeed): Record<number, PlayerProfile> {
	const boxscoreEntries = collectBoxscorePlayers(feed.liveData.boxscore);
	const players: Record<number, PlayerProfile> = {};

	for (const [key, person] of Object.entries(feed.gameData.players)) {
		const id = parsePlayerKey(key);
		if (id === null) continue;

		const boxscore = boxscoreEntries.get(id);

		players[id] = {
			id,
			fullName: person.fullName,
			useName: person.useName,
			lastName: person.lastName,
			shortName: person.boxscoreName,
			jerseyNumber: boxscore?.jerseyNumber || person.primaryNumber || null,
			position: boxscore?.position?.abbreviation ?? person.primaryPosition.abbreviation ?? null,
			batSide: toHandedness(person.batSide.code),
			pitchHand: toHandedness(person.pitchHand.code),
		};
	}

	return players;
}

function collectBoxscorePlayers(boxscore: Boxscore) {
	const byId = new Map<number, Boxscore["teams"]["home"]["players"][string]>();

	for (const side of [boxscore.teams.home, boxscore.teams.away]) {
		for (const [key, entry] of Object.entries(side.players)) {
			const id = parsePlayerKey(key);
			if (id !== null) byId.set(id, entry);
		}
	}

	return byId;
}
