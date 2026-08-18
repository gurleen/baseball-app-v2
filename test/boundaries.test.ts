import { describe, expect, test } from "bun:test";
import { Glob } from "bun";

const root = new URL("../src/", import.meta.url).pathname;

async function sourcesUnder(dir: string): Promise<Array<{ path: string; text: string }>> {
	const glob = new Glob("**/*.{ts,tsx}");
	const files: Array<{ path: string; text: string }> = [];

	for await (const relative of glob.scan({ cwd: `${root}${dir}` })) {
		if (relative.endsWith("routeTree.gen.ts")) continue;
		files.push({
			path: `${dir}/${relative}`,
			text: await Bun.file(`${root}${dir}/${relative}`).text(),
		});
	}

	return files;
}

describe("module boundaries", () => {
	test("client never imports raw MLB feed schemas", async () => {
		// The whole point of the transform layer is that GUMBO's shape stops at
		// the server. If this fails, a feed change can reach a component.
		const offenders = (await sourcesUnder("client"))
			.filter(file => /from\s+["'][^"']*(server\/mlb|mlb\/schemas)/.test(file.text))
			.map(file => file.path);

		expect(offenders).toEqual([]);
	});

	test("client only ever imports *types* from the server", async () => {
		// `import type { Router }` is how oRPC gives the client end-to-end types;
		// it is erased at build time. A value import would pull the watcher,
		// the MLB clients and their poll loops into the browser bundle.
		const offenders: string[] = [];

		for (const file of await sourcesUnder("client")) {
			const imports = file.text.matchAll(/^import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gm);

			for (const [, typeOnly, specifier] of imports) {
				if (!specifier?.includes("/server/")) continue;
				if (!typeOnly) offenders.push(`${file.path} -> ${specifier}`);
			}
		}

		expect(offenders).toEqual([]);
	});

	test("shared models stay free of feed and framework dependencies", async () => {
		for (const file of await sourcesUnder("shared")) {
			expect(file.text).not.toMatch(/from\s+["'][^"']*(server|client)\//);
			expect(file.text).not.toMatch(/from\s+["'](react|zod|@tanstack|@orpc)/);
		}
	});
});
