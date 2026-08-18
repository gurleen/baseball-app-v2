import { createFileRoute } from "@tanstack/react-router"
import { Panel, Spinner, Tabs } from "@hydra-tv/ui"
import { z } from "zod"

import { useGameStream } from "../game/useGameStream.ts"
import { canShowAtBat } from "../game/adapters.ts"
import { fullWidthColumn, scrollX } from "../lib/layout.ts"
import { typeLabel } from "../lib/type.ts"
import { GameHeader } from "../components/GameHeader.tsx"
import { AtBatTab } from "../components/AtBatTab.tsx"
import { BoxScoreTab } from "../components/BoxScoreTab.tsx"
import { PreviewTab } from "../components/PreviewTab.tsx"
import { AbsTab } from "../components/AbsTab.tsx"
import { SummaryTab } from "../components/SummaryTab.tsx"
import { SettingsTab } from "../components/SettingsTab.tsx"
import type { GameSnapshot } from "../../shared/models.ts"

const TABS = ["PREVIEW", "AT BAT", "OFFENSE", "PITCHING", "SUMMARY", "ABS", "SETTINGS"] as const
type TabId = (typeof TABS)[number]

const searchSchema = z.object({
  tab: z
    .enum(["PREVIEW", "AT BAT", "OFFENSE", "BATTING", "PITCHING", "SUMMARY", "ABS", "SETTINGS"])
    .optional()
    .transform((value): TabId | undefined => (value === "BATTING" ? "OFFENSE" : value)),
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

  const visible = visibleTabs(snapshot)
  const fallback = defaultTab(snapshot)
  const active: TabId = tab && visible.includes(tab) ? tab : fallback
  const setTab = (next: TabId) => navigate({ search: { tab: next }, replace: true })

  return (
    <div style={{ ...fullWidthColumn, padding: "var(--sp-4)", gap: "var(--sp-3)" }}>
      {!game.connected ? (
        <div
          style={{
            ...typeLabel,
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

      <GameHeader snapshot={snapshot} />

      {(game.delayMs > 0 || game.paused || game.queued > 0) && snapshot.state.kind === "live" ? (
        <div style={{ ...typeLabel, display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", color: "var(--fg-3)", fontSize: "var(--fs-10)" }}>
          {game.delayMs > 0 ? <span>DELAY {(game.delayMs / 1000).toFixed(1)}s</span> : null}
          {game.paused ? <span style={{ color: "var(--warn)" }}>PAUSED</span> : null}
          {game.queued > 0 ? <span>{game.queued} QUEUED</span> : null}
        </div>
      ) : null}

      <div>
        <div style={scrollX}>
          <Tabs tabs={visible} active={visible.indexOf(active)} onChange={index => setTab(visible[index]!)} />
        </div>
        <div style={{ marginTop: "var(--sp-3)" }}>
          {active === "PREVIEW" && <PreviewTab snapshot={snapshot} />}
          {active === "AT BAT" && <AtBatTab snapshot={snapshot} />}
          {active === "OFFENSE" && <BoxScoreTab snapshot={snapshot} preset="batting" />}
          {active === "PITCHING" && <BoxScoreTab snapshot={snapshot} preset="pitching" />}
          {active === "SUMMARY" && <SummaryTab snapshot={snapshot} />}
          {active === "ABS" && <AbsTab snapshot={snapshot} />}
          {active === "SETTINGS" && <SettingsTab game={game} />}
        </div>
      </div>
    </div>
  )
}

function visibleTabs(snapshot: GameSnapshot): TabId[] {
  return TABS.filter(tab => {
    if (tab === "AT BAT") return canShowAtBat(snapshot)
    if (tab === "ABS") return snapshot.abs !== null
    return true
  })
}

function defaultTab(snapshot: GameSnapshot): TabId {
  if (snapshot.state.kind === "preview") return "PREVIEW"
  if (snapshot.state.kind === "final") return "SUMMARY"
  if (canShowAtBat(snapshot)) return "AT BAT"
  return "PREVIEW"
}
