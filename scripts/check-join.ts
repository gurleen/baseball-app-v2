// Sanity-checks the GUMBO <-> Savant join for a recorded fixture pair.
//   bun run scripts/check-join.ts <label>
import { indexSavantPitches } from "../src/server/mlb/schemas/savant.ts";
import { loadGumboFixture, loadSavantFixture, type FixtureLabel } from "../test/fixtures.ts";

const label = (process.argv[2] ?? "final") as FixtureLabel;

const gumbo = await loadGumboFixture(label);
const savant = await loadSavantFixture(label);

const gumboIds = new Set<string>();
for (const play of gumbo.liveData.plays.allPlays) {
	for (const event of play.playEvents) {
		if (event.isPitch && event.playId) gumboIds.add(event.playId);
	}
}

const savantIndex = indexSavantPitches(savant);
const savantIds = new Set(savantIndex.keys());
const matched = [...gumboIds].filter(id => savantIds.has(id));
const withMetrics = [...savantIndex.values()].filter(row => row.hit_speed !== null).length;

console.log(`[${label}] status=${gumbo.gameData.status.detailedState}`);
console.log(`  gumbo pitches   ${gumboIds.size}`);
console.log(`  savant pitches  ${savantIds.size}`);
console.log(`  matched         ${matched.length}`);
console.log(`  gumbo-only      ${[...gumboIds].filter(id => !savantIds.has(id)).length}`);
console.log(`  savant-only     ${[...savantIds].filter(id => !gumboIds.has(id)).length}`);
console.log(`  with batted-ball metrics ${withMetrics}`);
