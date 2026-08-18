import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Button, Panel, Spinner } from "@hydra-tv/ui"
import { z } from "zod"

import { orpc } from "../rpc/client.ts"
import { shiftDate, today } from "../lib/date.ts"
import { fullWidthColumn, responsiveColumns, shrinkable } from "../lib/layout.ts"
import { GameCard } from "../components/GameCard.tsx"

const searchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: SchedulePage,
})

function SchedulePage() {
  const { date } = Route.useSearch()
  const navigate = Route.useNavigate()
  const selected = date ?? today()

  const query = useQuery(
    orpc.schedule.byDate.queryOptions({
      input: { date: selected },
      // A live scoreboard should tick along without a manual refresh; the
      // individual game pages get real deltas over the socket instead.
      refetchInterval: 30_000,
    }),
  )

  const goTo = (next: string) => navigate({ search: { date: next }, replace: true })

  return (
    <div style={{ ...fullWidthColumn, padding: "var(--sp-4)", gap: "var(--sp-4)" }}>
      <Panel
        style={shrinkable}
        title="SCHEDULE"
        meta={query.data ? `${query.data.length} games` : undefined}
        actions={
          <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", flexWrap: "wrap" }}>
            <Button label="◀" onClick={() => goTo(shiftDate(selected, -1))} />
            <input
              type="date"
              value={selected}
              onChange={event => goTo(event.target.value)}
              style={{
                background: "var(--bg-3)",
                color: "var(--fg-1)",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--radius-1)",
                font: "inherit",
                fontSize: "var(--fs-11)",
                height: "var(--ctl-h)",
                padding: "0 var(--sp-2)",
              }}
            />
            <Button label="▶" onClick={() => goTo(shiftDate(selected, 1))} />
            <Button label="TODAY" onClick={() => goTo(today())} />
          </div>
        }
      >
        {query.isPending ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-6)" }}>
            <Spinner />
          </div>
        ) : query.isError ? (
          <div style={{ color: "var(--err)" }}>
            Could not load the schedule: {(query.error as Error).message}
          </div>
        ) : query.data.length === 0 ? (
          <div style={{ color: "var(--fg-3)" }}>No games scheduled.</div>
        ) : (
          <div
            style={{ ...responsiveColumns(380), gap: "var(--sp-3)" }}
          >
            {query.data.map(game => (
              <GameCard key={game.gamePk} game={game} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
