import { useState, type CSSProperties, type ReactNode } from "react"
import { Badge } from "@hydra-tv/ui"
import { PitchSequence } from "@hydra-tv/sports"

import type { Pitch, PlaySummary } from "../../shared/models.ts"
import { zoneBounds } from "../game/adapters.ts"
import { usePitchHover } from "../game/usePitchHover.ts"
import { scrollX } from "../lib/layout.ts"
import { copy, data } from "../lib/type.ts"
import { PlayerImage } from "./PlayerImage.tsx"
import { LabeledStrikeZonePlot } from "./StrikeZone.tsx"

const card: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-2)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-1)",
  background: "var(--bg-2)",
  padding: "var(--sp-3)",
}

export function PlayCard({
  playerId,
  badge,
  scorecard,
  description,
  pitches,
  scoring,
  hit,
  expandable,
}: {
  playerId?: number
  badge: string
  scorecard?: string | null
  description: string
  pitches?: Pitch[]
  scoring?: boolean
  hit?: { exitVelocity: number | null; launchAngle: number | null; distance: number | null } | null
  expandable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const canExpand = Boolean(expandable && pitches && pitches.length > 0)
  const bounds = pitches ? zoneBounds(pitches) : {}
  const hover = usePitchHover(pitches ?? [], pitches?.[0]?.atBatIndex)

  return (
    <div
      style={{
        ...card,
        background: scoring ? "var(--warn-bg)" : "var(--bg-2)",
        borderColor: scoring ? "var(--warn)" : "var(--line-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--sp-3)", minWidth: 0 }}>
        {playerId != null ? <PlayerImage playerId={playerId} size={48} /> : <div style={{ width: 48, height: 48, background: "var(--bg-3)", flexShrink: 0 }} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--sp-2)" }}>
            <Badge label={badge.toUpperCase()} kind={scoring ? "warn" : "neutral"} />
            {scorecard ? (
              <span style={{ ...data, fontWeight: 800, letterSpacing: "0.08em", fontSize: "var(--fs-14)" }}>{scorecard}</span>
            ) : null}
          </div>
          <p style={{ ...copy, margin: "var(--sp-2) 0 0", fontSize: "var(--fs-13)", lineHeight: 1.4 }}>{description}</p>
          {hit ? <HitLine hit={hit} /> : null}
        </div>
        {canExpand ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Collapse plate appearance" : "Expand plate appearance"}
            onClick={() => setOpen(value => !value)}
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              border: "1px solid var(--line-2)",
              background: "var(--bg-3)",
              color: "var(--fg-2)",
              cursor: "pointer",
            }}
          >
            {open ? "−" : "+"}
          </button>
        ) : null}
      </div>
      {canExpand && open && pitches ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
            gap: "var(--sp-3)",
            borderTop: "1px solid var(--line-2)",
            paddingTop: "var(--sp-3)",
          }}
        >
          <LabeledStrikeZonePlot
            pitches={hover.zonePitches}
            {...bounds}
            colorBy="result"
            width="100%"
            legend={false}
            focused={hover.zoneFocused}
            onFocus={hover.onZoneFocus}
          />
          <div style={scrollX}>
            <PitchSequence
              pitches={hover.sequencePitches}
              {...bounds}
              showSpin
              showLocation={false}
              dense
              focused={hover.sequenceFocused}
              onFocus={hover.onSequenceFocus}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function HitLine({
  hit,
}: {
  hit: { exitVelocity: number | null; launchAngle: number | null; distance: number | null }
}) {
  const cells: ReactNode[] = []
  if (hit.exitVelocity != null) {
    cells.push(<HitCell key="ev" label="EV" value={`${hit.exitVelocity.toFixed(1)} mph`} hot={hit.exitVelocity >= 95} />)
  }
  if (hit.launchAngle != null) {
    cells.push(<HitCell key="la" label="LA" value={`${hit.launchAngle.toFixed(1)} deg`} />)
  }
  if (hit.distance != null) {
    cells.push(<HitCell key="dist" label="DIST" value={`${Math.round(hit.distance)} ft`} />)
  }
  if (cells.length === 0) return null

  return <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>{cells}</div>
}

function HitCell({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-1)", fontSize: "var(--fs-10)" }}>
      <span style={{ background: "var(--bg-3)", padding: "0 var(--sp-1)", fontWeight: 700 }}>{label}</span>
      <span style={{ color: hot ? "var(--warn)" : "var(--fg-2)", textDecoration: "underline" }}>{value}</span>
    </span>
  )
}

export function hitFromPitches(pitches: Pitch[]) {
  for (let index = pitches.length - 1; index >= 0; index -= 1) {
    const batted = pitches[index]?.metrics?.battedBall
    if (!batted) continue
    return {
      exitVelocity: batted.exitVelocity,
      launchAngle: batted.launchAngle,
      distance: batted.distance,
    }
  }
  return null
}

export function playBadge(play: PlaySummary): string {
  return play.event ?? play.eventType ?? "Play"
}
