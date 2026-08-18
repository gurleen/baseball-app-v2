// Records a GUMBO + Savant pair for a gamePk into test/fixtures/, so the
// transform layer can be developed and tested with no network access.
//
//   bun run scripts/record-fixture.ts <gamePk> [label]
import { getMlbGameFeed } from "../src/server/mlb/gumbo.ts";
import { getSavantGameFeed } from "../src/server/mlb/savant.ts";

const gamePk = process.argv[2];
if (!gamePk) {
	console.error("usage: bun run scripts/record-fixture.ts <gamePk> [label]");
	process.exit(1);
}
const label = process.argv[3] ?? gamePk;
const dir = new URL("../test/fixtures/", import.meta.url).pathname;

console.log(`fetching gumbo for ${gamePk}...`);
const gumbo = await getMlbGameFeed(gamePk);
await Bun.write(`${dir}${label}.gumbo.json.gz`, Bun.gzipSync(new TextEncoder().encode(JSON.stringify(gumbo))));

console.log(`fetching savant for ${gamePk}...`);
const savant = await getSavantGameFeed(gamePk);
await Bun.write(`${dir}${label}.savant.json.gz`, Bun.gzipSync(new TextEncoder().encode(JSON.stringify(savant))));

const pitches = [...savant.team_home, ...savant.team_away];
console.log(
	`wrote ${label}: gumbo status=${gumbo.gameData.status.detailedState} plays=${gumbo.liveData.plays.allPlays.length}; ` +
		`savant pitches=${pitches.length} bip=${savant.exit_velocity.length}`,
);
