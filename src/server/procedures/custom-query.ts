import { ORPCError, os } from "@orpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { guardReadOnly } from "../../shared/sql-guard.ts";
import { db } from "../db/client.ts";

/** Rows past this are dropped; the UI says so rather than pretending it has everything. */
const MAX_ROWS = 1000;
/** Long enough for a full-table scan of statcast_pitches, short enough not to pin a connection. */
const STATEMENT_TIMEOUT_MS = 15_000;

const RunInput = z.object({ sql: z.string().min(1).max(20_000) });

export interface QueryResult {
	columns: string[];
	rows: Record<string, unknown>[];
	/** True when the query had more than MAX_ROWS to give. */
	truncated: boolean;
	elapsedMs: number;
}

export interface SchemaColumn {
	name: string;
	dataType: string;
}

export interface SchemaTable {
	name: string;
	columns: SchemaColumn[];
}

export interface DatabaseSchema {
	tables: SchemaTable[];
	/** Postgres-side stat helpers (woba, wrc_plus, …) that the views don't expose. */
	functions: string[];
}

/**
 * SQLSTATE 57014 (query_canceled). Bun's PostgresError carries the SQLSTATE on
 * `errno`, as a string — `code` is its own `ERR_POSTGRES_SERVER_ERROR` tag.
 */
const QUERY_CANCELED = "57014";

/**
 * Drizzle wraps driver errors, and its own message is only ever
 * `Failed query: <sql>\nparams:` — the useful part ("column \"foo\" does not
 * exist") is on the PostgresError underneath. That message is the single most
 * valuable thing this page can show, so dig it out.
 */
function describeQueryError(error: unknown): string {
	const cause = error instanceof Error ? (error.cause as Error & { errno?: string; detail?: string; hint?: string }) : undefined;

	if (cause?.errno === QUERY_CANCELED) {
		return `Query cancelled after ${STATEMENT_TIMEOUT_MS / 1000}s. Narrow it down — add a WHERE clause or a season filter.`;
	}

	const message = cause?.message ?? (error instanceof Error ? error.message : undefined);
	if (message === undefined) return "Query failed.";

	return [message, cause?.detail, cause?.hint].filter(Boolean).join("\n");
}

export const customQueryRouter = {
	/**
	 * The `public` catalog, for the editor's autocomplete. Read from
	 * information_schema rather than `db/schema.ts` because that file is a
	 * `drizzle-kit pull` snapshot that drifts until someone re-pulls, and it
	 * models none of the stat functions.
	 */
	schema: os.handler(async (): Promise<DatabaseSchema> => {
		const columnRows = (await db.execute(sql`
			SELECT table_name AS "tableName", column_name AS "columnName", data_type AS "dataType"
			FROM information_schema.columns
			WHERE table_schema = 'public'
			ORDER BY table_name, ordinal_position
		`)) as unknown as { tableName: string; columnName: string; dataType: string }[];

		const functionRows = (await db.execute(sql`
			SELECT DISTINCT routine_name AS "name"
			FROM information_schema.routines
			WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
			ORDER BY routine_name
		`)) as unknown as { name: string }[];

		const byTable = new Map<string, SchemaColumn[]>();
		for (const row of columnRows) {
			const columns = byTable.get(row.tableName) ?? [];
			columns.push({ name: row.columnName, dataType: row.dataType });
			byTable.set(row.tableName, columns);
		}

		return {
			tables: [...byTable].map(([name, columns]) => ({ name, columns })),
			functions: functionRows.map(row => row.name),
		};
	}),

	run: os.input(RunInput).handler(async ({ input }): Promise<QueryResult> => {
		const guard = guardReadOnly(input.sql);
		if (!guard.ok) throw new ORPCError("BAD_REQUEST", { message: guard.reason });

		// Cap in the database rather than slicing afterwards, so a careless
		// `SELECT * FROM statcast_pitches` never materialises millions of rows.
		// EXPLAIN returns a plan, not a result set, so it can't be wrapped.
		const statement = guard.isExplain
			? guard.sql
			: `SELECT * FROM (${guard.sql}) AS custom_query LIMIT ${MAX_ROWS + 1}`;

		const startedAt = performance.now();

		let rows: Record<string, unknown>[];
		try {
			rows = await db.transaction(
				async tx => {
					// SET takes no bind parameters, hence sql.raw — the value is a
					// module constant, never user input.
					await tx.execute(sql.raw(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`));

					return (await tx.execute(sql.raw(statement))) as unknown as Record<string, unknown>[];
				},
				// The actual read-only guarantee: drizzle emits `SET TRANSACTION
				// READ ONLY` as the first statement of the block, and Postgres then
				// rejects any write, whatever slipped past guardReadOnly.
				{ accessMode: "read only" },
			);
		} catch (error) {
			throw new ORPCError("BAD_REQUEST", { message: describeQueryError(error) });
		}

		const elapsedMs = Math.round(performance.now() - startedAt);
		const truncated = rows.length > MAX_ROWS;
		const capped = truncated ? rows.slice(0, MAX_ROWS) : rows;

		// bun-sql hands back plain objects, so duplicate output column names
		// collapse into one key — the UI tells people to alias them.
		return {
			columns: capped.length > 0 ? Object.keys(capped[0] ?? {}) : [],
			rows: capped,
			truncated,
			elapsedMs,
		};
	}),
};

export const customQueryLimits = { maxRows: MAX_ROWS, statementTimeoutMs: STATEMENT_TIMEOUT_MS };
