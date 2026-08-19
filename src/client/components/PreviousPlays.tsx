import { useState } from "react"
import { Panel, Switch } from "@hydra-tv/ui"

import type { GameSnapshot } from "../../shared/models.ts"
import type { PlayLogEntry } from "../game/adapters.ts"
import { toPlayLog } from "../game/adapters.ts"
import { shrinkable } from "../lib/layout.ts"
import { muted } from "../lib/table.ts"
import { PlayCard, actionBadge, hitFromPitches, playBadge } from "./PlayCard.tsx"

export function PreviousPlays({ snapshot, height }: { snapshot: GameSnapshot; height?: number | string }) {
  const [scoringOnly, setScoringOnly] = useState(false)
  const entries = [...toPlayLog(snapshot)].reverse()
  const filtered = scoringOnly ? entries.filter(isScoringEntry) : entries
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
          {scoringOnly ? "No scoring plays yet." : "No plays yet."}
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
          ) : item.entry.kind === "play" ? (
            <PlayCard
              key={`play-${item.entry.play.atBatIndex}`}
              playerId={item.entry.play.batterId}
              badge={playBadge(item.entry.play)}
              scorecard={item.entry.play.scorecard}
              description={item.entry.play.description || "No description available."}
              pitches={item.entry.play.pitches}
              scoring={item.entry.play.isScoringPlay}
              hit={hitFromPitches(item.entry.play.pitches)}
              expandable
            />
          ) : (
            <PlayCard
              key={`action-${item.entry.action.atBatIndex}-${item.entry.action.eventIndex}`}
              playerId={item.entry.action.playerId ?? undefined}
              badge={actionBadge(item.entry.action)}
              description={item.entry.action.description || "No description available."}
              scoring={item.entry.action.isScoringPlay}
            />
          ),
        )
      )}
    </Panel>
  )
}

type ListItem = { kind: "inning"; id: string; label: string } | { kind: "entry"; entry: PlayLogEntry }

function isScoringEntry(entry: PlayLogEntry): boolean {
  return entry.kind === "play" ? entry.play.isScoringPlay : entry.action.isScoringPlay
}

function groupByHalf(entries: PlayLogEntry[]): ListItem[] {
  const items: ListItem[] = []
  let previous = ""

  for (const entry of entries) {
    const halfInning = entry.kind === "play" ? entry.play.halfInning : entry.action.halfInning
    const inning = entry.kind === "play" ? entry.play.inning : entry.action.inning
    const label = `${halfInning === "top" ? "TOP" : "BOT"} ${inning}`
    if (label !== previous) {
      items.push({ kind: "inning", id: `inning-${halfInning}-${inning}`, label })
      previous = label
    }
    items.push({ kind: "entry", entry })
  }

  return items
}
