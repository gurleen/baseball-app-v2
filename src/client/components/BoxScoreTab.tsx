import { Panel } from "@hydra-tv/ui"
import { BoxScore } from "@hydra-tv/sports"

import type { GameSnapshot } from "../../shared/models.ts"
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"
import { muted, numeric, table, td, th } from "../lib/table.ts"
import { TeamLogo } from "./TeamLogo.tsx"

/**
 * The batting and pitching boxes for both sides. TeamBox rows are already
 * keyed to match the library's presets, so they pass straight through.
 */
export function BoxScoreTab({
  snapshot,
  preset,
}: {
  snapshot: GameSnapshot
  preset: "batting" | "pitching"
}) {
  return (
    <div style={{ ...responsiveColumns(420), gap: "var(--sp-3)" }}>
      {(["away", "home"] as const).map(side => {
        const box = snapshot.boxscore[side]
        const team = snapshot.teams[side]
        const rows = preset === "batting" ? box.batting : box.pitching
        const totals = preset === "batting" ? box.battingTotals : box.pitchingTotals

        return (
          <div key={side} style={{ ...shrinkable, display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            <Panel
              style={shrinkable}
              title={team.name.toUpperCase()}
              meta={preset === "batting" ? undefined : "IN GAME"}
              actions={<TeamLogo teamId={team.id} width={28} />}
              padded={false}
            >
              <div style={scrollX}>
                <BoxScore
                  preset={preset}
                  // The library uses `undefined` for an absent position; our
                  // models use `null` throughout.
                  players={rows.map(row => ({
                    ...row,
                    position: "position" in row ? (row.position ?? undefined) : undefined,
                  }))}
                  totals={totals}
                  totalsLabel={preset === "batting" ? "TOTALS" : "STAFF"}
                  dense
                />
              </div>
            </Panel>

            {preset === "batting" ? <BenchTable snapshot={snapshot} side={side} /> : <BullpenTable snapshot={snapshot} side={side} />}
          </div>
        )
      })}
    </div>
  )
}

function BenchTable({ snapshot, side }: { snapshot: GameSnapshot; side: "home" | "away" }) {
  const bench = snapshot.boxscore[side].bench
  return (
    <Panel style={shrinkable} title="BENCH" padded={false}>
      <div style={scrollX}>
        <table style={{ ...table, minWidth: 360 }}>
          <thead>
            <tr>
              <th style={th}>Batter</th>
              <th style={{ ...th, ...numeric }}>AVG</th>
              <th style={{ ...th, ...numeric }}>OPS</th>
              <th style={{ ...th, ...numeric }}>HR</th>
            </tr>
          </thead>
          <tbody>
            {bench.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ ...td, ...muted, textAlign: "center" }}>
                  No remaining bench players.
                </td>
              </tr>
            ) : (
              bench.map(line => {
                const player = snapshot.players[line.playerId]
                return (
                  <tr key={line.playerId}>
                    <td style={td}>
                      <span>{player?.shortName ?? line.name}</span>
                      <span style={{ ...muted, marginLeft: "var(--sp-2)" }}>{line.position ?? player?.position ?? ""}</span>
                    </td>
                    <td style={{ ...td, ...numeric }}>{line.avg}</td>
                    <td style={{ ...td, ...numeric }}>{line.ops}</td>
                    <td style={{ ...td, ...numeric }}>{line.hr}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function BullpenTable({ snapshot, side }: { snapshot: GameSnapshot; side: "home" | "away" }) {
  const bullpen = snapshot.boxscore[side].bullpen
  return (
    <Panel style={shrinkable} title="BULLPEN" padded={false}>
      <div style={scrollX}>
        <table style={{ ...table, minWidth: 400 }}>
          <thead>
            <tr>
              <th style={th}>Pitcher</th>
              <th style={{ ...th, ...numeric }}>W-L</th>
              <th style={{ ...th, ...numeric }}>ERA</th>
              <th style={{ ...th, ...numeric }}>IP</th>
              <th style={{ ...th, ...numeric }}>WHIP</th>
              <th style={{ ...th, ...numeric }}>K</th>
            </tr>
          </thead>
          <tbody>
            {bullpen.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...td, ...muted, textAlign: "center" }}>
                  No remaining bullpen.
                </td>
              </tr>
            ) : (
              bullpen.map(line => {
                const player = snapshot.players[line.playerId]
                return (
                  <tr key={line.playerId}>
                    <td style={td}>
                      <span>{player?.shortName ?? line.name}</span>
                      <span style={{ ...muted, marginLeft: "var(--sp-2)" }}>
                        {player?.pitchHand ? `${player.pitchHand}HP` : ""}
                      </span>
                    </td>
                    <td style={{ ...td, ...numeric }}>{`${line.wins}-${line.losses}`}</td>
                    <td style={{ ...td, ...numeric }}>{line.era}</td>
                    <td style={{ ...td, ...numeric }}>{line.seasonIp}</td>
                    <td style={{ ...td, ...numeric }}>{line.whip}</td>
                    <td style={{ ...td, ...numeric }}>{line.seasonSo}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
