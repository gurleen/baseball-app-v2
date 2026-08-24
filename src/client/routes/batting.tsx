import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Checkbox, DataGrid, Panel, Select, Spinner } from "@hydra-tv/ui"
import { z } from "zod"

import { orpc } from "../rpc/client.ts"
import { shrinkable } from "../lib/layout.ts"

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

const columns = [
  { key: "name", label: "NAME", width: "minmax(140px,1fr)" },
  { key: "club", label: "CLUB", width: "70px", align: "center" as const },
  { key: "pa", label: "PA", width: "60px", align: "right" as const },
  { key: "ab", label: "AB", width: "60px", align: "right" as const },
  { key: "h", label: "H", width: "60px", align: "right" as const },
  { key: "homeRuns", label: "HR", width: "60px", align: "right" as const },
  { key: "bb", label: "BB", width: "60px", align: "right" as const },
  { key: "so", label: "SO", width: "60px", align: "right" as const },
  { key: "avg", label: "AVG", width: "70px", align: "right" as const },
  { key: "obp", label: "OBP", width: "70px", align: "right" as const },
  { key: "slg", label: "SLG", width: "70px", align: "right" as const },
  { key: "ops", label: "OPS", width: "70px", align: "right" as const },
  { key: "bbPct", label: "BB%", width: "70px", align: "right" as const },
  { key: "kPct", label: "K%", width: "70px", align: "right" as const },
  { key: "bbK", label: "BB/K", width: "70px", align: "right" as const },
  { key: "iso", label: "ISO", width: "70px", align: "right" as const },
  { key: "babip", label: "BABIP", width: "70px", align: "right" as const },
  { key: "woba", label: "wOBA", width: "70px", align: "right" as const },
  { key: "wrcPlus", label: "wRC+", width: "70px", align: "right" as const },
]

function BattingPage() {
  const { season, qualified } = Route.useSearch()
  const navigate = Route.useNavigate()

  const seasonsQuery = useQuery(orpc.batting.seasons.queryOptions({ input: {} }))
  const selectedSeason = season ?? Math.max(...(seasonsQuery.data ?? []))

  const leadersQuery = useQuery(
    orpc.batting.leaders.queryOptions({
      input: { season: selectedSeason, qualifiedOnly: qualified },
      enabled: seasonsQuery.data !== undefined,
    }),
  )

  const rows = (leadersQuery.data ?? []).map(leader => ({
    ...leader,
    club: leader.club ?? "—",
    avg: fmtRate(leader.avg),
    obp: fmtRate(leader.obp),
    slg: fmtRate(leader.slg),
    ops: fmtRate(leader.ops),
    iso: fmtRate(leader.iso),
    babip: fmtRate(leader.babip),
    woba: fmtRate(leader.woba),
    wrcPlus: leader.wrcPlus ?? "—",
    bbPct: fmtPct(leader.bbPct),
    kPct: fmtPct(leader.kPct),
    bbK: leader.bbK === null ? "—" : leader.bbK.toFixed(2),
  }))

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
        ) : rows.length === 0 ? (
          <div style={{ color: "var(--fg-3)", padding: "var(--sp-4)" }}>No qualifying players.</div>
        ) : (
          // Fixed height on `lg`+ (single row alongside the sidebar) trades
          // for a shorter cap once the sidebar stacks above the table on
          // narrow viewports, so the grid's own scroll region — not the
          // whole page — still does the scrolling.
          <div className="h-[60vh] overflow-auto lg:h-[calc(100vh-140px)]">
            <DataGrid columns={columns} rows={rows} zebra />
          </div>
        )}
      </Panel>
    </div>
  )
}
