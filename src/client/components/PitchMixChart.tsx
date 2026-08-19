import { useState, type CSSProperties } from "react"
import { Switch } from "@hydra-tv/ui"

import type { PitchMixEntry } from "../../shared/models.ts"
import { formatPitchMixBarSpeed, formatPitchMixBarValue, toPitchMixBars } from "../game/adapters.ts"
import { muted } from "../lib/table.ts"
import { data, typeLabel } from "../lib/type.ts"

const row: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 8,
	minWidth: 0,
}

const codeLabel: CSSProperties = {
	...typeLabel,
	width: "2.25rem",
	flexShrink: 0,
	fontSize: "var(--fs-10)",
	color: "var(--fg-2)",
	letterSpacing: "var(--label-tracking)",
	textTransform: "uppercase",
}

const track: CSSProperties = {
	flex: "1 1 0",
	minWidth: 0,
	height: 10,
	background: "#0a0d10",
	boxShadow: "var(--inset-well)",
	borderRadius: "var(--radius-1)",
	display: "flex",
	overflow: "hidden",
}

const speedCell: CSSProperties = {
	...data,
	width: "2.5rem",
	flexShrink: 0,
	textAlign: "right",
	whiteSpace: "nowrap",
	fontSize: "var(--fs-10)",
	color: "var(--fg-2)",
	fontFeatureSettings: "var(--numeric-features)",
}

const valueCell: CSSProperties = {
	...data,
	width: "4.75rem",
	flexShrink: 0,
	textAlign: "right",
	whiteSpace: "nowrap",
	fontSize: "var(--fs-11)",
	color: "var(--fg-1)",
	fontFeatureSettings: "var(--numeric-features)",
}

const header: CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	marginBottom: "var(--sp-2)",
	minWidth: 0,
}

/** Horizontal mix bars — fixed value gutter keeps every track the same width. */
export function PitchMixChart({
	today,
	season,
	pitcherName,
	style,
}: {
	today: PitchMixEntry[]
	season: PitchMixEntry[]
	pitcherName?: string
	style?: CSSProperties
}) {
	const [seasonView, setSeasonView] = useState(false)
	const entries = seasonView ? season : today
	const bars = toPitchMixBars(entries)
	const total = entries.reduce((sum, entry) => sum + entry.count, 0)
	const heading = pitcherName ? `${pitcherName} · ${total} P` : `${total} P`

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", ...style }}>
			<div style={header}>
				<div style={{ ...muted, fontSize: "var(--fs-10)", fontWeight: 700, minWidth: 0 }}>{heading}</div>
				<Switch checked={seasonView} onChange={setSeasonView} labels={["LIVE", "SEASON"]} />
			</div>
			{bars.length > 0 ? (
				bars.map(bar => (
					<div
						key={bar.label}
						style={row}
						title={`${bar.label}: ${formatPitchMixBarValue(bar)}${bar.averageSpeed != null ? ` · ${formatPitchMixBarSpeed(bar)}` : ""}`}
					>
						<span style={codeLabel}>{bar.label}</span>
						<span style={speedCell}>{formatPitchMixBarSpeed(bar)}</span>
						<span style={track}>
							<span
								style={{
									width: `${bar.value}%`,
									background: bar.color,
									transition: "width var(--t-med)",
								}}
							/>
						</span>
						<span style={valueCell}>{formatPitchMixBarValue(bar)}</span>
					</div>
				))
			) : seasonView ? (
				<div style={{ ...muted, textAlign: "center", padding: "var(--sp-2) 0" }}>No season mix.</div>
			) : null}
		</div>
	)
}
