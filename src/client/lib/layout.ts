import type { CSSProperties } from "react";

/**
 * Grid items default to `min-width: auto`, which means they refuse to shrink
 * below their content's intrinsic width — so a wide table inside a grid pushes
 * the whole page sideways instead of scrolling within itself. `minmax(0, ...)`
 * on the track and `minWidth: 0` on the item are the two halves of the fix.
 */
export const fullWidthColumn: CSSProperties = {
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr)",
};

/** Responsive columns that collapse to one before overflowing. */
export function responsiveColumns(minPx: number): CSSProperties {
	return {
		display: "grid",
		gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minPx}px), 1fr))`,
	};
}

/** Applied to each grid item so it can shrink and scroll internally. */
export const shrinkable: CSSProperties = { minWidth: 0 };

/**
 * Wraps content wider than the viewport, e.g. a linescore or a box score.
 * `overflowY: hidden` is required: setting only `overflowX` makes the other
 * axis compute to `auto`, which lets a 1px-taller child become a vertical
 * drag surface on mobile.
 */
export const scrollX: CSSProperties = { overflowX: "auto", overflowY: "hidden", minWidth: 0 };
