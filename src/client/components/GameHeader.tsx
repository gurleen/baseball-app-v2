import type { CSSProperties, ReactNode } from "react"
import { BaseState, CountDisplay, LineScore, PlayerCard } from "@hydra-tv/sports"

import type { GameSnapshot, PlayerProfile } from "../../shared/models.ts"
import {
  batterSlash,
  currentLineup,
  displayedPlay,
  findBattingLine,
  findPitchingLine,
  offenseSide,
  periodLabel,
  probablePitcherLine,
} from "../game/adapters.ts"
import { formatTime } from "../lib/date.ts"
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"
import { muted } from "../lib/table.ts"
import { copy, data, typeLabel } from "../lib/type.ts"
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

const scoreGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 2.75rem 2.25rem 2.25rem",
  alignItems: "center",
  columnGap: "var(--sp-2)",
}

const rhe: CSSProperties = {
  ...data,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
}

export function GameHeader({ snapshot }: { snapshot: GameSnapshot }) {
  const { teams, linescore } = snapshot
  const live = snapshot.state.kind === "live"
  const dueUp = live ? upcomingHitters(snapshot) : null

  return (
    <div style={{ ...responsiveColumns(340), gap: "var(--sp-3)", alignItems: "stretch" }}>
      <div style={{ ...card, flexDirection: "row", alignItems: "stretch", gap: "var(--sp-4)" }}>
        <TeamScoreboard snapshot={snapshot} />
        {dueUp ? <DueUpColumn snapshot={snapshot} hitters={dueUp} /> : null}
        <StatusCluster snapshot={snapshot} />
      </div>

      <div style={{ ...card, minWidth: 0 }}>
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

        <div
          style={{
            borderTop: "1px solid var(--line-2)",
            paddingTop: "var(--sp-3)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <MatchupStrip snapshot={snapshot} />
        </div>
      </div>
    </div>
  )
}

function TeamScoreboard({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", minWidth: 0, flex: "0 1 auto", justifyContent: "center" }}>
      <div style={scoreGrid}>
        <span />
        <span style={{ ...rhe, ...muted }}>R</span>
        <span style={{ ...rhe, ...muted }}>H</span>
        <span style={{ ...rhe, ...muted }}>E</span>
      </div>
      <TeamScoreRow side="away" snapshot={snapshot} />
      <TeamScoreRow side="home" snapshot={snapshot} />
    </div>
  )
}

function TeamScoreRow({ side, snapshot }: { side: "home" | "away"; snapshot: GameSnapshot }) {
  const team = snapshot.teams[side]
  const line = snapshot.linescore[side]
  const franchise = team.franchiseName
  const club = team.clubName ?? team.shortName
  const showFranchise = franchise && franchise !== club

  return (
    <div style={scoreGrid}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", minWidth: 0 }}>
        <TeamLogo teamId={team.id} width={48} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              ...copy,
              display: "flex",
              flexWrap: "wrap",
              gap: "0.4em",
              fontSize: "var(--fs-18)",
              lineHeight: 1.15,
              overflow: "hidden",
            }}
          >
            {showFranchise ? <span style={{ color: "var(--fg-3)", fontWeight: 500 }}>{franchise}</span> : null}
            <span style={{ fontWeight: 700 }}>{club || team.name}</span>
          </div>
          {team.record ? <div style={muted}>{team.record}</div> : null}
        </div>
      </div>
      <div style={{ ...rhe, fontSize: "2rem", fontWeight: 800, lineHeight: 1 }}>{line.runs}</div>
      <div style={{ ...rhe, fontSize: "var(--fs-18)", fontWeight: 600 }}>{line.hits}</div>
      <div style={{ ...rhe, fontSize: "var(--fs-18)", fontWeight: 600 }}>{line.errors}</div>
    </div>
  )
}

function DueUpColumn({
  snapshot,
  hitters,
}: {
  snapshot: GameSnapshot
  hitters: { onDeck: number | null; inHole: number | null }
}) {
  return (
    <div
      className="hidden xl:flex"
      style={{
        flexDirection: "column",
        justifyContent: "center",
        gap: "var(--sp-3)",
        minWidth: 0,
        flex: "1 1 12rem",
        borderLeft: "1px solid var(--line-2)",
        borderRight: "1px solid var(--line-2)",
        paddingInline: "var(--sp-3)",
      }}
    >
      <DueUpPlayer snapshot={snapshot} playerId={hitters.onDeck} heading="ON DECK" />
      <DueUpPlayer snapshot={snapshot} playerId={hitters.inHole} heading="IN HOLE" />
    </div>
  )
}

