import { useEffect, useRef } from "react"
import { useTheme } from "@hydra-tv/ui"
// The bare specifier resolves to editor.main.js, which patches
// `editor.createWebWorker` to accept the legacy {moduleId, label, createData}
// form that monaco-sql-languages' worker manager calls. Importing
// esm/vs/editor/editor.api directly skips that patch and breaks the SQL worker.
import * as monaco from "monaco-editor"

// Registers the pgsql language, its worker-backed diagnostics and our
// schema-aware completions. Side-effect import — must come before any editor.
import "./language.ts"
import { PGSQL_LANGUAGE_ID } from "./constants.ts"

const THEME_DARK = "hydra-sql-dark"
const THEME_LIGHT = "hydra-sql-light"

/**
 * Monaco themes take literal colors, not CSS variables, so the design tokens
 * have to be read off the document at the moment the theme is built — and
 * rebuilt whenever the app theme flips.
 */
function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value === "" ? fallback : value
}

function defineThemes(): void {
  const common = {
    "editor.background": token("--bg-2", "#12161b"),
    "editor.foreground": token("--fg-1", "#dde4ec"),
    "editorLineNumber.foreground": token("--fg-3", "#68757f"),
    "editorLineNumber.activeForeground": token("--fg-1", "#dde4ec"),
    "editorCursor.foreground": token("--ch-1", "#3fa2f7"),
    "editorGutter.background": token("--bg-2", "#12161b"),
    "editorWidget.background": token("--bg-3", "#171c22"),
    "editorWidget.border": token("--line-3", "#2a3138"),
    "editorSuggestWidget.background": token("--bg-3", "#171c22"),
    "editorSuggestWidget.border": token("--line-3", "#2a3138"),
    "editorSuggestWidget.selectedBackground": token("--bg-4", "#1e252c"),
  }

  const rules = [
    { token: "keyword", foreground: token("--ch-1", "#3fa2f7").replace("#", ""), fontStyle: "bold" },
    { token: "string", foreground: token("--ch-2", "#3fbf87").replace("#", "") },
    { token: "number", foreground: token("--ch-3", "#e0b341").replace("#", "") },
    { token: "comment", foreground: token("--fg-3", "#68757f").replace("#", ""), fontStyle: "italic" },
    { token: "operator", foreground: token("--fg-2", "#9aa7b4").replace("#", "") },
    { token: "predefined", foreground: token("--ch-4", "#b98cf0").replace("#", "") },
  ]

  monaco.editor.defineTheme(THEME_DARK, { base: "vs-dark", inherit: true, rules, colors: common })
  monaco.editor.defineTheme(THEME_LIGHT, { base: "vs", inherit: true, rules, colors: common })
}

export function SqlEditor({
  value,
  onChange,
  onRun,
}: {
  value: string
  onChange: (next: string) => void
  onRun: () => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null)
  const { theme } = useTheme()

  // Commands are bound once but must call the *current* handlers, which change
  // on every render as the query text changes.
  const onRunRef = useRef(onRun)
  const onChangeRef = useRef(onChange)
  onRunRef.current = onRun
  onChangeRef.current = onChange

  useEffect(() => {
    if (!container.current) return

    defineThemes()
    const editor = monaco.editor.create(container.current, {
      value,
      language: PGSQL_LANGUAGE_ID,
      theme: theme === "light" ? THEME_LIGHT : THEME_DARK,
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      lineNumbersMinChars: 3,
      scrollBeyondLastLine: false,
      renderLineHighlight: "line",
      padding: { top: 12, bottom: 12 },
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    })
    editorRef.current = editor

    const model = editor.getModel()
    const changed = model?.onDidChangeContent(() => onChangeRef.current(editor.getValue()))
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current())

    return () => {
      changed?.dispose()
      editor.dispose()
      editorRef.current = null
    }
    // Created once: `value` seeds the model, and later updates flow through the
    // model itself rather than by tearing the editor down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    defineThemes()
    monaco.editor.setTheme(theme === "light" ? THEME_LIGHT : THEME_DARK)
  }, [theme])

  // Keep the model in sync when the value is changed from outside (e.g. reset).
  useEffect(() => {
    const editor = editorRef.current
    if (editor && editor.getValue() !== value) editor.setValue(value)
  }, [value])

  // Monaco's scrollable canvas is enormous (its `lines-content` is sized to
  // 2^24px) and it sizes itself from the container, so if the container is in
  // normal flow the two feed each other and the whole page scrolls sideways on
  // a narrow viewport. Absolute-filling a relative parent takes the editor out
  // of layout entirely, so it can only ever be as wide as the panel.
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
    </div>
  )
}
