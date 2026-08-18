import type { QueryClient } from "@tanstack/react-query"
import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { Badge, NavBar } from "@hydra-tv/ui"
import { useQuery } from "@tanstack/react-query"

import { orpc } from "../rpc/client.ts"

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const info = useQuery(orpc.system.info.queryOptions({ input: {}, staleTime: Infinity }))
  const replay = info.data?.replay

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-1)", color: "var(--fg-1)", fontFamily: "var(--font-mono)" }}
    >
      <NavBar
        brand={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <Link to="/" style={{ color: "var(--fg-1)", textDecoration: "none" }}>
              Gurleen's Baseball App
            </Link>
            <Badge kind="neutral" label="BETA" />
          </div>
        }
        actions={
          replay ? (
            // Amber, not red: red means program/on-air in this design system.
            <Badge kind="warn" label={`REPLAY · ${replay.label}`} />
          ) : undefined
        }
      />
      <main>
        <Outlet />
      </main>
    </div>
  )
}

function NotFound() {
  return (
    <div style={{ padding: "var(--sp-5)" }}>
      <div style={{ color: "var(--fg-2)" }}>NOT FOUND</div>
      <Link to="/" style={{ color: "var(--info)" }}>
        Back to schedule
      </Link>
    </div>
  )
}
