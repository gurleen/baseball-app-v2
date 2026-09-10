import type { CSSProperties } from 'react';

/** Accent fraction (% mixed into the row background) at full saturation. */
const MAX_MIX = 45;

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Diverging cell background for a value against its league baseline: below tints
 * toward `--info` (cool), above toward `--warn` (warm), saturating at `span`.
 * Returns undefined (leave the cell plain) when either number is missing or the
 * value sits exactly on the baseline.
 */
export function heatStyle(
	value: number | null,
	baseline: number | null,
	span: number
): CSSProperties | undefined {
	if (value == null || baseline == null || span <= 0) return undefined;

	const t = clamp((value - baseline) / span, -1, 1);
	const amount = Math.round(Math.abs(t) * MAX_MIX);
	if (amount === 0) return undefined;

	const accent = t > 0 ? 'var(--warn)' : 'var(--info)';
	return { background: `color-mix(in srgb, ${accent} ${amount}%, var(--bg-2))` };
}

/** Hover text: the value, its league baseline, and the signed delta. */
export function heatTitle(
	label: string,
	value: number | null,
	baseline: number | null,
	unit: string,
	digits = 1
): string {
	if (value == null) return `${label}: —`;

	const shown = `${value.toFixed(digits)} ${unit}`;
	if (baseline == null) return `${label}: ${shown} (no league average)`;

	const delta = value - baseline;
	const sign = delta >= 0 ? '+' : '';
	return `${label}: ${shown}\nLeague avg: ${baseline.toFixed(digits)} ${unit}\nDelta: ${sign}${delta.toFixed(digits)} ${unit}`;
}
