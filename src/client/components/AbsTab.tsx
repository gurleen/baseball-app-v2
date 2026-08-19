import { useState } from "react"
import { Badge, Panel } from "@hydra-tv/ui"

import type { GameSnapshot, TeamRef } from "../../shared/models.ts"
import {
  absCallLabel,
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
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      {abs ? (
        <div style={{ ...responsiveColumns(220), gap: "var(--sp-3)" }}>
          <ChallengeCard snapshot={snapshot} side="away" />
          <ChallengeCard snapshot={snapshot} side="home" />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Panel style={shrinkable} title="ABS CHALLENGES">
          <div style={{ ...muted, textAlign: "center", padding: "var(--sp-4)" }}>No ABS challenges this game.</div>
        </Panel>
      ) : (
        <>
          <div style={{ ...responsiveColumns(280), gap: "var(--sp-3)", alignItems: "start" }}>
            <Panel
              style={shrinkable}
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

            {selected ? <ChallengeDetail snapshot={snapshot} row={selected} /> : null}
          </div>

          <Panel style={shrinkable} title="ABS CHALLENGES" meta={`${rows.length}`} padded={false}>
            <div style={scrollX}>
              <table style={{ ...table, minWidth: 640 }}>
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
        </>
      )}
    </div>
  )
}

function ChallengeDetail({ snapshot, row }: { snapshot: GameSnapshot; row: AbsChallengeRow }) {
  const batter = snapshot.players[row.batterId]
  const bounds = row.strikeZone ? { zoneTop: row.strikeZone.top, zoneBottom: row.strikeZone.bottom } : {}
  const plotted = toAbsZonePitches([row])
  const miss = row.inProgress ? undefined : formatMissBy(row.edgeDistance)
  const direction = formatMissDirection(missDirection(row.location, row.strikeZone, row.batterHand))
  const team = teamById(snapshot, row.challengeTeamId)
  const ump = umpCallLabel(row.callCode, row.callName)
  const abs = absCallLabel(row.callCode, row.callName, row.isOverturned)

  return (
    <Panel
      style={shrinkable}
      title={batter ? `${batter.shortName} ${batter.batSide ? `(${batter.batSide})` : ""}`.trim() : "CHALLENGE"}
      meta={formatZoneBounds(bounds)}
      padded={false}
      bodyStyle={{ padding: "var(--sp-3)" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "var(--sp-3)" }}>
          <div>
            <div style={{ ...data, fontSize: "var(--fs-16)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {row.inProgress ? "PENDING" : (miss ?? "—")}
            </div>
            <div style={muted}>{row.inProgress ? "REVIEW IN PROGRESS" : "MISS BY"}</div>
          </div>
          {direction && !row.inProgress ? (
            <div>
              <div style={{ ...data, fontSize: "var(--fs-16)", fontWeight: 800 }}>{direction}</div>
              <div style={muted}>DIRECTION</div>
            </div>
          ) : null}
          <Badge label={resultLabel(row).toUpperCase()} kind={row.inProgress ? "warn" : "neutral"} />
        </div>

        <div style={{ ...data, fontSize: "var(--fs-13)" }}>
          UMP {ump.toUpperCase()}
          {row.inProgress ? "" : ` → ABS ${abs.toUpperCase()}`}
        </div>
        <div style={{ color: "var(--fg-2)", fontSize: "var(--fs-13)" }}>
          Challenged by {challengerLabel(snapshot, row)}
          {team ? ` (${team.abbreviation})` : ""}
        </div>

        <LabeledStrikeZonePlot
          pitches={plotted}
          {...bounds}
          colorBy="result"
          width="100%"
          legend={false}
          showEmpty={plotted.length === 0}
        />
      </div>
    </Panel>
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

function teamById(snapshot: GameSnapshot, teamId: number | null): TeamRef | undefined {
  if (teamId == null) return undefined
  if (snapshot.teams.home.id === teamId) return snapshot.teams.home
  if (snapshot.teams.away.id === teamId) return snapshot.teams.away
  return undefined
}
