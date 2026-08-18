import { Panel } from "@hydra-tv/ui"
import { PitchSequence } from "@hydra-tv/sports"

import type { GameSnapshot, LivePlay, PlaySummary } from "../../shared/models.ts"
import { currentLineup, displayedPlay, formatZoneBounds, offenseSide, zoneBounds } from "../game/adapters.ts"
import { usePitchHover } from "../game/usePitchHover.ts"
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"
import { muted, numeric, table, td, th } from "../lib/table.ts"
import { copy } from "../lib/type.ts"
import { hitFromPitches, PlayCard, playBadge } from "./PlayCard.tsx"
import { PreviousPlays } from "./PreviousPlays.tsx"
import { LabeledStrikeZonePlot } from "./StrikeZone.tsx"

export function AtBatTab({ snapshot }: { snapshot: GameSnapshot }) {
  const play = displayedPlay(snapshot)
  const hover = usePitchHover(play?.pitches ?? [])

  if (!play) {
    return (
      <Panel style={shrinkable} title="AT BAT">
        <div style={{ color: "var(--fg-3)" }}>No pitches yet.</div>
      </Panel>
    )
  }

  const pitches = play.pitches
  const bounds = zoneBounds(pitches)
  const zoneLabel = formatZoneBounds(bounds)
  const batter = snapshot.players[play.batterId]
  const last = pitches.at(-1)
  const completed = isCompletedPlay(play)
  const showResult = completed || last?.call.isInPlay === true
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
        {pitches.length > 0 ? (
          <LabeledStrikeZonePlot
            pitches={hover.zonePitches}
            {...bounds}
            colorBy="result"
            width="100%"
            focused={hover.zoneFocused}
            onFocus={hover.onZoneFocus}
          />
        ) : (
          <div style={muted}>Waiting for the first pitch of this at-bat.</div>
        )}
      </Panel>

      <Panel style={{ ...shrinkable, minWidth: 0 }} title="SEQUENCE" meta={`${pitches.length} pitches`} padded={false}>
        {showResult ? (
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
        {pitches.length > 0 ? (
          <div style={scrollX}>
            <PitchSequence
              pitches={hover.sequencePitches}
              {...bounds}
              showSpin
              showBreak
              showLocation={false}
              focused={hover.sequenceFocused}
              onFocus={hover.onSequenceFocus}
            />
          </div>
        ) : (
          <div style={{ ...muted, padding: "var(--sp-3)" }}>No pitches yet.</div>
        )}
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
                  const current = playerId === play.batterId
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
