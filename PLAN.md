# Batting Leaders Page

Add a batting stats leaders page, linked from the nav bar as **BATTING**, backed
by a new oRPC procedure that reads `batting_stats_season`.

## Data

- `battingStatsSeason` (`src/server/db/schema.ts:299`) is keyed by
  (`batterPk`, `season`) and has no club — it's one row per player-season
  even if the player was traded.
- Club(s) for a player-season come from `plays` (`battingClubPk`, `batterPk`,
  `season`): `SELECT DISTINCT batting_club_pk FROM plays WHERE batter_pk = ?
  AND season = ?`. Join distinct club count against `clubsHistory`
  (`clubPk`, `season`, `abbreviation`) — season-scoped so an abbreviation is
  correct even for relocated/renamed franchises.
  - 1 club → that club's `abbreviation`.
  - N clubs (N > 1) → `NTM` (e.g. `2TM`), matching the existing "traded
    player" convention. No need to list which clubs.
- Player name comes from `people` (`firstName`, `lastName`) via `batterPk`.
- `qualified` is already a boolean column on `battingStatsSeason` — filter on
  it directly, no need to recompute PA thresholds.

## Server

**`src/server/procedures/batting.ts`** (new)

- `battingRouter.leaders` — `os.input({ season, qualifiedOnly? }).handler(...)`
- Input: `z.object({ season: z.number().int(), qualifiedOnly: z.boolean().optional() })`
- Query plan:
  1. Select from `battingStatsSeason` filtered by `season` (and `qualified`
     when `qualifiedOnly`), joined to `people` for the name.
  2. Separately aggregate `plays` grouped by `batterPk` for the same season
     to get `COUNT(DISTINCT battingClubPk)` and (when count = 1) the single
     `battingClubPk`; join `clubsHistory` on `(clubPk, season)` for the
     abbreviation.
  3. Merge in the handler (or via a single SQL query with a CTE/window —
     prefer one query with drizzle `sql` if it stays readable) into one row
     per player: `{ batterPk, name, club, pa, ab, h, singles, doubles,
     triples, homeRuns, bb, ibb, hbp, so, sf, sh, tb, avg, obp, slg, ops,
     bbPct, kPct, bbK, iso, babip, woba, wrcPlus, qualified }`.
  4. Also expose a `seasons` query (or reuse `distinct season` from
     `battingStatsSeason`) so the client can populate the year dropdown
     without hardcoding a range.
- Register `battingRouter` in `src/server/router.ts` as `batting`.

## Client

**`src/client/routes/batting.tsx`** (new file-based route, path `/batting`)

- `validateSearch`: `{ season?: number; qualified?: boolean }` (zod), mirrors
  the `date` pattern in `index.tsx`.
- Layout: left sidebar (filters) + main content (table), similar split to
  `NavBar`/`SideNav` usage elsewhere in `@hydra-tv/ui`.
  - Sidebar: `Select` for season (options from `batting.seasons`), `Checkbox`
    labeled "Qualified" bound to `qualified` search param.
  - Main: `DataGrid` (or a plain table, matching `StatTable.tsx`'s existing
    pattern if it's closer to what's needed) with columns:
    - Name, Club, PA, AB, H, HR, BB — basic counting stats (also include SO
      as a common counting stat)
    - AVG, OBP, SLG, OPS, BB%, K%, BB/K, ISO, BABIP, wOBA, wRC+ — rate stats
  - Default season: most recent available (max of `seasons` list).
  - Loading/empty states follow the pattern in `index.tsx` (`Spinner`,
    `Panel`).

**`src/client/routes/__root.tsx`**

- Add a `BATTING` link into `NavBar`'s `children` slot (nav links area),
  using `Link to="/batting"`, matching the existing brand `Link` styling.

## Out of scope (confirmed with user before building further)

- Column picking, pagination, additional filter types (team, min PA
  override) beyond the year + qualified checkbox specified.
- Sorting was originally out of scope but was added afterward — see
  "Implementation notes" below; the approach it landed on doesn't use
  DataGrid at all.
- Pitching leaders page (structurally similar, not requested here).

## Implementation notes (as built)

Batting leaders shipped across four commits: the page itself, a mobile
stacking fix, click-to-sort columns, and an iOS overscroll fix. A few things
diverged from the plan above or are easy to get wrong — worth reading before
copying this for pitching.

### Table: not DataGrid

The plan assumed `@hydra-tv/ui`'s `DataGrid`. That's what shipped first, but
**DataGrid's column headers are plain, non-interactive `<span>`s — there's no
`onClick`/`onSort` hook** (checked the compiled source, not just the `.d.ts`).
When sorting was requested afterward, DataGrid was replaced entirely with a
plain `<table>` styled via `src/client/lib/table.ts`'s `table`/`th`/`td`/
`numeric`/`stripedRow` exports (the same primitives `StatTable.tsx` uses),
driven by `@tanstack/react-table` for headless sort state. If you're building
the pitching page from scratch, skip DataGrid and start with this table
pattern directly — see `src/client/routes/batting.tsx` in full.

