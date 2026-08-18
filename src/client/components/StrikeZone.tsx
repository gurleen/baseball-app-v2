import { StrikeZonePlot, type StrikeZonePlotProps } from "@hydra-tv/sports"

import { formatZoneBounds } from "../game/adapters.ts"
import { muted } from "../lib/table.ts"

/** StrikeZonePlot plus the batter's zone top/bottom in feet — the plot itself has no ticks. */
export function LabeledStrikeZonePlot(props: StrikeZonePlotProps) {
  const caption = formatZoneBounds({ zoneTop: props.zoneTop, zoneBottom: props.zoneBottom })

  return (
    <div>
      <StrikeZonePlot {...props} />
      {caption ? (
        <div style={{ ...muted, fontVariantNumeric: "tabular-nums", marginTop: "var(--sp-1)" }}>{caption}</div>
      ) : null}
    </div>
  )
}
