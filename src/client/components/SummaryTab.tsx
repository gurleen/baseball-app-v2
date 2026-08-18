import { Panel } from "@hydra-tv/ui"
import { PlayByPlay, SprayChart } from "@hydra-tv/sports"

import type { GameSnapshot } from "../../shared/models.ts"
import { toPlayByPlayRows, toSprayBalls } from "../game/adapters.ts"
import { responsiveColumns, shrinkable } from "../lib/layout.ts"

export function SummaryTab({ snapshot }: { snapshot: GameSnapshot }) {
  const balls = toSprayBalls(snapshot.plays)

  return (
    <div style={{ ...responsiveColumns(320), gap: "var(--sp-3)" }}>
      <Panel style={shrinkable} title="PLAY BY PLAY" meta={`${snapshot.plays.length} at-bats`} padded={false}>
        <PlayByPlay events={toPlayByPlayRows(snapshot.plays)} height={480} newestFirst />
      </Panel>

      <Panel style={shrinkable} title="BATTED BALLS" meta={balls.length ? `${balls.length} tracked` : "no Statcast data yet"}>
        {balls.length > 0 ? (
          <SprayChart battedBalls={balls} />
        ) : (
          <div style={{ color: "var(--fg-3)" }}>Statcast has not published batted balls for this game.</div>
        )}
      </Panel>
    </div>
  )
}