**`@tanstack/react-table` version trap:** `bun add @tanstack/react-table`
installs v9 by default, which is a from-scratch rewrite (no `useReactTable`,
no `getCoreRowModel`/`getSortedRowModel` exports, different everything). The
stable API used here — `createColumnHelper`, `useReactTable`,
`getCoreRowModel`, `getSortedRowModel`, `flexRender`, `SortingState` — is v8.
Install with `bun add @tanstack/react-table@^8` (already a dependency now,
pinned `^8.21.3`, so pitching just imports the same package).

Sort mechanics worth reusing as-is:
- `useState<SortingState>([{ id: "pa", desc: true }])` (or the pitching
  equivalent's headline counting stat) as the default sort, so the initial
  view matches what the server already returns.
- Numeric-stat columns pass an explicit `sortingFn` that treats `null` as
  `-Infinity` (`sortNullable` in batting.tsx) — several rate stats are
  genuinely `NULL` upstream (e.g. `wrcPlus` for most rows), and the default
  comparator does the wrong thing with `null`.
- Header `<th>` gets `onClick={header.column.getToggleSortingHandler()}`,
  `aria-sort`, `position: sticky; top: 0`, and a fixed-width arrow indicator
  span so clicking doesn't reflow neighboring columns.
- `alignFor(columnId)` (name/club left, everything else right) — a plain
  `Set` lookup, not per-column config, since only two columns are ever left.

### Mobile layout

- The sidebar+table split **must** be a Tailwind className
  (`grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]`), not an inline
  `gridTemplateColumns` style — inline styles can't be responsive, and that
  was the original mobile bug (sidebar and table rendered side-by-side at
  every width, squeezing the table to a sliver).
- The table's scroll region height is also breakpoint-dependent:
  `h-[60vh] lg:h-[calc(100vh-140px)]` as a className on the wrapping div
  (not on the table itself) — same reasoning, inline `height` can't respond
  to breakpoints.
- That wrapper also needs `overscrollBehavior: "contain"` — without it, iOS
  Safari lets you drag the scroll region past its own content bounds,
  rubber-banding on both axes and briefly showing blank background, and lets
  the drag chain up to the page scroll.
- Verify responsive rules actually compiled by grepping the built CSS
  (`curl .../_bun/asset/<hash>.css`) for the `lg\:` class and its
  `@media (width >= 64rem)` block — Tailwind class strings are easy to typo
  silently (no error, class just never matches).

### Server query

`battingStatsSeason` (and by extension `pitchingStatsSeason`) has no club
column — it's `pgView`, keyed only by `(batterPk|pitcherPk, season)`. Club is
derived from `plays` via a CTE:
```
count(distinct battingClubPk)::int as club_count,
min(battingClubPk)::int as single_club_pk
```
grouped by `batterPk`, filtered to the season, then left-joined back;
`clubsHistory` is joined on `(clubPk, season)` (not a bare `clubPk` join —
abbreviations are season-scoped for relocated/renamed franchises). Cast the
raw `sql<number>` CTE columns to `::int` explicitly — without it the
driver's bigint handling is inconsistent and comparisons/joins can silently
misbehave. For pitching, swap `batterPk`→`pitcherPk` and
`battingClubPk`→`pitchingClubPk` in that CTE; everything else (the
`clubCount === 1 ? abbreviation : `${clubCount}TM`` mapping) is identical.

`numeric()` Postgres columns come back from drizzle as **strings**, not
numbers (`avg: "0.204"`) — every rate stat needs the `toNumber()` conversion
in the handler before it reaches the client, or client-side sorting and
`.toFixed()` calls silently do string things instead of math.

`pitchingStatsSeason` (`src/server/db/schema.ts:89`) columns for reference:
`pitcherPk, season, pa, ip, outs, h, singles, doubles, triples, homeRuns, bb,
ibb, hbp, so, sf, sh, runs, earnedRuns, era, whip, k9, bb9, hr9, babip, fip,
lobPct, qualified`. No `woba`/`wrcPlus`-style computed-elsewhere fields to
worry about being null — but `qualified` here is IP-based, not PA-based, so
don't reuse the batting qualified copy verbatim.

### Wiring checklist (both easy to forget, no error until you try it)

- Register the new router in `src/server/router.ts`.
- Add the new route's path to `Bun.serve`'s static `routes` map in
  `src/server/index.ts` (alongside `"/"` and `"/game/*"`) — without this, the
  client-side link works fine but a direct load or refresh on `/pitching`
  404s, because that path was never wired to serve the SPA shell.
- Run `bunx tsr generate` after adding the route file so
  `src/client/routeTree.gen.ts` picks it up — it's generated, not
  hand-edited, and `Route.useSearch()`/`useNavigate()` typing depends on it.
- Add the nav link in `src/client/routes/__root.tsx`'s `NavBar` children slot.