function DueUpPlayer({ snapshot, playerId, heading }: { snapshot: GameSnapshot; playerId: number | null; heading: string }) {
  if (playerId == null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)", minWidth: 0 }}>
        <div style={muted}>{heading}</div>
        <div style={{ color: "var(--fg-3)", fontSize: "var(--fs-13)" }}>—</div>
      </div>
    )
  }

  const player = snapshot.players[playerId]
  const batting = findBattingLine(snapshot, playerId)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)", minWidth: 0, width: "100%" }}>
      <div style={muted}>{heading}</div>
      <PlayerCard
        name={player ? displayName(player) : `Player ${playerId}`}
        number={player?.jerseyNumber ?? undefined}
        photo={playerPhotoUrl(playerId)}
        position={player?.position ?? undefined}
        meta={batting?.summary ?? (batting ? batterSlash(batting) : undefined)}
        stats={
          batting
            ? [
                { label: "AVG", value: batting.avg },
                { label: "HR", value: batting.hr },
                { label: "RBI", value: batting.seasonRbi },
              ]
            : undefined
        }
        size="md"
        style={{ minWidth: 0, width: "100%" }}
      />
    </div>
  )
}

function StatusCluster({ snapshot }: { snapshot: GameSnapshot }) {
  const { state } = snapshot
  const live = state.kind === "live"

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--sp-2)",
        flexShrink: 0,
        paddingInline: "var(--sp-2)",
      }}
    >
      {state.kind === "final" ? (
        <div style={{ ...typeLabel, fontSize: "var(--fs-16)", fontWeight: 800, letterSpacing: "0.08em" }}>FINAL</div>
      ) : (
        <span style={{ ...typeLabel, fontWeight: 700, letterSpacing: "0.06em" }}>{periodLabel(snapshot) || state.detail.toUpperCase()}</span>
      )}

      {live ? (
        <BaseState
          first={state.bases.first}
          second={state.bases.second}
          third={state.bases.third}
          outs={state.outs}
          showOuts={false}
          size="md"
        />
      ) : null}

      {live ? (
        <CountDisplay balls={state.count.balls} strikes={state.count.strikes} outs={state.outs} size="md" />
      ) : state.kind === "final" ? null : (
        <>
          <div style={muted}>{formatTime(snapshot.datetime.startsAt)}</div>
          <div style={muted}>{snapshot.venue.name}</div>
        </>
      )}
    </div>
  )
}

function upcomingHitters(snapshot: GameSnapshot): { onDeck: number | null; inHole: number | null } | null {
  const side = offenseSide(snapshot)
  const play = displayedPlay(snapshot)
  const liveOnDeck = snapshot.currentPlay?.onDeckId ?? null
  if (!side || !play) return liveOnDeck != null ? { onDeck: liveOnDeck, inHole: null } : null

  const lineup = currentLineup(snapshot.boxscore[side])
  const index = lineup.findIndex(row => row.playerId === play.batterId)
  if (index < 0) {
    return liveOnDeck != null ? { onDeck: liveOnDeck, inHole: null } : null
  }

  const onDeck = lineup[(index + 1) % lineup.length]?.playerId ?? liveOnDeck
  const inHole = lineup[(index + 2) % lineup.length]?.playerId ?? null
  if (onDeck == null && inHole == null) return null
  return { onDeck: onDeck ?? null, inHole }
}

