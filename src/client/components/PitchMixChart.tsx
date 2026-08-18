import type { CSSProperties } from "react"

import { formatPitchMixBarValue, type PitchMixBar } from "../game/adapters.ts"
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

/** Horizontal mix bars — fixed value gutter keeps every track the same width. */
export function PitchMixChart({ bars, style }: { bars: PitchMixBar[]; style?: CSSProperties }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", ...style }}>
			{bars.map(bar => (
				<div key={bar.label} style={row} title={`${bar.label}: ${formatPitchMixBarValue(bar)}`}>
					<span style={codeLabel}>{bar.label}</span>
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
			))}
		</div>
	)
}
