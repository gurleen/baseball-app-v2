// Order matters: MonacoEnvironment must exist before the contribution below
// registers the language and its worker-backed features.
import "./monaco-env.ts"

// The ".js" is load-bearing: monaco-sql-languages' exports map is an identity
// mapping ("./esm/*": "./esm/*") that appends no extension.
import "monaco-sql-languages/esm/languages/pgsql/pgsql.contribution.js"
// Side-effect import that enables the Format action (⌘⌥F). Must run before the
// setupLanguageFeatures call below, or that call throws.
import "monaco-sql-languages/format"

import { languages } from "monaco-editor"
// Deep import on purpose: monaco-sql-languages' root entry re-exports
// `EntityContextType` from dt-sql-parser, which drags the 4 MB ANTLR grammar
// onto the main thread. Reaching setupLanguageFeatures directly keeps the
// parser where it belongs — inside the worker.
import { setupLanguageFeatures } from "monaco-sql-languages/esm/setupLanguageFeatures.js"
// constants.js has no imports of its own, so the enum is free to take.
import { LanguageIdEnum } from "monaco-sql-languages/esm/common/constants.js"
import type { CompletionService, ICompletionItem } from "monaco-sql-languages"

import type { DatabaseSchema } from "../../server/procedures/custom-query.ts"

/**
 * The `EntityContextType` members we act on, as plain strings. Importing the
 * enum itself would defeat the deep import above; these values are stable
 * string literals in dt-sql-parser's enum.
 */
const ENTITY_TABLE = "table"
const ENTITY_VIEW = "view"
const ENTITY_COLUMN = "column"
const ENTITY_FUNCTION = "function"

// setupLanguageFeatures registers globally, once, at import time, so the schema
// can't be passed in as a React value — the page pushes it here when its
// `customQuery.schema` query resolves.
let schema: DatabaseSchema = { tables: [], functions: [] }

export function setCompletionSchema(next: DatabaseSchema): void {
  schema = next
}

/** Schema items sort above keywords; the parser's keywords come last. */
const SORT_TABLE = "0"
const SORT_COLUMN = "0"
const SORT_FUNCTION = "1"
const SORT_SNIPPET = "2"
const SORT_KEYWORD = "3"

function tableItems(): ICompletionItem[] {
  return schema.tables.map(table => ({
    label: table.name,
    kind: languages.CompletionItemKind.Struct,
    detail: `${table.columns.length} columns`,
    sortText: SORT_TABLE + table.name,
  }))
}

function functionItems(): ICompletionItem[] {
  return schema.functions.map(name => ({
    label: name,
    kind: languages.CompletionItemKind.Function,
    detail: "function",
    sortText: SORT_FUNCTION + name,
  }))
}

/**
 * Columns of the tables the parser found in this statement. Table names may be
 * schema-qualified ("public.plays"), so match on the last segment. With nothing
 * in scope yet — a bare `SELECT ` before any FROM — fall back to every column,
 * labelled with its table.
 */
function columnItems(tableNames: string[]): ICompletionItem[] {
  const wanted = new Set(tableNames.map(name => name.split(".").pop()?.toLowerCase()).filter(Boolean))
  const inScope = wanted.size > 0 ? schema.tables.filter(table => wanted.has(table.name.toLowerCase())) : schema.tables
  const qualify = inScope.length > 1

  const seen = new Set<string>()
  const items: ICompletionItem[] = []
  for (const table of inScope) {
    for (const column of table.columns) {
      // A column on several in-scope tables only needs one entry; the detail
      // string names the table it came from either way.
      const key = `${table.name}.${column.name}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push({
        label: column.name,
        kind: languages.CompletionItemKind.Field,
        detail: qualify ? `${table.name} · ${column.dataType}` : column.dataType,
        sortText: SORT_COLUMN + column.name,
      })
    }
  }
  return items
}

const completionService: CompletionService = async (_model, _position, _context, suggestions, entities, snippets) => {
  if (!suggestions) return []

  const items: ICompletionItem[] = []

  // Providing a completionService replaces the built-in snippet pass, so the
  // library's SQL snippets have to be re-emitted here or they disappear.
  for (const snippet of snippets ?? []) {
    items.push({
      label: snippet.label,
      kind: languages.CompletionItemKind.Snippet,
      detail: snippet.description ?? "snippet",
      filterText: snippet.prefix,
      insertText: Array.isArray(snippet.body) ? snippet.body.join("\n") : snippet.body,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
      sortText: SORT_SNIPPET + snippet.prefix,
    })
  }

  // A caret often matches several syntax contexts at once (TABLE and VIEW both
  // apply in a FROM clause), so collect which groups are wanted and emit each
  // once — pushing per suggestion lists every table twice.
  const contexts = new Set(suggestions.syntax.map(suggestion => suggestion.syntaxContextType as string))

  if (contexts.has(ENTITY_TABLE) || contexts.has(ENTITY_VIEW)) {
    items.push(...tableItems())
  }

  if (contexts.has(ENTITY_COLUMN)) {
    const tables = (entities ?? [])
      .filter(
        entity =>
          (entity.entityContextType === ENTITY_TABLE || entity.entityContextType === ENTITY_VIEW) &&
          entity.isAccessible !== false,
      )
      .map(entity => entity.text)
    items.push(...columnItems(tables))
  }

  if (contexts.has(ENTITY_FUNCTION)) {
    items.push(...functionItems())
  }

  items.push(
    ...suggestions.keywords.map(keyword => ({
      label: keyword,
      kind: languages.CompletionItemKind.Keyword,
      detail: "keyword",
      sortText: SORT_KEYWORD + keyword,
    })),
  )

  return items
}

setupLanguageFeatures(LanguageIdEnum.PG, {
  completionItems: { enable: true, triggerCharacters: [" ", "."], completionService },
  diagnostics: true,
  format: { enable: true, tabWidth: 2 },
})
