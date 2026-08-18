import { Panel } from "@hydra-tv/ui"
import { PitchSequence } from "@hydra-tv/sports"

import type { GameSnapshot, LivePlay, PlaySummary } from "../../shared/models.ts"
import { currentLineup, displayedPlay, formatZoneBounds, offenseSide, toPitchMixBars, zoneBounds } from "../game/adapters.ts"
import { usePitchHover } from "../game/usePitchHover.ts"
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"
import { muted, numeric, table, td, th } from "../lib/table.ts"
import { copy } from "../lib/type.ts"
import { PitchMixChart } from "./PitchMixChart.tsx"
import { hitFromPitches, PlayCard, playBadge } from "./PlayCard.tsx"
import { PreviousPlays } from "./PreviousPlays.tsx"
import { LabeledStrikeZonePlot } from "./StrikeZone.tsx"

export function AtBatTab({ snapshot }: { snapshot: GameSnapshot }) {
  const play = displayedPlay(snapshot)
  const pitches = play?.pitches ?? []
  const hover = usePitchHover(pitches, play?.atBatIndex)
  const bounds = zoneBounds(pitches)
  const zoneLabel = formatZoneBounds(bounds)
  const batter = play ? snapshot.players[play.batterId] : undefined
  const pitcher = play ? snapshot.players[play.pitcherId] : undefined
  const mix = play ? snapshot.pitchMixByPitcher[play.pitcherId] ?? [] : []
  const mixBars = toPitchMixBars(mix)
  const mixTotal = mix.reduce((sum, entry) => sum + entry.count, 0)
  const last = pitches.at(-1)
  const completed = play != null && isCompletedPlay(play)
  const showResult = play != null && (completed || last?.call.isInPlay === true)
  const side = offenseSide(snapshot)
  const lineup = side ? currentLineup(snapshot.boxscore[side]) : []

  return (
    <div style={{ ...responsiveColumns(280), gap: "var(--sp-3)", alignItems: "start" }}>
      <Panel
        style={shrinkable}
        title={batter ? `${batter.shortName} ${batter.batSide ? `(${batter.batSide})` : ""}`.trim() : "BATTER"}
        meta={zoneLabel}
        padded={false}
        bodyStyle={{ padding: "var(--sp-3)" }}
      >
        <LabeledStrikeZonePlot
          pitches={hover.zonePitches}
          {...bounds}
          colorBy="result"
          width="100%"
          showEmpty={hover.zonePitches.length === 0}
          focused={hover.zoneFocused}
          onFocus={hover.onZoneFocus}
        />
      </Panel>

      <Panel style={{ ...shrinkable, minWidth: 0 }} title="SEQUENCE" meta={`${pitches.length} pitches`} padded={false}>
        {showResult && play ? (
          <div style={{ padding: "var(--sp-3)" }}>
            <PlayCard
              playerId={play.batterId}
              badge={completed ? playBadge(play) : last?.call.name || play.description || "Play"}
              scorecard={completed ? play.scorecard : null}
              description={play.description || "No description available."}
              hit={hitFromPitches(pitches)}
              scoring={completed ? play.isScoringPlay : false}
            />
          </div>
        ) : null}
        <div style={scrollX}>
          <PitchSequence
            pitches={hover.sequencePitches}
            {...bounds}
            showSpin
            showLocation={false}
            showEmpty={hover.sequencePitches.length === 0}
            focused={hover.sequenceFocused}
            onFocus={hover.onSequenceFocus}
          />
        </div>
        {mixBars.length > 0 ? (
          <div
            style={{
              borderTop: "1px solid var(--line-2)",
              padding: "var(--sp-3)",
            }}
          >
            {pitcher ? (
              <div style={{ ...muted, fontSize: "var(--fs-10)", marginBottom: "var(--sp-2)", fontWeight: 700 }}>
                {pitcher.shortName} · {mixTotal} P
              </div>
            ) : null}
            <PitchMixChart bars={mixBars} />
          </div>
        ) : null}
      </Panel>

      <PreviousPlays snapshot={snapshot} height={480} />

      {side ? (
        <Panel style={shrinkable} title={snapshot.teams[side].name.toUpperCase()} meta="LINEUP" padded={false}>
          <table style={table}>
            <thead>
              <tr>
                <th style={{ ...th, width: "2.5rem", textAlign: "center" }}>#</th>
                <th style={th}>Batter</th>
                <th style={{ ...th, ...numeric, width: "3rem" }}>Pos</th>
              </tr>
            </thead>
            <tbody>
              {lineup.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ ...td, ...muted, textAlign: "center" }}>
                    Lineup has not been posted yet.
                  </td>
                </tr>
              ) : (
                lineup.map(({ slot, playerId, line }) => {
                  const current = play != null && playerId === play.batterId
                  const player = snapshot.players[playerId]
                  return (
                    <tr key={playerId} style={current ? { background: "var(--warn-bg)" } : undefined}>
                      <td style={{ ...td, ...numeric, fontWeight: 700 }}>{slot}</td>
                      <td style={{ ...td, ...copy, fontSize: "var(--fs-13)" }}>{player?.shortName ?? line?.name ?? `#${playerId}`}</td>
                      <td style={{ ...td, ...numeric, ...muted }}>{line?.position ?? player?.position ?? "—"}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </Panel>
      ) : null}
    </div>
  )
}

function isCompletedPlay(play: LivePlay | PlaySummary): play is PlaySummary {
  return "event" in play && "isScoringPlay" in play
}
