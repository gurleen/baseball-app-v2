# baseball-app

Live MLB game viewer. One Bun process polls each watched game **once** and fans
clean, typed deltas out to every subscriber over a WebSocket — replacing the
previous app's per-viewer polling of statsapi.

## Commands

```sh
bun run dev          # app + /rpc + /ws on :3030
bun run dev:replay   # same, but watchers replay a recorded fixture (no network)
bun run routes       # tsr watch — regenerates routeTree.gen.ts from src/client/routes
bun test
bun run typecheck
bun run build        # production bundle -> dist/
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
- **`bun build` (CLI) has no `--plugin` flag** and bunfig's plugin list only
  applies to the dev server, so production builds go through `scripts/build.ts`.
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
