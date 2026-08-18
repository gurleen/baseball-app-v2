import { Panel } from "@hydra-tv/ui"
import { PlayerCard } from "@hydra-tv/sports"

import type { GameSnapshot } from "../../shared/models.ts"
import { probablePitcherLine, startingLineup } from "../game/adapters.ts"
import { responsiveColumns, scrollX, shrinkable } from "../lib/layout.ts"
import { muted, numeric, stripedRow, table, td, th } from "../lib/table.ts"
import { copy } from "../lib/type.ts"
import { PlayerImage, playerPhotoUrl } from "./PlayerImage.tsx"
import { StatTable } from "./StatTable.tsx"
import { TeamLogo } from "./TeamLogo.tsx"

export function PreviewTab({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <div style={{ ...responsiveColumns(420), gap: "var(--sp-3)" }}>
      <PreviewTeam snapshot={snapshot} side="away" />
      <PreviewTeam snapshot={snapshot} side="home" />
    </div>
  )
}

function PreviewTeam({ snapshot, side }: { snapshot: GameSnapshot; side: "home" | "away" }) {
  const team = snapshot.teams[side]
  const box = snapshot.boxscore[side]
  const starter = probablePitcherLine(snapshot, side)
  const starterId = snapshot.probablePitchers[side] ?? starter?.playerId ?? null
  const player = starterId != null ? snapshot.players[starterId] : undefined
  const lineup = startingLineup(box)

  return (
    <Panel
      style={shrinkable}
      title={team.name.toUpperCase()}
      meta="PROJECTED STARTERS"
      actions={<TeamLogo teamId={team.id} width={28} />}
    >
      <div
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--bg-3)",
          padding: "var(--sp-3)",
          marginBottom: "var(--sp-3)",
        }}
      >
        <div style={{ ...muted, marginBottom: "var(--sp-2)" }}>STARTING PITCHER</div>
        {player ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            <PlayerCard
              name={player.fullName}
              number={player.jerseyNumber ?? undefined}
              position={player.pitchHand ? `Throws ${player.pitchHand}` : undefined}
              photo={playerPhotoUrl(player.id)}
              size="md"
              style={{ minWidth: 0 }}
            />
            {starter ? (
              <StatTable
                items={[
                  { label: "W-L", value: `${starter.wins}-${starter.losses}` },
                  { label: "ERA", value: starter.era },
                  { label: "IP", value: starter.seasonIp },
                  { label: "WHIP", value: starter.whip },
                  { label: "K", value: starter.seasonSo },
                  { label: "BB/9", value: starter.bbPer9 },
                ]}
              />
            ) : null}
          </div>
        ) : (
          <div style={muted}>Starting pitcher has not been announced yet.</div>
        )}
      </div>

      <div style={scrollX}>
        <table style={{ ...table, minWidth: 520 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "2.5rem", textAlign: "center" }}>#</th>
              <th style={th}>Batter</th>
              <th style={{ ...th, ...numeric, width: "3rem" }}>Pos</th>
              <th style={{ ...th, ...numeric, width: "3.5rem" }}>B/T</th>
              <th style={{ ...th, ...numeric }}>AVG</th>
              <th style={{ ...th, ...numeric }}>OBP</th>
              <th style={{ ...th, ...numeric }}>SLG</th>
              <th style={{ ...th, ...numeric }}>OPS</th>
              <th style={{ ...th, ...numeric }}>HR</th>
              <th style={{ ...th, ...numeric }}>RBI</th>
            </tr>
          </thead>
          <tbody>
            {lineup.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ ...td, ...muted, textAlign: "center" }}>
                  Starting lineup has not been posted yet.
                </td>
              </tr>
            ) : (
              lineup.map(({ slot, playerId, line }, index) => {
                const profile = snapshot.players[playerId]
                const hands = profile ? `${profile.batSide ?? "—"}/${profile.pitchHand ?? "—"}` : "—"
                return (
                  <tr key={playerId} style={stripedRow(index)}>
                    <td style={{ ...td, ...numeric, fontWeight: 700 }}>{slot}</td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", minWidth: 0 }}>
                        <PlayerImage playerId={playerId} size={40} />
                        <span style={{ ...muted, flexShrink: 0 }}>{profile?.jerseyNumber ?? ""}</span>
                        <span
                          style={{
                            ...copy,
                            fontSize: "var(--fs-14)",
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {profile?.fullName ?? line?.name ?? `#${playerId}`}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...td, ...numeric }}>{line?.position ?? profile?.position ?? "—"}</td>
                    <td style={{ ...td, ...numeric }}>{hands}</td>
                    <td style={{ ...td, ...numeric }}>{line?.avg ?? "—"}</td>
                    <td style={{ ...td, ...numeric }}>{line?.obp ?? "—"}</td>
                    <td style={{ ...td, ...numeric }}>{line?.slg ?? "—"}</td>
                    <td style={{ ...td, ...numeric }}>{line?.ops ?? "—"}</td>
                    <td style={{ ...td, ...numeric }}>{line?.hr ?? "—"}</td>
                    <td style={{ ...td, ...numeric }}>{line?.seasonRbi ?? "—"}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
