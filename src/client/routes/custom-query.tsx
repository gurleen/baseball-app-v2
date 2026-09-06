import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"

// Monaco and the ANTLR PostgreSQL grammar are several MB between them, so the
// whole page is a lazy chunk — nothing here may import from ../sql at the top
// level, or every other route pays for it.
export const Route = createFileRoute("/custom-query")({
  component: lazyRouteComponent(() => import("../sql/CustomQueryPage.tsx")),
})
