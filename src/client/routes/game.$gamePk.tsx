import { createFileRoute } from "@tanstack/react-router"
import { Panel, Spinner, Tabs } from "@hydra-tv/ui"
import { BaseState, CountDisplay, LineScore, Scoreboard } from "@hydra-tv/sports"
import { z } from "zod"

import { useGameStream } from "../game/useGameStream.ts"
import { periodLabel } from "../game/adapters.ts"
import { fullWidthColumn, scrollX } from "../lib/layout.ts"
import { AtBatTab } from "../components/AtBatTab.tsx"
import { BoxScoreTab } from "../components/BoxScoreTab.tsx"
import { SummaryTab } from "../components/SummaryTab.tsx"
import { SettingsTab } from "../components/SettingsTab.tsx"

const TABS = ["AT BAT", "BATTING", "PITCHING", "SUMMARY", "SETTINGS"] as const
type TabId = (typeof TABS)[number]

const searchSchema = z.object({
  tab: z.enum(TABS).optional(),
})

export const Route = createFileRoute("/game/$gamePk")({
  validateSearch: searchSchema,
  component: GamePage,
})

function GamePage() {
  const { gamePk } = Route.useParams()
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()

  const game = useGameStream(Number(gamePk))
  const snapshot = game.displayed

  // Tab lives in the URL so a particular view is linkable — v1 kept it in
  // component state, so you could never share "the pitching tab of this game".
  const active: TabId = tab ?? "AT BAT"
  const setTab = (next: TabId) => navigate({ search: { tab: next }, replace: true })

  // Only a failure with nothing to show is fatal. Once a snapshot has arrived,
  // a dropped socket keeps rendering the last known state behind a banner —
  // the stream resubscribes on its own, and blanking the page for a two-second
  // blip loses the viewer's scroll position and tab for no reason.
  if (!snapshot) {
    if (game.error) {
      return (
        <div style={{ padding: "var(--sp-4)" }}>
          <Panel title="GAME">
            <div style={{ color: "var(--err)" }}>Could not load this game.</div>
            <div style={{ color: "var(--fg-3)", fontSize: "var(--fs-10)", marginTop: "var(--sp-2)" }}>
              {game.error.message}
            </div>
          </Panel>
        </div>
      )
    }

    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-7)" }}>
        <Spinner />
      </div>
    )
  }

  const { state, teams, linescore } = snapshot

  return (
    <div style={{ ...fullWidthColumn, padding: "var(--sp-4)", gap: "var(--sp-3)" }}>
      {!game.connected ? (
        <div
          style={{
            background: "var(--warn-bg)",
            border: "1px solid var(--warn)",
            borderRadius: "var(--radius-1)",
            color: "var(--warn)",
            fontSize: "var(--fs-10)",
            padding: "var(--sp-2) var(--sp-3)",
          }}
        >
          RECONNECTING — SHOWING LAST KNOWN STATE
        </div>
      ) : null}

      <div style={scrollX}>
        <Scoreboard
        away={{ abbr: teams.away.abbreviation, score: linescore.away.runs, name: teams.away.name }}
        home={{ abbr: teams.home.abbreviation, score: linescore.home.runs, name: teams.home.name }}
        period={periodLabel(snapshot)}
        // Scoreboard renders FINAL/LIVE from `status`, so `detail` carries the
        // situation line instead of repeating the status.
        detail={
          state.kind === "live"
            ? `${state.outs} OUT · ${state.count.balls}-${state.count.strikes}`
            : state.kind === "final"
              ? snapshot.venue.name.toUpperCase()
              : state.detail.toUpperCase()
        }
        status={state.kind === "live" ? "live" : state.kind === "final" ? "final" : "scheduled"}
          size="lg"
        >
        {state.kind === "live" ? (
          <BaseState
            first={state.bases.first}
            second={state.bases.second}
            third={state.bases.third}
            outs={state.outs}
            size="sm"
          />
        ) : undefined}
        </Scoreboard>
      </div>

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

      <div>
        <div style={scrollX}>
          <Tabs tabs={[...TABS]} active={TABS.indexOf(active)} onChange={index => setTab(TABS[index]!)} />
        </div>
        <div style={{ marginTop: "var(--sp-3)" }}>
          {active === "AT BAT" && <AtBatTab snapshot={snapshot} />}
          {active === "BATTING" && <BoxScoreTab snapshot={snapshot} preset="batting" />}
          {active === "PITCHING" && <BoxScoreTab snapshot={snapshot} preset="pitching" />}
          {active === "SUMMARY" && <SummaryTab snapshot={snapshot} />}
          {active === "SETTINGS" && <SettingsTab game={game} />}
        </div>
      </div>

      {state.kind === "live" ? (
        <div
          style={{
            display: "flex",
            gap: "var(--sp-4)",
            alignItems: "center",
            flexWrap: "wrap",
            color: "var(--fg-3)",
            fontSize: "var(--fs-10)",
          }}
        >
          <CountDisplay balls={state.count.balls} strikes={state.count.strikes} outs={state.outs} horizontal size="sm" />
          {game.delayMs > 0 ? <span>DELAY {(game.delayMs / 1000).toFixed(1)}s</span> : null}
          {game.paused ? <span style={{ color: "var(--warn)" }}>PAUSED</span> : null}
          {game.queued > 0 ? <span>{game.queued} QUEUED</span> : null}
        </div>
      ) : null}
    </div>
  )
}
