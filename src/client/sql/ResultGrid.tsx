import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"

import { scrollX } from "../lib/layout.ts"
import { numeric, stripedRow, table, td, th } from "../lib/table.ts"

type Row = Record<string, unknown>

/**
 * Postgres `numeric` arrives over the wire as a string ("0.204"), so "is this
 * column a number?" can't be answered by `typeof` alone — and the answer drives
 * both alignment and the comparator.
 */
function isNumericLike(value: unknown): boolean {
  if (typeof value === "number") return true
  if (typeof value === "string" && value.trim() !== "") return Number.isFinite(Number(value))
  return false
}

function toComparable(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const asNumber = Number(value)
  return Number.isFinite(asNumber) ? asNumber : null
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

const columnHelper = createColumnHelper<Row>()

export function ResultGrid({ columns, rows }: { columns: string[]; rows: Row[] }) {
  const [sorting, setSorting] = useState<SortingState>([])

  // A column counts as numeric only if every value it actually has looks like a
  // number — one stray label and it goes back to left-aligned text sorting.
  const numericColumns = useMemo(() => {
    const result = new Set<string>()
    for (const name of columns) {
      const values = rows.map(row => row[name]).filter(value => value !== null && value !== undefined)
      if (values.length > 0 && values.every(isNumericLike)) result.add(name)
    }
    return result
  }, [columns, rows])

  const tableColumns = useMemo(
    () =>
      columns.map(name =>
        columnHelper.accessor(row => row[name], {
          id: name,
          header: name.toUpperCase(),
          cell: info => {
            const value = info.getValue()
            return value === null || value === undefined ? (
              <span style={{ color: "var(--fg-3)" }}>—</span>
            ) : (
              formatCell(value)
            )
          },
          sortingFn: numericColumns.has(name)
            ? (a, b) => {
                // Nulls sort as -Infinity, matching the leaders pages: last in a
                // descending view, first when the column is flipped.
                const left = toComparable(a.original[name]) ?? Number.NEGATIVE_INFINITY
                const right = toComparable(b.original[name]) ?? Number.NEGATIVE_INFINITY
                return left - right
              }
            : "alphanumeric",
        }),
      ),
    [columns, numericColumns],
  )

  const tableInstance = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const alignFor = (columnId: string): "left" | "right" => (numericColumns.has(columnId) ? "right" : "left")

  return (
    // `overscrollBehavior: contain` stops iOS Safari's elastic bounce from
    // dragging this region past its own bounds and chaining up to the page.
    <div
      className="h-[45vh] lg:h-[calc(100vh-260px)]"
      style={{ ...scrollX, overflowY: "auto", overscrollBehavior: "contain" }}
    >
      <table style={table}>
        <thead>
          {tableInstance.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const sort = header.column.getIsSorted()
                return (
                  <th
                    key={header.id}
                    style={{
                      ...th,
                      ...numeric,
                      textAlign: alignFor(header.column.id),
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
                  style={{ ...td, ...numeric, textAlign: alignFor(cell.column.id), whiteSpace: "nowrap" }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
