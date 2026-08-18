import { useState } from "react"
import { Button, FieldRow, Panel, Slider, Switch } from "@hydra-tv/ui"

import type { UseGameStreamResult } from "../game/useGameStream.ts"
import { responsiveColumns, shrinkable } from "../lib/layout.ts"

/**
 * Broadcast-delay calibration.
 *
 * A TV feed runs several seconds behind the data feed, so without this the
 * score updates before the viewer sees the pitch. The reliable way to measure
 * that offset is to let the viewer do it: pause, wait for the pitch you are
 * watching to appear on screen, resume — the elapsed time is the delay.
 */
export function SettingsTab({ game }: { game: UseGameStreamResult }) {
  const [pausedAt, setPausedAt] = useState<number | null>(null)

  const pause = () => {
    setPausedAt(Date.now())
    game.setPaused(true)
  }

  const resume = () => {
    if (pausedAt !== null) game.calibrateFrom(pausedAt)
    else game.setPaused(false)
    setPausedAt(null)
  }

  const nudge = (deltaMs: number) => game.setDelayMs(Math.max(0, game.delayMs + deltaMs))

  return (
    <div style={{ ...responsiveColumns(320), gap: "var(--sp-3)" }}>
      <Panel style={shrinkable} title="BROADCAST DELAY" meta={`${(game.delayMs / 1000).toFixed(1)}s`}>
        <FieldRow label="CALIBRATE">
          {game.paused ? (
            <Button label="RESUME ON PITCH" variant="accent" onClick={resume} />
          ) : (
            <Button label="PAUSE" onClick={pause} />
          )}
        </FieldRow>

        <FieldRow label="ADJUST">
          <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap" }}>
            <Button label="−1s" onClick={() => nudge(-1000)} />
            <Button label="+1s" onClick={() => nudge(1000)} />
            <Button label="RESET" onClick={game.reset} />
          </div>
        </FieldRow>

        {/* Stacked rather than in a FieldRow: the slider has a fixed width and
            will not fit beside a label on a narrow screen. */}
        <div style={{ display: "grid", gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
          <span style={{ color: "var(--fg-2)", fontSize: "var(--fs-10)", letterSpacing: "var(--label-tracking)" }}>
            DELAY
          </span>
          <Slider min={0} max={30000} step={250} value={game.delayMs} onChange={value => game.setDelayMs(value)} />
        </div>

        <FieldRow label="HOLD">
          <Switch checked={game.paused} onChange={checked => (checked ? pause() : resume())} />
        </FieldRow>

        <div style={{ color: "var(--fg-3)", fontSize: "var(--fs-13)", marginTop: "var(--sp-3)" }}>
          Press PAUSE, then RESUME the instant the current pitch reaches your screen. Everything
          after that is held back by the same amount.
        </div>
      </Panel>

      <Panel style={shrinkable} title="STREAM">
        <FieldRow label="CONNECTION">
          <span style={{ color: game.connected ? "var(--ok-text)" : "var(--warn)" }}>
            {game.connected ? "CONNECTED" : "RECONNECTING"}
          </span>
        </FieldRow>
        <FieldRow label="QUEUED">{String(game.queued)}</FieldRow>
        <FieldRow label="LAST EVENT">
          {game.lastEventAt ? new Date(game.lastEventAt).toLocaleTimeString() : "—"}
        </FieldRow>
        <FieldRow label="SHOWING">
          {game.lastDisplayedAt ? new Date(game.lastDisplayedAt).toLocaleTimeString() : "—"}
        </FieldRow>
      </Panel>
    </div>
  )
}
