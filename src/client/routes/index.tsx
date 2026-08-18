import { Link, createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Button, Panel, Spinner } from "@hydra-tv/ui"
import { Scoreboard, inningLabel } from "@hydra-tv/sports"
import { z } from "zod"

import { orpc } from "../rpc/client.ts"
import { formatTime, shiftDate, today } from "../lib/date.ts"
import { fullWidthColumn, responsiveColumns, shrinkable } from "../lib/layout.ts"
import type { ScheduleGame } from "../../server/procedures/schedule.ts"

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
            style={{ ...responsiveColumns(320), gap: "var(--sp-3)" }}
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

function GameCard({ game }: { game: ScheduleGame }) {
  const period = gamePeriodLabel(game)

  return (
    <Link to="/game/$gamePk" params={{ gamePk: String(game.gamePk) }} style={{ textDecoration: "none" }}>
      <Scoreboard
        away={{
          abbr: game.teams.away.abbreviation || game.teams.away.name,
          score: game.teams.away.score ?? 0,
          record: game.teams.away.record ?? undefined,
        }}
        home={{
          abbr: game.teams.home.abbreviation || game.teams.home.name,
          score: game.teams.home.score ?? 0,
          record: game.teams.home.record ?? undefined,
        }}
        period={period}
        detail={game.venue ?? undefined}
        status={game.status.isLive ? "live" : game.status.isFinal ? "final" : "scheduled"}
      />
    </Link>
  )
}

/**
 * The label above the score. Scoreboard already renders FINAL/LIVE from
 * `status`, so a finished game only adds an inning when it went to extras —
 * otherwise the card reads "FINAL" twice.
 */
function gamePeriodLabel(game: ScheduleGame): string {
  if (game.status.isPreview) return formatTime(game.startsAt)

  // Scoreboard renders "FINAL" from `status`, so this only adds the inning
  // count when the game went past regulation.
  if (game.status.isFinal) {
    return game.inning && game.inning.number > 9 ? `${game.inning.number} INN` : ""
  }

  if (game.inning) {
    // "Middle"/"End" mean between halves, when no batter is up.
    const { state, number, half } = game.inning
    if (state === "Middle" || state === "End") return `${state.toUpperCase()} ${number}`
    return inningLabel(number, half ?? undefined)
  }

  return game.status.detail.toUpperCase()
}
