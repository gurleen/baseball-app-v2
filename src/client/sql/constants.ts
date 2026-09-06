/**
 * `LanguageIdEnum.PG` from monaco-sql-languages, inlined so `monaco-env.ts` can
 * name it without importing the library (and dragging the parser into whichever
 * chunk sets up the workers).
 */
export const PGSQL_LANGUAGE_ID = "pgsql"

export const SQL_STORAGE_KEY = "custom-query:sql"

export const DEFAULT_QUERY = `SELECT
  p.first_name || ' ' || p.last_name AS name,
  b.season,
  b.pa,
  b.home_runs,
  b.ops
FROM batting_stats_season AS b
JOIN people AS p ON p.pk = b.batter_pk
WHERE b.season = 2024 AND b.qualified
ORDER BY b.ops DESC
`
