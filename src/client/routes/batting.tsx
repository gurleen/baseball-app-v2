import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Checkbox, Combobox, Input, Panel, RadioGroup, Spinner } from "@hydra-tv/ui"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table"
import { useState } from "react"
import { z } from "zod"

import { orpc } from "../rpc/client.ts"
import type { BattingLeader } from "../../server/procedures/batting.ts"
import { shrinkable, scrollX } from "../lib/layout.ts"
import { numeric, stripedRow, table, td, th } from "../lib/table.ts"

const searchSchema = z.object({
  seasonFrom: z.number().int().optional(),
  seasonTo: z.number().int().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  inning: z.number().int().optional(),
  halfInning: z.enum(["top", "bottom"]).optional(),
  outsAfter: z.number().int().optional(),
  balls: z.number().int().optional(),
  strikes: z.number().int().optional(),
  battingClubPk: z.number().int().optional(),
  pitchingClubPk: z.number().int().optional(),
  batterHand: z.enum(["L", "R", "B"]).optional(),
  pitcherHand: z.enum(["L", "R"]).optional(),
  qualified: z.boolean().optional(),
})

export const Route = createFileRoute("/batting")({
  validateSearch: searchSchema,
  component: BattingPage,
})

const percent = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 })
const rate = new Intl.NumberFormat("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })

function fmtRate(value: number | null): string {
  if (value === null) return "—"
  // Traditional batting-average style: ".300", not "0.300".
  return rate.format(value).replace(/^0\./, ".").replace(/^-0\./, "-.")
}

function fmtPct(value: number | null): string {
  return value === null ? "—" : percent.format(value)
}

// Nulls (missing upstream data, e.g. wRC+) sort as -Infinity: last in the
// default descending "leaders" view, first if a column is flipped to ascending.
function sortNullable(a: number | null, b: number | null): number {
  return (a ?? -Infinity) - (b ?? -Infinity)
}

type SplitRow = Omit<BattingLeader, "club">

const columnHelper = createColumnHelper<SplitRow>()

const columns = [
  columnHelper.accessor("name", { header: "NAME" }),
  columnHelper.accessor("pa", { header: "PA" }),
  columnHelper.accessor("ab", { header: "AB" }),
  columnHelper.accessor("h", { header: "H" }),
  columnHelper.accessor("homeRuns", { header: "HR" }),
  columnHelper.accessor("bb", { header: "BB" }),
  columnHelper.accessor("so", { header: "SO" }),
  columnHelper.accessor("avg", { header: "AVG", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.avg, b.original.avg) }),
  columnHelper.accessor("obp", { header: "OBP", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.obp, b.original.obp) }),
  columnHelper.accessor("slg", { header: "SLG", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.slg, b.original.slg) }),
  columnHelper.accessor("ops", { header: "OPS", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.ops, b.original.ops) }),
  columnHelper.accessor("bbPct", { header: "BB%", cell: info => fmtPct(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.bbPct, b.original.bbPct) }),
  columnHelper.accessor("kPct", { header: "K%", cell: info => fmtPct(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.kPct, b.original.kPct) }),
  columnHelper.accessor("bbK", { header: "BB/K", cell: info => info.getValue()?.toFixed(2) ?? "—", sortingFn: (a, b) => sortNullable(a.original.bbK, b.original.bbK) }),
  columnHelper.accessor("iso", { header: "ISO", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.iso, b.original.iso) }),
  columnHelper.accessor("babip", { header: "BABIP", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.babip, b.original.babip) }),
  columnHelper.accessor("woba", { header: "wOBA", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.woba, b.original.woba) }),
  columnHelper.accessor("wrcPlus", { header: "wRC+", cell: info => info.getValue() ?? "—", sortingFn: (a, b) => sortNullable(a.original.wrcPlus, b.original.wrcPlus) }),
]

const leftAlignedColumns = new Set(["name"])

function alignFor(columnId: string): "left" | "right" {
  return leftAlignedColumns.has(columnId) ? "left" : "right"
}

// Parses a clearable Combobox's string value back into a filter — clearing
// emits "", which maps to "no filter" (search params store `undefined`, not
// "", so the URL stays clean).
function optionalInt(value: string): number | undefined {
  return value === "" ? undefined : Number(value)
}

function BattingPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [sorting, setSorting] = useState<SortingState>([{ id: "pa", desc: true }])

  const seasonsQuery = useQuery(orpc.batting.seasons.queryOptions({ input: {} }))
  const clubsQuery = useQuery(orpc.batting.clubs.queryOptions({ input: {} }))
  const latestSeason = seasonsQuery.data ? Math.max(...seasonsQuery.data) : undefined
  const seasonFrom = search.seasonFrom ?? latestSeason
  const seasonTo = search.seasonTo ?? latestSeason
  const qualified = search.qualified ?? true

  const splitsQuery = useQuery(
    orpc.batting.splits.queryOptions({
      input: {
        seasonFrom,
        seasonTo,
        dateFrom: search.dateFrom,
        dateTo: search.dateTo,
        inning: search.inning,
        halfInning: search.halfInning,
        outsAfter: search.outsAfter,
        balls: search.balls,
        strikes: search.strikes,
        battingClubPk: search.battingClubPk,
        pitchingClubPk: search.pitchingClubPk,
        batterHand: search.batterHand,
        pitcherHand: search.pitcherHand,
        qualifiedOnly: qualified,
      },
      enabled: seasonsQuery.data !== undefined,
    }),
  )

  const tableInstance = useReactTable({
    data: splitsQuery.data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const clubOptions = (clubsQuery.data ?? []).map(club => ({ value: String(club.clubPk), label: club.abbreviation }))

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]"
      style={{
        padding: "var(--sp-4)",
        gap: "var(--sp-4)",
        alignItems: "start",
      }}
    >
      <Panel title="FILTERS">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          <Combobox
            label="SEASON FROM"
            value={seasonFrom !== undefined ? String(seasonFrom) : undefined}
            options={(seasonsQuery.data ?? []).map(year => String(year))}
            onChange={value => navigate({ search: prev => ({ ...prev, seasonFrom: Number(value) }), replace: true })}
          />
          <Combobox
            label="SEASON TO"
            value={seasonTo !== undefined ? String(seasonTo) : undefined}
            options={(seasonsQuery.data ?? []).map(year => String(year))}
            onChange={value => navigate({ search: prev => ({ ...prev, seasonTo: Number(value) }), replace: true })}
          />
          <Input
            label="DATE FROM"
            type="date"
            value={search.dateFrom ?? ""}
            onChange={value => navigate({ search: prev => ({ ...prev, dateFrom: value || undefined }), replace: true })}
          />
          <Input
            label="DATE TO"
            type="date"
            value={search.dateTo ?? ""}
            onChange={value => navigate({ search: prev => ({ ...prev, dateTo: value || undefined }), replace: true })}
          />
          <Combobox
            label="BATTING CLUB"
            placeholder="ANY"
            clearable
            value={search.battingClubPk !== undefined ? String(search.battingClubPk) : undefined}
            options={clubOptions}
            onChange={value => navigate({ search: prev => ({ ...prev, battingClubPk: optionalInt(value) }), replace: true })}
          />
          <Combobox
            label="VS CLUB"
            placeholder="ANY"
            clearable
            value={search.pitchingClubPk !== undefined ? String(search.pitchingClubPk) : undefined}
            options={clubOptions}
            onChange={value => navigate({ search: prev => ({ ...prev, pitchingClubPk: optionalInt(value) }), replace: true })}
          />
          <RadioGroup
            label="BATS"
            direction="row"
            value={search.batterHand ?? "ANY"}
            options={[
              { value: "ANY", label: "ANY" },
              { value: "L", label: "L" },
              { value: "R", label: "R" },
              { value: "B", label: "SW" },
            ]}
            onChange={value => navigate({ search: prev => ({ ...prev, batterHand: value === "ANY" ? undefined : (value as "L" | "R" | "B") }), replace: true })}
          />
          <RadioGroup
            label="VS PITCHER"
            direction="row"
            value={search.pitcherHand ?? "ANY"}
            options={[
              { value: "ANY", label: "ANY" },
              { value: "L", label: "LHP" },
              { value: "R", label: "RHP" },
            ]}
            onChange={value => navigate({ search: prev => ({ ...prev, pitcherHand: value === "ANY" ? undefined : (value as "L" | "R") }), replace: true })}
          />
          <Combobox
            label="INNING"
            placeholder="ANY"
            clearable
            value={search.inning !== undefined ? String(search.inning) : undefined}
            options={Array.from({ length: 9 }, (_, i) => String(i + 1))}
            onChange={value => navigate({ search: prev => ({ ...prev, inning: optionalInt(value) }), replace: true })}
          />
          <RadioGroup
            label="HALF"
            direction="row"
            value={search.halfInning ?? "ANY"}
            options={[
              { value: "ANY", label: "ANY" },
              { value: "top", label: "TOP" },
              { value: "bottom", label: "BOT" },
            ]}
            onChange={value => navigate({ search: prev => ({ ...prev, halfInning: value === "ANY" ? undefined : (value as "top" | "bottom") }), replace: true })}
          />
          <Combobox
            label="OUTS"
            placeholder="ANY"
            clearable
            value={search.outsAfter !== undefined ? String(search.outsAfter) : undefined}
            options={["0", "1", "2"]}
            onChange={value => navigate({ search: prev => ({ ...prev, outsAfter: optionalInt(value) }), replace: true })}
          />
          <Combobox
            label="BALLS"
            placeholder="ANY"
            clearable
            value={search.balls !== undefined ? String(search.balls) : undefined}
            options={["0", "1", "2", "3"]}
            onChange={value => navigate({ search: prev => ({ ...prev, balls: optionalInt(value) }), replace: true })}
          />
          <Combobox
            label="STRIKES"
            placeholder="ANY"
            clearable
            value={search.strikes !== undefined ? String(search.strikes) : undefined}
            options={["0", "1", "2"]}
            onChange={value => navigate({ search: prev => ({ ...prev, strikes: optionalInt(value) }), replace: true })}
          />
          <Checkbox
            label="QUALIFIED"
            checked={qualified}
            onChange={checked => navigate({ search: prev => ({ ...prev, qualified: checked ? undefined : false }), replace: true })}
          />
        </div>
      </Panel>

      <Panel
        style={shrinkable}
        title="BATTING LEADERS"
        meta={splitsQuery.data ? `${splitsQuery.data.length} players` : undefined}
        padded={false}
      >
        {splitsQuery.isPending ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-6)" }}>
            <Spinner />
          </div>
        ) : splitsQuery.isError ? (
          <div style={{ color: "var(--err)", padding: "var(--sp-4)" }}>
            Could not load batting leaders: {(splitsQuery.error as Error).message}
          </div>
        ) : splitsQuery.data.length === 0 ? (
          <div style={{ color: "var(--fg-3)", padding: "var(--sp-4)" }}>No qualifying players.</div>
        ) : (
          // Fixed height on `lg`+ (single row alongside the sidebar) trades
          // for a shorter cap once the sidebar stacks above the table on
          // narrow viewports, so the table's own scroll region — not the
          // whole page — still does the scrolling.
          <div
            className="h-[60vh] lg:h-[calc(100vh-140px)]"
            // `overscrollBehavior: contain` stops iOS Safari's elastic bounce
            // from dragging this scroll region past its own content bounds
            // (which briefly exposes blank background on both axes) and from
            // chaining the scroll gesture up to the page.
            style={{ ...scrollX, overflowY: "auto", overscrollBehavior: "contain" }}
          >
            <table style={table}>
              <thead>
                {tableInstance.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      const sort = header.column.getIsSorted()
                      const align = alignFor(header.column.id)
                      return (
                        <th
                          key={header.id}
                          style={{
                            ...th,
                            ...numeric,
                            textAlign: align,
                            position: "sticky",
                            top: 0,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                          aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none"}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span style={{ display: "inline-block", width: "1em", color: "var(--fg-3)" }}>
                            {sort === "asc" ? "▲" : sort === "desc" ? "▼" : ""}
                          </span>
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {tableInstance.getRowModel().rows.map((row, index) => (
                  <tr key={row.id} style={stripedRow(index)}>
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{ ...td, ...numeric, textAlign: alignFor(cell.column.id) }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
