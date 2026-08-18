import { Panel } from "@hydra-tv/ui"

import type { GameSnapshot } from "../../shared/models.ts"
import { absChallengeRows } from "../game/adapters.ts"
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"
import { muted, numeric, table, td, th } from "../lib/table.ts"
import { data } from "../lib/type.ts"
import { TeamLogo } from "./TeamLogo.tsx"

export function AbsTab({ snapshot }: { snapshot: GameSnapshot }) {
  const abs = snapshot.abs
  const rows = absChallengeRows(snapshot)

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
        <Panel style={shrinkable} title="ABS CHALLENGES" meta={`${rows.length}`} padded={false}>
          <div style={scrollX}>
            <table style={{ ...table, minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={th}>Inn.</th>
                  <th style={th}>Batter</th>
                  <th style={th}>Ump Call</th>
                  <th style={th}>Zone</th>
                  <th style={th}>Type</th>
                  <th style={th}>Velo</th>
                  <th style={th}>ABS Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const batter = snapshot.players[row.batterId]
                  const inZone = row.zone != null && row.zone >= 1 && row.zone <= 9
                  const outZone = row.zone != null && row.zone >= 11 && row.zone <= 14
                  return (
                    <tr
                      key={row.playId}
                      style={{ background: row.isOverturned ? "color-mix(in srgb, var(--info) 12%, var(--bg-2))" : "var(--bg-2)" }}
                    >
                      <td style={{ ...td, fontWeight: 700 }}>
                        {row.halfInning === "top" ? "T" : "B"}
                        {row.inning}
                      </td>
                      <td style={td}>{batter?.shortName ?? "—"}</td>
                      <td style={td}>{formatUmpCall(row.callCode, row.callName)}</td>
                      <td style={{ ...td, fontWeight: 700, color: inZone ? "var(--ok-text)" : "var(--fg-3)" }}>
                        {inZone ? "In" : outZone ? "Out" : "—"}
                      </td>
                      <td style={td}>{row.type ?? "—"}</td>
                      <td style={{ ...td, ...numeric }}>{row.velocity != null ? row.velocity.toFixed(1) : "—"}</td>
                      <td style={{ ...td, fontWeight: 700, color: row.isOverturned ? "var(--info)" : "var(--fg-2)" }}>
                        {row.isOverturned ? "Overturned" : "Confirmed"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
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

function formatUmpCall(code: string, name: string): string {
  if (code === "C") return "Called Strike"
  if (code === "B") return "Called Ball"
  return name || code
}
