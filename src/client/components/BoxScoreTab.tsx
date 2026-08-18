import { Panel } from "@hydra-tv/ui"
import { BoxScore } from "@hydra-tv/sports"

import type { GameSnapshot } from "../../shared/models.ts"
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"

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
        const rows = preset === "batting" ? box.batting : box.pitching
        const totals = preset === "batting" ? box.battingTotals : box.pitchingTotals

        return (
          <Panel key={side} style={shrinkable} title={snapshot.teams[side].name.toUpperCase()} padded={false}>
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
        )
      })}
    </div>
  )
}
