import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Checkbox, Panel, Select, Spinner } from "@hydra-tv/ui"
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
  season: z.number().int().optional(),
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

const columnHelper = createColumnHelper<BattingLeader>()

const columns = [
  columnHelper.accessor("name", { header: "NAME" }),
  columnHelper.accessor("club", { header: "CLUB", cell: info => info.getValue() ?? "—" }),
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

const leftAlignedColumns = new Set(["name", "club"])

function alignFor(columnId: string): "left" | "right" {
  return leftAlignedColumns.has(columnId) ? "left" : "right"
}

function BattingPage() {
  const { season, qualified } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [sorting, setSorting] = useState<SortingState>([{ id: "pa", desc: true }])

  const seasonsQuery = useQuery(orpc.batting.seasons.queryOptions({ input: {} }))
  const selectedSeason = season ?? Math.max(...(seasonsQuery.data ?? []))

  const leadersQuery = useQuery(
    orpc.batting.leaders.queryOptions({
      input: { season: selectedSeason, qualifiedOnly: qualified },
      enabled: seasonsQuery.data !== undefined,
    }),
  )

  const tableInstance = useReactTable({
    data: leadersQuery.data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]"
      style={{
        padding: "var(--sp-4)",
        gap: "var(--sp-4)",
        alignItems: "start",
      }}
    >
      <Panel title="FILTERS">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          <Select
            label="SEASON"
            value={seasonsQuery.data ? String(selectedSeason) : undefined}
            options={(seasonsQuery.data ?? []).map(year => String(year))}
            onChange={value => navigate({ search: prev => ({ ...prev, season: Number(value) }), replace: true })}
          />
          <Checkbox
            label="QUALIFIED"
            checked={qualified ?? false}
            onChange={checked => navigate({ search: prev => ({ ...prev, qualified: checked || undefined }), replace: true })}
          />
        </div>
      </Panel>

      <Panel
        style={shrinkable}
        title="BATTING LEADERS"
        meta={leadersQuery.data ? `${leadersQuery.data.length} players` : undefined}
        padded={false}
      >
        {leadersQuery.isPending ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-6)" }}>
            <Spinner />
          </div>
        ) : leadersQuery.isError ? (
          <div style={{ color: "var(--err)", padding: "var(--sp-4)" }}>
            Could not load batting leaders: {(leadersQuery.error as Error).message}
          </div>
        ) : leadersQuery.data.length === 0 ? (
          <div style={{ color: "var(--fg-3)", padding: "var(--sp-4)" }}>No qualifying players.</div>
        ) : (
          // Fixed height on `lg`+ (single row alongside the sidebar) trades
          // for a shorter cap once the sidebar stacks above the table on
          // narrow viewports, so the table's own scroll region — not the
          // whole page — still does the scrolling.
          <div className="h-[60vh] lg:h-[calc(100vh-140px)]" style={{ ...scrollX, overflowY: "auto" }}>
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
