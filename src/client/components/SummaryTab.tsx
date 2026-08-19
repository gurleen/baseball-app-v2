import { Panel } from "@hydra-tv/ui"
import { PlayByPlay, PlayerCard, SprayChart } from "@hydra-tv/sports"

import type { GameSnapshot } from "../../shared/models.ts"
import { findPitchingLine, toPlayByPlayRows, toPlayLog, toSprayBalls } from "../game/adapters.ts"
import { responsiveColumns, shrinkable } from "../lib/layout.ts"
import { muted } from "../lib/table.ts"
import { copy } from "../lib/type.ts"
import { playerPhotoUrl } from "./PlayerImage.tsx"

export function SummaryTab({ snapshot }: { snapshot: GameSnapshot }) {
  const balls = toSprayBalls(snapshot.plays)
  const final = snapshot.state.kind === "final"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {final ? (
        <div style={{ ...responsiveColumns(240), gap: "var(--sp-3)" }}>
          <DecisionsPanel snapshot={snapshot} />
          <GameInfoPanel snapshot={snapshot} />
        </div>
      ) : null}

      <div style={{ ...responsiveColumns(320), gap: "var(--sp-3)" }}>
        <Panel style={shrinkable} title="PLAY BY PLAY" meta={`${toPlayLog(snapshot).length}`} padded={false}>
          <PlayByPlay events={toPlayByPlayRows(snapshot)} height={480} newestFirst />
        </Panel>

        <Panel
          style={shrinkable}
          title="BATTED BALLS"
          meta={balls.length ? `${balls.length} tracked` : "no Statcast data yet"}
          padded={false}
          bodyStyle={{ padding: "var(--sp-3)", minWidth: 0 }}
        >
          {balls.length > 0 ? (
            <SprayChart
              park={snapshot.teams.home.abbreviation}
              battedBalls={balls}
              height={448}
              style={{ width: "100%", minWidth: 0 }}
            />
          ) : (
            <div style={{ color: "var(--fg-3)" }}>Statcast has not published batted balls for this game.</div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function DecisionsPanel({ snapshot }: { snapshot: GameSnapshot }) {
  const decisions = snapshot.decisions
  return (
    <Panel style={shrinkable} title="PITCHERS OF RECORD">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <DecisionCard snapshot={snapshot} label="WINNER" playerId={decisions?.winnerId ?? null} />
        <DecisionCard snapshot={snapshot} label="LOSER" playerId={decisions?.loserId ?? null} />
        <DecisionCard snapshot={snapshot} label="SAVE" playerId={decisions?.saveId ?? null} />
      </div>
    </Panel>
  )
}

function DecisionCard({
  snapshot,
  label,
  playerId,
}: {
  snapshot: GameSnapshot
  label: "WINNER" | "LOSER" | "SAVE"
  playerId: number | null
}) {
  if (playerId == null) {
    return (
      <div>
        <div style={muted}>{label}</div>
        <div style={{ color: "var(--fg-3)", marginTop: "var(--sp-1)" }}>—</div>
      </div>
    )
  }

  const player = snapshot.players[playerId]
  const line = findPitchingLine(snapshot, playerId)
  const meta =
    label === "SAVE"
      ? line
        ? `${line.era} ERA`
        : undefined
      : line
        ? `${line.wins}-${line.losses}, ${line.era} ERA`
        : undefined

  return (
    <div>
      <div style={{ ...muted, marginBottom: "var(--sp-1)" }}>{label}</div>
      <PlayerCard
        name={player?.fullName ?? `Player ${playerId}`}
        photo={playerPhotoUrl(playerId)}
        meta={meta}
        size="sm"
        style={{ minWidth: 0 }}
      />
    </div>
  )
}

function GameInfoPanel({ snapshot }: { snapshot: GameSnapshot }) {
  const info = snapshot.gameInfo
  const rows = [
    { label: "Time of Game", value: formatDuration(info.durationMinutes) },
    { label: "Attendance", value: info.attendance != null ? info.attendance.toLocaleString() : "—" },
    { label: "First Pitch", value: formatDateTime(info.firstPitch) },
    { label: "Venue", value: snapshot.venue.name },
    { label: "Weather", value: info.weather ?? "—" },
    { label: "Wind", value: info.wind ?? "—" },
    { label: "Official Scorer", value: info.officialScorer ?? "—" },
    { label: "Datacaster", value: info.datacaster ?? "—" },
  ]

  return (
    <Panel style={shrinkable} title="GAME INFO">
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
          gap: "var(--sp-3)",
          margin: 0,
        }}
      >
        {rows.map(row => (
          <div key={row.label} style={{ border: "1px solid var(--line-2)", background: "var(--bg-3)", padding: "var(--sp-3)" }}>
            <dt style={muted}>{row.label.toUpperCase()}</dt>
            <dd style={{ ...copy, margin: "var(--sp-1) 0 0", fontSize: "var(--fs-13)" }}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

function formatDuration(minutes: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—"
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return hours > 0 ? `${hours}:${remaining.toString().padStart(2, "0")}` : `${remaining} min`
}

function formatDateTime(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date)
}
