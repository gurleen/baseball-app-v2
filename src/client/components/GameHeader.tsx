import type { CSSProperties } from "react"
import { BaseState, CountDisplay, LineScore, PlayerCard } from "@hydra-tv/sports"

import type { GameSnapshot, PlayerProfile } from "../../shared/models.ts"
import {
  batterSlash,
  displayedPlay,
  findBattingLine,
  findPitchingLine,
  periodLabel,
} from "../game/adapters.ts"
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"
import { muted } from "../lib/table.ts"
import { playerPhotoUrl } from "./PlayerImage.tsx"
import { TeamLogo } from "./TeamLogo.tsx"

const card: CSSProperties = {
  ...shrinkable,
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-3)",
  background: "var(--bg-2)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-1)",
  padding: "var(--sp-3)",
}

export function GameHeader({ snapshot }: { snapshot: GameSnapshot }) {
  const { state, teams, linescore } = snapshot
  const live = state.kind === "live"
  const play = live ? displayedPlay(snapshot) : null

  return (
    <div style={{ ...responsiveColumns(320), gap: "var(--sp-3)", alignItems: "stretch" }}>
      <div style={{ ...card, gap: "var(--sp-2)", justifyContent: "center" }}>
        <TeamScoreRow side="away" snapshot={snapshot} />
        <TeamScoreRow side="home" snapshot={snapshot} />
      </div>

      <div style={{ ...card, minWidth: 0, justifyContent: "space-between" }}>
        <div style={scrollX}>
          <LineScore
            away={{
              abbr: teams.away.abbreviation,
              innings: linescore.away.innings,
              runs: linescore.away.runs,
              hits: linescore.away.hits,
              errors: linescore.away.errors,
            }}
            home={{
              abbr: teams.home.abbreviation,
              innings: linescore.home.innings,
              runs: linescore.home.runs,
              hits: linescore.home.hits,
              errors: linescore.home.errors,
            }}
            innings={linescore.scheduledInnings}
            currentInning={linescore.currentInning ?? undefined}
          />
        </div>

        {state.kind === "final" ? (
          <div style={{ fontSize: "var(--fs-16)", fontWeight: 800, letterSpacing: "0.08em", textAlign: "center" }}>
            FINAL
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--sp-4)",
            }}
          >
            <span style={{ fontWeight: 700, letterSpacing: "0.06em" }}>{periodLabel(snapshot) || state.detail.toUpperCase()}</span>
            {live ? (
              <BaseState
                first={state.bases.first}
                second={state.bases.second}
                third={state.bases.third}
                outs={state.outs}
                size="sm"
              />
            ) : null}
            {live ? (
              <CountDisplay
                balls={state.count.balls}
                strikes={state.count.strikes}
                outs={state.outs}
                showOuts={false}
                horizontal
                size="sm"
              />
            ) : null}
          </div>
        )}
      </div>

      {play && live ? <MatchupColumn snapshot={snapshot} batterId={play.batterId} pitcherId={play.pitcherId} /> : null}
    </div>
  )
}

function TeamScoreRow({ side, snapshot }: { side: "home" | "away"; snapshot: GameSnapshot }) {
  const team = snapshot.teams[side]
  const score = snapshot.linescore[side].runs
  const franchise = team.franchiseName
  const club = team.clubName ?? team.shortName
  const showFranchise = franchise && franchise !== club

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--sp-3)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", minWidth: 0 }}>
        <TeamLogo teamId={team.id} width={56} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4em", fontSize: "var(--fs-14)", lineHeight: 1.2 }}>
            {showFranchise ? <span style={{ color: "var(--fg-3)" }}>{franchise}</span> : null}
            <span style={{ fontWeight: 700 }}>{club || team.name}</span>
          </div>
          {team.record ? <div style={muted}>{team.record}</div> : null}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          fontSize: "2.25rem",
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          background: "var(--bg-3)",
          border: "1px solid var(--line-2)",
          padding: "var(--sp-2) var(--sp-3)",
        }}
      >
        {score}
      </div>
    </div>
  )
}

function MatchupColumn({
  snapshot,
  batterId,
  pitcherId,
}: {
  snapshot: GameSnapshot
  batterId: number
  pitcherId: number
}) {
  const pitcher = snapshot.players[pitcherId]
  const batter = snapshot.players[batterId]
  const pitching = findPitchingLine(snapshot, pitcherId)
  const batting = findBattingLine(snapshot, batterId)

  return (
    <div style={{ ...card, gap: "var(--sp-4)" }}>
      {pitcher ? (
        <div>
          <div style={{ ...muted, marginBottom: "var(--sp-1)" }}>PITCHING</div>
          <PlayerCard
            name={displayName(pitcher)}
            number={pitcher.jerseyNumber ?? undefined}
            position={pitcher.pitchHand ? `${pitcher.pitchHand}HP` : (pitcher.position ?? undefined)}
            photo={playerPhotoUrl(pitcher.id)}
            meta={pitcherMeta(pitching)}
            stats={
              pitching
                ? [
                    { label: "W-L", value: `${pitching.wins}-${pitching.losses}` },
                    { label: "ERA", value: pitching.era },
                    { label: "IP", value: pitching.seasonIp },
                  ]
                : undefined
            }
            size="sm"
            style={{ minWidth: 0 }}
          />
        </div>
      ) : null}

      {batter ? (
        <div>
          <div style={{ ...muted, marginBottom: "var(--sp-1)" }}>BATTING</div>
          <PlayerCard
            name={displayName(batter)}
            number={batter.jerseyNumber ?? undefined}
            position={batterPosition(batter)}
            photo={playerPhotoUrl(batter.id)}
            meta={batterMeta(batting)}
            stats={
              batting
                ? [
                    { label: "AVG", value: batting.avg },
                    { label: "HR", value: batting.hr },
                    { label: "RBI", value: batting.seasonRbi },
                  ]
                : undefined
            }
            size="sm"
            style={{ minWidth: 0 }}
          />
        </div>
      ) : null}
    </div>
  )
}

function displayName(player: PlayerProfile): string {
  if (player.useName && player.lastName) return `${player.useName} ${player.lastName}`
  return player.fullName
}

function batterPosition(player: PlayerProfile): string | undefined {
  const pos = player.position ?? undefined
  if (!pos) return player.batSide && player.batSide !== "R" ? `(${player.batSide})` : undefined
  if (player.batSide && player.batSide !== "R") return `(${player.batSide}) ${pos}`
  return pos
}

function pitcherMeta(line: ReturnType<typeof findPitchingLine>): string | undefined {
  if (!line) return undefined
  const parts = [line.summary, line.pitches ? `${line.pitches} PIT (${line.strikes} STR)` : null].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : undefined
}

function batterMeta(line: ReturnType<typeof findBattingLine>): string | undefined {
  if (!line) return undefined
  const slash = batterSlash(line)
  const season = slash ? `${slash}, ${line.hr} HR, ${line.seasonRbi} RBI` : null
  const parts = [line.summary, season].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : undefined
}
