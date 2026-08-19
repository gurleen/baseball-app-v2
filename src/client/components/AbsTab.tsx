import { useState } from "react"
import { Panel } from "@hydra-tv/ui"

import type { GameSnapshot } from "../../shared/models.ts"
import {
  absChallengeRows,
  formatMissBy,
  formatMissDirection,
  formatZoneBounds,
  meanZoneBounds,
  missDirection,
  toAbsZonePitches,
  umpCallLabel,
  type AbsChallengeRow,
} from "../game/adapters.ts"
import { scrollX, shrinkable } from "../lib/layout.ts"
import { muted, numeric, table, td, th } from "../lib/table.ts"
import { data } from "../lib/type.ts"
import { LabeledStrikeZonePlot } from "./StrikeZone.tsx"
import { TeamLogo } from "./TeamLogo.tsx"

export function AbsTab({ snapshot }: { snapshot: GameSnapshot }) {
  const abs = snapshot.abs
  const rows = absChallengeRows(snapshot)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = rows.find(row => row.playId === selectedId) ?? rows.at(-1) ?? null
  const zonePitches = toAbsZonePitches(rows)
  const bounds = meanZoneBounds(rows)
  const focused = selected ? zonePitches.findIndex(pitch => pitch.number === selected.index) : -1

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", paddingInline: "var(--sp-3)" }}>
      {abs ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: "var(--sp-3)",
          }}
        >
          <ChallengeCard snapshot={snapshot} side="away" />
          <ChallengeCard snapshot={snapshot} side="home" />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Panel style={shrinkable} title="ABS CHALLENGES">
          <div style={{ ...muted, textAlign: "center", padding: "var(--sp-4)" }}>No ABS challenges this game.</div>
        </Panel>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--sp-3)",
            alignItems: "start",
          }}
        >
          <Panel
            style={{ ...shrinkable, flex: "0 1 20rem", width: "100%", maxWidth: "20rem" }}
            title="CHALLENGED PITCHES"
            meta={formatZoneBounds(bounds) ?? `${rows.length}`}
            padded={false}
            bodyStyle={{ padding: "var(--sp-3)" }}
          >
            <LabeledStrikeZonePlot
              pitches={zonePitches}
              {...bounds}
              colorBy="result"
              width="100%"
              showEmpty={zonePitches.length === 0}
              focused={focused >= 0 ? focused : null}
              onFocus={(_index, pitch) => {
                if (pitch?.number == null) return
                const row = rows.find(candidate => candidate.index === Number(pitch.number))
                if (row) setSelectedId(row.playId)
              }}
            />
          </Panel>

          <Panel style={{ ...shrinkable, flex: "1 1 20rem" }} title="ABS CHALLENGES" meta={`${rows.length}`} padded={false}>
            <div style={scrollX}>
              <table style={{ ...table, minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={th}>Inn.</th>
                    <th style={th}>Challenger</th>
                    <th style={th}>Ump Call</th>
                    <th style={{ ...th, ...numeric }}>Miss by</th>
                    <th style={th}>Direction</th>
                    <th style={th}>Type</th>
                    <th style={th}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const active = selected?.playId === row.playId
                    const challenger = challengerLabel(snapshot, row)
                    const direction = formatMissDirection(missDirection(row.location, row.strikeZone, row.batterHand))
                    return (
                      <tr
                        key={row.playId}
                        onClick={() => setSelectedId(row.playId)}
                        onMouseEnter={() => setSelectedId(row.playId)}
                        style={{
                          background: active
                            ? "var(--warn-bg)"
                            : row.isOverturned
                              ? "color-mix(in srgb, var(--info) 12%, var(--bg-2))"
                              : "var(--bg-2)",
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ ...td, fontWeight: 700 }}>
                          {row.halfInning === "top" ? "T" : "B"}
                          {row.inning}
                        </td>
                        <td style={td}>{challenger}</td>
                        <td style={td}>{umpCallLabel(row.callCode, row.callName)}</td>
                        <td style={{ ...td, ...numeric, fontWeight: 700 }}>
                          {row.inProgress ? "—" : (formatMissBy(row.edgeDistance) ?? "—")}
                        </td>
                        <td style={td}>{direction ?? "—"}</td>
                        <td style={td}>{row.type ?? "—"}</td>
                        <td
                          style={{
                            ...td,
                            fontWeight: 700,
                            color: row.inProgress ? "var(--warn)" : row.isOverturned ? "var(--info)" : "var(--fg-2)",
                          }}
                        >
                          {resultLabel(row)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}

function ChallengeCard({ snapshot, side }: { snapshot: GameSnapshot; side: "home" | "away" }) {
  const team = snapshot.teams[side]
  const counts = snapshot.abs?.[side]
  if (!counts) return null

  return (
    <Panel style={shrinkable} title={team.name.toUpperCase()} actions={<TeamLogo teamId={team.id} width={28} />}>
      <div style={{ display: "flex", justifyContent: "space-around", gap: "var(--sp-3)" }}>
        <Count value={counts.remaining} label="Remaining" />
        <Count value={counts.usedSuccessful} label="Overturned" accent="var(--info)" />
        <Count value={counts.usedFailed} label="Confirmed" />
      </div>
    </Panel>
  )
}

function Count({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ ...data, fontSize: "var(--fs-16)", fontWeight: 800, color: accent }}>{value}</div>
      <div style={muted}>{label.toUpperCase()}</div>
    </div>
  )
}

function resultLabel(row: AbsChallengeRow): string {
  if (row.inProgress) return "Pending"
  return row.isOverturned ? "Overturned" : "Confirmed"
}

function challengerLabel(snapshot: GameSnapshot, row: AbsChallengeRow): string {
  const player = (row.challengerId != null ? snapshot.players[row.challengerId] : undefined) ?? snapshot.players[row.batterId]
  if (player?.shortName) return player.shortName
  if (row.challengerType) return row.challengerType
  return "—"
}
