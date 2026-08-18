// Fixtures are committed gzipped (7MB raw -> 1.1MB) and inflated on read.
// Regenerate with: bun run record-fixture <gamePk> <label>
import { GumboFeed } from "../src/server/mlb/schemas/gumbo.ts";
import { SavantGameFeed } from "../src/server/mlb/schemas/savant.ts";

const dir = new URL("./fixtures/", import.meta.url).pathname;

async function readJsonGz(name: string): Promise<unknown> {
	const compressed = await Bun.file(`${dir}${name}.json.gz`).bytes();
	return JSON.parse(new TextDecoder().decode(Bun.gunzipSync(compressed)));
}

/** `final` is a completed game; `live` is one captured mid-game. */
export type FixtureLabel = "final" | "live";

export async function loadGumboFixture(label: FixtureLabel) {
	return GumboFeed.parse(await readJsonGz(`${label}.gumbo`));
}

export async function loadSavantFixture(label: FixtureLabel) {
	return SavantGameFeed.parse(await readJsonGz(`${label}.savant`));
}
