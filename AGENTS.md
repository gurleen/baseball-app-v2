# baseball-app

Live MLB game viewer. One Bun process polls each watched game **once** and fans
clean, typed deltas out to every subscriber over a WebSocket — replacing the
previous app's per-viewer polling of statsapi.

## Commands

```sh
bun run dev          # web on :3000 (Vite), /rpc + /ws + /health on :3030
bun run dev:replay   # same, but watchers replay a recorded fixture (no network)
bun run routes       # tsr watch — regenerates routeTree.gen.ts from src/client/routes
bun test
bun run typecheck
bun run build        # vite build -> dist/, which `bun run start` then serves
```

Utilities: `bun run record-fixture <gamePk> <label>`, `bun run check-join <label>`,
`bun run validate-gumbo <file.json>`, `bun run watch-game <gamePk>` (CLI stream consumer).

## Architecture

```
src/shared/     domain models + the GameEvent union — the only code both sides import
src/server/
  mlb/          raw feed clients and zod schemas (GUMBO, schedule, Savant)
  transform/    raw feed -> shared models. Pure, no clock, no network.
  game/         watcher (polling + diffing), registry (ref-counting), emitter (fanout)
  procedures/   oRPC router
src/client/
  routes/       TanStack Router file-based routes
  game/         store (delay buffer), reducer, adapters onto @hydra-tv/sports
```

**The boundary that matters:** raw GUMBO/Savant schemas live only in
`src/server/mlb/schemas/` and never reach the client. The client imports
`src/shared/` plus the router *type*. `test/boundaries.test.ts` enforces this —
a value import from `src/server/` fails the suite.

**Data flow.** `GameWatcher` polls GUMBO (2s live) and Savant (12s live),
rebuilds a `GameSnapshot`, and diffs it against the previous one to emit deltas.
The client reduces those deltas back into a snapshot;
`server/transform/diff.ts` and `client/game/reducer.ts` are mirrors, and the
round-trip is tested. `GameRegistry` ref-counts subscribers so one game means
one poll loop no matter how many viewers; `GET /health` reports per-game fetch
counts so that property stays checkable.

**Display delay.** `client/game/store.ts` keeps two views — `live` and
`displayed` — and holds events back so the page can be lined up with a TV
broadcast that lags the data feed. Calibrate in the game's SETTINGS tab.

## Gotchas

- **Pin TanStack Router.** `@tanstack/router-core` >= 1.171.18 has an ESM cycle
  Bun's bundler mishandles (`Cannot read properties of null (reading
  'replaceRouteChunk')`). `react-router` is pinned to 1.170.18 with an
  `overrides` entry forcing router-core 1.171.15. Typecheck and build both pass
  when this breaks — only loading the page catches it.
- **Vite owns the client bundle in dev *and* production.** `bun run build` is
  `vite build`; the Bun server serves `dist/` with a catch-all SPA fallback, so
  a new route needs no entry in `src/server/index.ts` — only the route file and
  `bun run routes`. Port 3030 no longer serves the UI in dev; Vite does, on 3000.
- **Pin `monaco-editor` to 0.54.0 (exact).** From 0.56.0 its `exports` map
  rewrites every subpath through `esm/vs/`, so the deep specifiers
  `monaco-sql-languages` hardcodes (`monaco-editor/esm/vs/editor/editor.api`,
  `…/editor.worker.js`) resolve to `esm/vs/esm/vs/…` and don't exist. 0.54.0 has
  no `exports` field and is what monaco-sql-languages itself builds against.
  `bun run typecheck` catches this one; the browser wouldn't.
- **Import Monaco by its bare specifier** (`import * as monaco from "monaco-editor"`).
  That resolves to `editor.main.js`, which patches `editor.createWebWorker` to
  accept the legacy `{moduleId, label, createData}` call that
  monaco-sql-languages' worker manager makes. Importing
  `monaco-editor/esm/vs/editor/editor.api` directly skips the patch and the SQL
  worker silently never starts.
- **Never import from the `monaco-sql-languages` root for values.** Its
  `esm/main.js` re-exports `EntityContextType` from `dt-sql-parser`, which drags
  the 4MB ANTLR grammar onto the main thread — it belongs in the worker. Deep
  import `esm/setupLanguageFeatures.js` / `esm/common/constants.js` instead.
  Symptom is a bloated `CustomQueryPage` chunk, not an error.
- **Monaco must not sit in normal flow.** Its `lines-content` is sized to 2^24px
  and it measures its own container, so an in-flow container makes the whole
  page scroll sideways on a phone. `SqlEditor` absolute-fills a `position:
  relative` wrapper for exactly this reason.
- **Savant `no_pitch` rows carry no `play_id`** (replay-review automatic strikes,
  timer violations) and are dropped when indexing. Batted-ball fields are
  string-encoded; bat speed appears on *any* swing including check swings, which
  is why `PitchMetrics` splits `swing` from `battedBall`.
- **Grid items default to `min-width: auto`** and will push the page sideways
  rather than shrink. Use the helpers in `client/lib/layout.ts`.
- **`@hydra-tv/sports` bans the tally colors** (`--tally-pgm` red,
  `--tally-pvw` green) — they mean program/preview in that design system. Use
  `--ch-1..4` / `--info` / `--warn` for data, and don't override them.

## Replay mode

`BASEBALL_REPLAY=<label>` serves **one** game — the one in the fixture. The
schedule is narrowed to that game and any other gamePk is rejected with an
explanation, because a blanket replay would make every game on the schedule
open the same recording. The nav bar shows a REPLAY badge whenever it is on.

`BASEBALL_REPLAY_REWIND` (default 30) sets how many at-bats to rewind before
advancing one per poll — that is also the replay's runway, about a minute at
the live 2s cadence.

## Fixtures

Committed gzipped under `test/fixtures/` (7MB raw -> 1.1MB), read through
`test/fixtures.ts`. `live` is an in-progress game, `final` a completed one — the
live one is the more valuable of the two, since it exposes feed shapes a
finished game never shows.
