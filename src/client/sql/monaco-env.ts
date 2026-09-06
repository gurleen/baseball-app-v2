// Monaco resolves its workers through this global, so it has to be set before
// anything creates an editor or a language client. Import this module first.
//
// `monaco-sql-languages` runs the PostgreSQL parser off-thread: its
// workerManager calls `editor.createWebWorker({ label: "pgsql" })`, which lands
// here as `label`. Everything else (Monaco's own editor worker) gets the
// default. Vite compiles both `?worker` imports into real worker bundles.
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker.js?worker"
import PgSQLWorker from "monaco-sql-languages/esm/languages/pgsql/pgsql.worker.js?worker"

import { PGSQL_LANGUAGE_ID } from "./constants.ts"

self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    return label === PGSQL_LANGUAGE_ID ? new PgSQLWorker() : new EditorWorker()
  },
}