function MatchupStrip({ snapshot }: { snapshot: GameSnapshot }) {
  const { state } = snapshot

  if (state.kind === "final") {
    return <DecisionsStrip snapshot={snapshot} />
  }

  if (state.kind === "live") {
    const play = displayedPlay(snapshot)
    if (play) {
      const offense = offenseSide(snapshot)
      const battingAbbr = offense ? snapshot.teams[offense].abbreviation : undefined
      const pitchingAbbr = offense ? snapshot.teams[offense === "home" ? "away" : "home"].abbreviation : undefined
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", flex: 1, justifyContent: "center", minWidth: 0 }}>
          <div style={matchupGrid}>
            <PitcherSlot snapshot={snapshot} playerId={play.pitcherId} heading={pitchingAbbr ? `PITCHING ${pitchingAbbr}` : "PITCHING"} />
            <BatterSlot snapshot={snapshot} playerId={play.batterId} heading={battingAbbr ? `BATTING ${battingAbbr}` : "BATTING"} />
          </div>
          <PitchCaption play={play} />
        </div>
      )
    }
  }

  return <ProbableStrip snapshot={snapshot} />
}

function DecisionsStrip({ snapshot }: { snapshot: GameSnapshot }) {
  const decisions = snapshot.decisions
  return (
    <div style={matchupGrid}>
      <PitcherSlot snapshot={snapshot} playerId={decisions?.winnerId ?? null} heading="WINNER" />
      <PitcherSlot snapshot={snapshot} playerId={decisions?.loserId ?? null} heading="LOSER" />
      {decisions?.saveId != null ? <PitcherSlot snapshot={snapshot} playerId={decisions.saveId} heading="SAVE" /> : null}
    </div>
  )
}

function ProbableStrip({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <div style={matchupGrid}>
      <PitcherSlot
        snapshot={snapshot}
        playerId={snapshot.probablePitchers.away ?? probablePitcherLine(snapshot, "away")?.playerId ?? null}
        heading={`STARTING PITCHER ${snapshot.teams.away.abbreviation}`}
      />
      <PitcherSlot
        snapshot={snapshot}
        playerId={snapshot.probablePitchers.home ?? probablePitcherLine(snapshot, "home")?.playerId ?? null}
        heading={`STARTING PITCHER ${snapshot.teams.home.abbreviation}`}
      />
    </div>
  )
}

const matchupGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
  gap: "var(--sp-3)",
  minWidth: 0,
}

function PitcherSlot({ snapshot, playerId, heading }: { snapshot: GameSnapshot; playerId: number | null; heading: string }) {
  if (playerId == null) return <EmptySlot heading={heading} />

  const player = snapshot.players[playerId]
  const pitching = findPitchingLine(snapshot, playerId)

  return (
    <Slot heading={heading}>
      <PlayerCard
        name={player ? displayName(player) : `Player ${playerId}`}
        number={player?.jerseyNumber ?? undefined}
        position={player?.pitchHand ? `${player.pitchHand}HP` : (player?.position ?? undefined)}
        photo={playerPhotoUrl(playerId)}
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
        size="md"
        style={{ minWidth: 0 }}
      />
    </Slot>
  )
}

function BatterSlot({ snapshot, playerId, heading }: { snapshot: GameSnapshot; playerId: number; heading: string }) {
  const player = snapshot.players[playerId]
  const batting = findBattingLine(snapshot, playerId)

  return (
    <Slot heading={heading}>
      <PlayerCard
        name={player ? displayName(player) : `Player ${playerId}`}
        number={player?.jerseyNumber ?? undefined}
        position={player ? batterPosition(player) : undefined}
        photo={playerPhotoUrl(playerId)}
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
        size="md"
        style={{ minWidth: 0 }}
      />
    </Slot>
  )
}

function Slot({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)", minWidth: 0 }}>
      <div style={muted}>{heading}</div>
      {children}
    </div>
  )
}

function EmptySlot({ heading }: { heading: string }) {
  return (
    <Slot heading={heading}>
      <div style={{ color: "var(--fg-3)", fontSize: "var(--fs-13)" }}>—</div>
    </Slot>
  )
}

function PitchCaption({ play }: { play: NonNullable<ReturnType<typeof displayedPlay>> }) {
  const last = play.pitches.at(-1)
  const caption = last
    ? [last.type?.name, last.velocity ? `${last.velocity.start.toFixed(1)} mph` : null, last.call.name || last.description]
        .filter(Boolean)
        .join(" · ")
    : play.description

  if (!caption) return null
  return <div style={{ ...copy, color: "var(--fg-2)", fontSize: "var(--fs-13)", lineHeight: 1.4 }}>{caption}</div>
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
