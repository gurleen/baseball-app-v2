import { scrollX } from "../lib/layout.ts"
import { numeric, table, td, th } from "../lib/table.ts"

export function StatTable({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div style={scrollX}>
      <table style={table}>
        <thead>
          <tr>
            {items.map(item => (
              <th key={item.label} style={{ ...th, ...numeric }}>
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {items.map(item => (
              <td key={item.label} style={{ ...td, ...numeric }}>
                {item.value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
