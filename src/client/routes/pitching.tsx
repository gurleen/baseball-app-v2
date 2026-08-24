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
import type { PitchingLeader } from "../../server/procedures/pitching.ts"
import { shrinkable, scrollX } from "../lib/layout.ts"
import { numeric, stripedRow, table, td, th } from "../lib/table.ts"

const searchSchema = z.object({
  season: z.number().int().optional(),
  qualified: z.boolean().optional(),
})

export const Route = createFileRoute("/pitching")({
  validateSearch: searchSchema,
  component: PitchingPage,
})

const percent = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 })
const rate = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmtRate(value: number | null): string {
  return value === null ? "—" : rate.format(value)
}

function fmtPct(value: number | null): string {
  return value === null ? "—" : percent.format(value)
}

// Nulls (missing upstream data) sort as -Infinity: last in the default
// descending "leaders" view, first if a column is flipped to ascending.
function sortNullable(a: number | null, b: number | null): number {
  return (a ?? -Infinity) - (b ?? -Infinity)
}

const columnHelper = createColumnHelper<PitchingLeader>()

const columns = [
  columnHelper.accessor("name", { header: "NAME" }),
  columnHelper.accessor("club", { header: "CLUB", cell: info => info.getValue() ?? "—" }),
  columnHelper.accessor("ip", { header: "IP", cell: info => info.getValue()?.toFixed(1) ?? "—", sortingFn: (a, b) => sortNullable(a.original.ip, b.original.ip) }),
  columnHelper.accessor("h", { header: "H" }),
  columnHelper.accessor("homeRuns", { header: "HR" }),
  columnHelper.accessor("bb", { header: "BB" }),
  columnHelper.accessor("so", { header: "SO" }),
  columnHelper.accessor("runs", { header: "R" }),
  columnHelper.accessor("earnedRuns", { header: "ER" }),
  columnHelper.accessor("era", { header: "ERA", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.era, b.original.era) }),
  columnHelper.accessor("whip", { header: "WHIP", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.whip, b.original.whip) }),
  columnHelper.accessor("k9", { header: "K/9", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.k9, b.original.k9) }),
  columnHelper.accessor("bb9", { header: "BB/9", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.bb9, b.original.bb9) }),
  columnHelper.accessor("hr9", { header: "HR/9", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.hr9, b.original.hr9) }),
  columnHelper.accessor("babip", { header: "BABIP", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.babip, b.original.babip) }),
  columnHelper.accessor("fip", { header: "FIP", cell: info => fmtRate(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.fip, b.original.fip) }),
  columnHelper.accessor("lobPct", { header: "LOB%", cell: info => fmtPct(info.getValue()), sortingFn: (a, b) => sortNullable(a.original.lobPct, b.original.lobPct) }),
]

const leftAlignedColumns = new Set(["name", "club"])

function alignFor(columnId: string): "left" | "right" {
  return leftAlignedColumns.has(columnId) ? "left" : "right"
}

function PitchingPage() {
  const { season, qualified } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [sorting, setSorting] = useState<SortingState>([{ id: "ip", desc: true }])

  const seasonsQuery = useQuery(orpc.pitching.seasons.queryOptions({ input: {} }))
  const selectedSeason = season ?? Math.max(...(seasonsQuery.data ?? []))

  const leadersQuery = useQuery(
    orpc.pitching.leaders.queryOptions({
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
        title="PITCHING LEADERS"
        meta={leadersQuery.data ? `${leadersQuery.data.length} players` : undefined}
        padded={false}
      >
        {leadersQuery.isPending ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-6)" }}>
            <Spinner />
          </div>
        ) : leadersQuery.isError ? (
          <div style={{ color: "var(--err)", padding: "var(--sp-4)" }}>
            Could not load pitching leaders: {(leadersQuery.error as Error).message}
          </div>
        ) : leadersQuery.data.length === 0 ? (
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
