import type { CSSProperties } from "react"
import { Link } from "@tanstack/react-router"
import { BaseState, CountDisplay, PlayerCard } from "@hydra-tv/sports"

import type { ScheduleGame, SchedulePlayer, ScheduleTeam } from "../../server/procedures/schedule.ts"
import { formatTime } from "../lib/date.ts"
import { shrinkable } from "../lib/layout.ts"
import { data, typeLabel } from "../lib/type.ts"
import { playerPhotoUrl } from "./PlayerImage.tsx"
import { TeamLogo } from "./TeamLogo.tsx"

const card: CSSProperties = {
  ...shrinkable,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "var(--bg-2)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--radius-1)",
  padding: "var(--sp-3)",
  color: "var(--fg-1)",
  textDecoration: "none",
}

const divider: CSSProperties = {
  borderTop: "1px solid var(--line-2)",
  margin: "var(--sp-2) 0",
}

const teamGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 2.25rem 2.25rem 2.25rem",
  alignItems: "center",
  columnGap: "var(--sp-1)",
}

const rhe: CSSProperties = {
  ...data,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
}

const label: CSSProperties = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--fs-10)",
  color: "var(--fg-3)",
  letterSpacing: "0.04em",
}

export function GameCard({ game }: { game: ScheduleGame }) {
  const live = game.status.isLive && !game.status.isWarmup
  const between = game.inning?.state === "Middle" || game.inning?.state === "End"
  const showAtBat = live && !between
  const showStarters = (!game.status.isLive || game.status.isWarmup) && !game.status.isFinal
  const showDueUp = live && between
  const showDecisions = game.status.isFinal

  return (
    <Link to="/game/$gamePk" params={{ gamePk: String(game.gamePk) }} style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--sp-2)" }}>
        <span style={{ ...typeLabel, fontWeight: 700, fontSize: "var(--fs-12)" }}>{statusLabel(game)}</span>
      </div>

      <div style={divider} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: live ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)",
          gap: "var(--sp-3)",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <div style={teamGrid}>
            <span />
            <span style={{ ...rhe, ...label }}>R</span>
            <span style={{ ...rhe, ...label }}>H</span>
            <span style={{ ...rhe, ...label }}>E</span>
          </div>
          <TeamRow team={game.teams.away} />
          <TeamRow team={game.teams.home} />
        </div>

        {live && game.situation ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--sp-2)",
              paddingInline: "var(--sp-2)",
            }}
          >
            <BaseState
              first={game.situation.bases.first}
              second={game.situation.bases.second}
              third={game.situation.bases.third}
              outs={game.situation.outs}
              size="sm"
            />
            <CountDisplay
              balls={game.situation.balls}
              strikes={game.situation.strikes}
              showOuts={false}
              size="sm"
            />
          </div>
        ) : null}
      </div>

      <div style={divider} />

      {showAtBat && game.situation ? (
        <Matchup
          left={{
            heading: `PITCHING ${pitchingAbbr(game)}`,
            player: game.situation.pitcher,
          }}
          right={{
            heading: `BATTING ${battingAbbr(game)}`,
            player: game.situation.batter,
          }}
        />
      ) : null}

      {showStarters ? (
        <Matchup
          left={{
            heading: `STARTING PITCHER ${game.teams.away.abbreviation}`,
            player: game.teams.away.probablePitcher,
          }}
          right={{
            heading: `STARTING PITCHER ${game.teams.home.abbreviation}`,
            player: game.teams.home.probablePitcher,
          }}
        />
      ) : null}

      {showDueUp && game.situation ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <span style={label}>DUE UP</span>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--sp-2)", minWidth: 0 }}>
            <MatchupPlayer player={game.situation.batter} useGameStats />
            <MatchupPlayer player={game.situation.onDeck} useGameStats />
            <MatchupPlayer player={game.situation.inHole} useGameStats />
          </div>
        </div>
      ) : null}

      {showDecisions && game.decisions ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--sp-3)",
          }}
        >
          <PlayerSlot heading="WINNER" player={game.decisions.winner} useGameStats />
          <PlayerSlot heading="LOSER" player={game.decisions.loser} useGameStats />
          {game.decisions.save ? <PlayerSlot heading="SAVE" player={game.decisions.save} useGameStats /> : null}
        </div>
      ) : null}
    </Link>
  )
}

function TeamRow({ team }: { team: ScheduleTeam }) {
  return (
    <div style={teamGrid}>
      <span style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", minWidth: 0 }}>
        <TeamLogo teamId={team.id} width={30} />
        <span
          style={{
            fontSize: "var(--fs-14)",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {team.shortName || team.name}
        </span>
      </span>
      <span style={{ ...rhe, fontSize: "var(--fs-16)", fontWeight: 800 }}>{dash(team.score)}</span>
      <span style={{ ...rhe, fontSize: "var(--fs-16)", fontWeight: 400 }}>{dash(team.hits)}</span>
      <span style={{ ...rhe, fontSize: "var(--fs-16)", fontWeight: 400 }}>{dash(team.errors)}</span>
    </div>
  )
}

function Matchup({
  left,
  right,
}: {
  left: { heading: string; player: SchedulePlayer | null }
  right: { heading: string; player: SchedulePlayer | null }
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)", minWidth: 0 }}>
      <PlayerSlot heading={left.heading} player={left.player} />
      <PlayerSlot heading={right.heading} player={right.player} />
    </div>
  )
}

function PlayerSlot({
  heading,
  player,
  useGameStats,
}: {
  heading: string
  player: SchedulePlayer | null
  useGameStats?: boolean
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)", minWidth: 0 }}>
      <span style={label}>{heading}</span>
      <MatchupPlayer player={player} useGameStats={useGameStats} />
    </div>
  )
}

function MatchupPlayer({ player, useGameStats }: { player: SchedulePlayer | null; useGameStats?: boolean }) {
  if (!player) return null

  const summary = (useGameStats ? player.gameSummary : player.statsSummary) ?? undefined

  return (
    <PlayerCard
      name={player.lastName}
      photo={playerPhotoUrl(player.id)}
      meta={summary}
      size="sm"
      style={{ minWidth: 0 }}
    />
  )
}

function dash(value: number | null): string {
  return value == null ? "—" : String(value)
}

function battingAbbr(game: ScheduleGame): string {
  return game.inning?.half === "bottom" ? game.teams.home.abbreviation : game.teams.away.abbreviation
}

function pitchingAbbr(game: ScheduleGame): string {
  return game.inning?.half === "bottom" ? game.teams.away.abbreviation : game.teams.home.abbreviation
}

function statusLabel(game: ScheduleGame): string {
  if (game.status.isWarmup) return `WARMUP · ${formatTime(game.startsAt)}`
  if (game.status.isFinal) {
    return game.inning && game.inning.number > 9 ? `FINAL/${game.inning.number}` : "FINAL"
  }
  if (game.status.isPreview) return formatTime(game.startsAt).toUpperCase()

  if (game.inning) {
    const { state, number, half } = game.inning
    if (state === "Middle" || state === "End") return `${state.toUpperCase()} ${number}`
    return `${half === "bottom" ? "BOT" : "TOP"} ${number}`
  }

  return `${game.status.detail.toUpperCase()} · ${formatTime(game.startsAt)}`
}
