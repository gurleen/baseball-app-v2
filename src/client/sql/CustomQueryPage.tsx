import { useEffect, useState } from "react"
import { Badge, Button, Panel, Spinner } from "@hydra-tv/ui"
import { useMutation, useQuery } from "@tanstack/react-query"

import { guardReadOnly } from "../../shared/sql-guard.ts"
import { shrinkable } from "../lib/layout.ts"
import { orpc } from "../rpc/client.ts"
import { DEFAULT_QUERY, SQL_STORAGE_KEY } from "./constants.ts"
import { setCompletionSchema } from "./language.ts"
import { ResultGrid } from "./ResultGrid.tsx"
import { SqlEditor } from "./SqlEditor.tsx"

function loadDraft(): string {
  try {
    return localStorage.getItem(SQL_STORAGE_KEY) ?? DEFAULT_QUERY
  } catch {
    // Private browsing and blocked site data both throw on access.
    return DEFAULT_QUERY
  }
}

export default function CustomQueryPage() {
  const [text, setText] = useState(loadDraft)

  // The schema is only for autocomplete, so a failure here shouldn't stop
  // anyone running a query — it's never surfaced as an error.
  const schemaQuery = useQuery(orpc.customQuery.schema.queryOptions({ input: {}, staleTime: Infinity }))
  const run = useMutation(orpc.customQuery.run.mutationOptions())

  useEffect(() => {
    if (schemaQuery.data) setCompletionSchema(schemaQuery.data)
  }, [schemaQuery.data])

  useEffect(() => {
    try {
      localStorage.setItem(SQL_STORAGE_KEY, text)
    } catch {
      // Not worth surfacing — the draft just won't survive a reload.
    }
  }, [text])

  const guard = guardReadOnly(text)
  const runQuery = () => {
    if (guard.ok) run.mutate({ sql: guard.sql })
  }

  const result = run.data

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        style={shrinkable}
        title="QUERY"
        meta="⌘↵ to run · ⌘⌥F to format"
        actions={
          <Button variant="accent" onClick={runQuery} disabled={!guard.ok || run.isPending}>
            {run.isPending ? "RUNNING…" : "RUN"}
          </Button>
        }
      >
        <div
          className="h-[35vh] lg:h-[calc(100vh-260px)]"
          style={{ border: "1px solid var(--line-2)", borderRadius: "var(--radius-1)", overflow: "hidden" }}
        >
          <SqlEditor value={text} onChange={setText} onRun={runQuery} />
        </div>
        {guard.ok ? null : (
          <div style={{ color: "var(--err)", paddingTop: "var(--sp-2)", fontSize: "var(--fs-11)" }}>{guard.reason}</div>
        )}
      </Panel>

      <Panel
        style={shrinkable}
        title="RESULTS"
        meta={result ? `${result.rows.length} rows · ${result.elapsedMs} ms` : undefined}
        actions={result?.truncated ? <Badge kind="warn" label="TRUNCATED" /> : undefined}
        padded={false}
      >
        {run.isPending ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-6)" }}>
            <Spinner />
          </div>
        ) : run.isError ? (
          <div style={{ color: "var(--err)", padding: "var(--sp-4)", fontFamily: "var(--font-mono)", fontSize: "var(--fs-11)", whiteSpace: "pre-wrap" }}>
            {(run.error as Error).message}
          </div>
        ) : !result ? (
          <div style={{ color: "var(--fg-3)", padding: "var(--sp-4)" }}>
            <div>Write a query and press RUN.</div>
            {/* The driver returns rows as objects, so same-named output columns
                collapse into one. Nothing detects that after the fact — say so
                here rather than let a column vanish silently. */}
            <div style={{ paddingTop: "var(--sp-2)", fontSize: "var(--fs-10)" }}>
              Give same-named columns an alias — <code>a.pk AS a_pk</code> — or only the last one comes back.
            </div>
          </div>
        ) : result.rows.length === 0 ? (
          <div style={{ color: "var(--fg-3)", padding: "var(--sp-4)" }}>No rows.</div>
        ) : (
          <ResultGrid columns={result.columns} rows={result.rows} />
        )}
      </Panel>
    </div>
  )
}
