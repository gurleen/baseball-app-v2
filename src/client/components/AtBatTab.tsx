import { Panel } from "@hydra-tv/ui"
import { PitchSequence, StrikeZonePlot } from "@hydra-tv/sports"

import type { GameSnapshot } from "../../shared/models.ts"
import { toSequencePitches, toStrikeZonePitches, zoneBounds } from "../game/adapters.ts"
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"

export function AtBatTab({ snapshot }: { snapshot: GameSnapshot }) {
  // Fall back to the last completed at-bat between innings and after the final
  // out, so the tab is never blank.
  const play = snapshot.currentPlay ?? snapshot.plays.at(-1)
  const pitches = play?.pitches ?? []
  const bounds = zoneBounds(pitches)

  const batter = play ? snapshot.players[play.batterId] : undefined
  const pitcher = play ? snapshot.players[play.pitcherId] : undefined

  if (!play || pitches.length === 0) {
    return (
      <Panel style={shrinkable} title="AT BAT">
        <div style={{ color: "var(--fg-3)" }}>No pitches yet.</div>
      </Panel>
    )
  }

  return (
    <div style={{ ...responsiveColumns(300), gap: "var(--sp-3)" }}>
      <Panel style={shrinkable}
        title={batter ? `${batter.shortName} ${batter.batSide ? `(${batter.batSide})` : ""}`.trim() : "BATTER"}
        meta={pitcher ? `vs ${pitcher.shortName}` : undefined}
      >
        <StrikeZonePlot pitches={toStrikeZonePitches(pitches)} {...bounds} colorBy="result" />
      </Panel>

      <Panel style={shrinkable} title="SEQUENCE" meta={`${pitches.length} pitches`} padded={false}>
        <div style={scrollX}>
          <PitchSequence pitches={toSequencePitches(pitches)} {...bounds} showSpin />
        </div>
      </Panel>
    </div>
  )
}
