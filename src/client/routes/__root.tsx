import type { QueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link, Outlet, createRootRouteWithContext, useNavigate } from "@tanstack/react-router"
import { Badge, NavBar, ThemeToggle } from "@hydra-tv/ui"
import { useQuery } from "@tanstack/react-query"

import { orpc } from "../rpc/client.ts"
import { copy, typeLabel } from "../lib/type.ts"

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
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-1)", color: "var(--fg-1)", fontFamily: "var(--font-copy)" }}
    >
      <NavBar
        brand={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <Link to="/" style={{ ...copy, color: "var(--fg-1)", textDecoration: "none", fontSize: "var(--fs-16)" }}>
              Gurleen's Baseball App
            </Link>
            <Badge kind="neutral" label="BETA" />
          </div>
        }
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            {replay ? (
              // Amber, not red: red means program/on-air in this design system.
              <Badge kind="warn" label={`REPLAY · ${replay.label}`} />
            ) : undefined}
            <ThemeToggle />
          </div>
        }
      >
        <LeadersDropdown
          items={[
            { key: "/batting", label: "BATTING" },
            { key: "/pitching", label: "PITCHING" },
          ]}
          onSelect={(key) => navigate({ to: key })}
        />
      </NavBar>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

function LeadersDropdown({
  items,
  onSelect,
}: {
  items: { key: string; label: string }[]
  onSelect: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  const handleEnter = () => {
    cancelClose()
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setRect({ top: r.bottom + 4, left: r.left })
    }
    setOpen(true)
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={scheduleClose}
        style={{ ...copy, color: "var(--fg-2)", cursor: "pointer", fontSize: "var(--fs-11)" }}
      >
        LEADERS
      </span>
      {open && rect
        ? createPortal(
            <div
              role="menu"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              style={{
                position: "fixed",
                top: rect.top,
                left: rect.left,
                minWidth: 160,
                zIndex: 200,
                background: "var(--grad-panel)",
                border: "1px solid var(--line-3)",
                borderRadius: "var(--radius-1)",
                boxShadow: "var(--shadow-overlay)",
                padding: 4,
                fontFamily: "var(--font-ui)",
              }}
            >
              {items.map((item) => (
                <div
                  key={item.key}
                  onClick={() => {
                    onSelect(item.key)
                    setOpen(false)
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-4)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent"
                  }}
                  style={{
                    padding: "6px 8px",
                    fontSize: 11,
                    borderRadius: "var(--radius-1)",
                    color: "var(--fg-1)",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function NotFound() {
  return (
    <div style={{ padding: "var(--sp-5)" }}>
      <div style={{ ...typeLabel, color: "var(--fg-2)" }}>NOT FOUND</div>
      <Link to="/" style={{ color: "var(--info)" }}>
        Back to schedule
      </Link>
    </div>
  )
}
