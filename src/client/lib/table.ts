import type { CSSProperties } from "react"

export const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: "var(--font-data)",
  fontSize: "var(--fs-11)",
  textAlign: "left",
}

export const th: CSSProperties = {
  padding: "var(--sp-2) var(--sp-3)",
  color: "var(--fg-3)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  background: "var(--bg-3)",
  whiteSpace: "nowrap",
}

export const td: CSSProperties = {
  padding: "var(--sp-2) var(--sp-3)",
  borderTop: "1px solid var(--line-2)",
  verticalAlign: "middle",
}

export const numeric: CSSProperties = {
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
}

export const muted: CSSProperties = {
  color: "var(--fg-3)",
  fontSize: "var(--fs-10)",
  letterSpacing: "0.04em",
}

export function stripedRow(index: number): CSSProperties | undefined {
  return index % 2 === 1 ? { background: "var(--bg-3)" } : undefined
}
