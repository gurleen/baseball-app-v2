import { useState } from "react"
import { Panel, Switch } from "@hydra-tv/ui"

import type { GameSnapshot, PlaySummary } from "../../shared/models.ts"
import { shrinkable } from "../lib/layout.ts"
import { muted } from "../lib/table.ts"
import { PlayCard, hitFromPitches, playBadge } from "./PlayCard.tsx"

export function PreviousPlays({ snapshot, height }: { snapshot: GameSnapshot; height?: number | string }) {
  const [scoringOnly, setScoringOnly] = useState(false)
  const plays = [...snapshot.plays].reverse()
  const filtered = scoringOnly ? plays.filter(play => play.isScoringPlay) : plays
  const items = groupByHalf(filtered)

  return (
    <Panel
      style={{ ...shrinkable, display: "flex", flexDirection: "column", maxHeight: height ?? 480 }}
      title="PREVIOUS PLAYS"
      meta={`${filtered.length}`}
      actions={<Switch checked={scoringOnly} onChange={setScoringOnly} label="SCORING" />}
      padded={false}
      bodyStyle={{ minHeight: 0, overflow: "auto", padding: "var(--sp-3)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}
    >
      {items.length === 0 ? (
        <div style={{ ...muted, textAlign: "center", padding: "var(--sp-4)" }}>
          {scoringOnly ? "No scoring plays yet." : "No completed at-bats yet."}
        </div>
      ) : (
        items.map(item =>
          item.kind === "inning" ? (
            <div
              key={item.id}
              style={{
                ...muted,
                textAlign: "center",
                border: "1px dashed var(--line-2)",
                padding: "var(--sp-2)",
                letterSpacing: "0.12em",
              }}
            >
              {item.label}
            </div>
          ) : (
            <PlayCard
              key={item.play.atBatIndex}
              playerId={item.play.batterId}
              badge={playBadge(item.play)}
              scorecard={item.play.scorecard}
              description={item.play.description || "No description available."}
              pitches={item.play.pitches}
              scoring={item.play.isScoringPlay}
              hit={hitFromPitches(item.play.pitches)}
              expandable
            />
          ),
        )
      )}
    </Panel>
  )
}

type ListItem = { kind: "inning"; id: string; label: string } | { kind: "play"; play: PlaySummary }

function groupByHalf(plays: PlaySummary[]): ListItem[] {
  const items: ListItem[] = []
  let previous = ""

  for (const play of plays) {
    const label = `${play.halfInning === "top" ? "TOP" : "BOT"} ${play.inning}`
    if (label !== previous) {
      items.push({ kind: "inning", id: `inning-${play.halfInning}-${play.inning}`, label })
      previous = label
    }
    items.push({ kind: "play", play })
  }

  return items
}
