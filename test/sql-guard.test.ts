import { describe, expect, test } from "bun:test";

import { guardReadOnly } from "../src/shared/sql-guard.ts";

/**
 * The guard is the outer of two read-only defences (the inner one being the
 * `accessMode: "read only"` transaction the procedure runs in). It exists to
 * give a clear message rather than a Postgres error, so these tests care as
 * much about *not* rejecting valid queries as about rejecting invalid ones.
 */

function reason(sql: string): string {
	const result = guardReadOnly(sql);
	if (result.ok) throw new Error(`expected a rejection for: ${sql}`);
	return result.reason;
}

function accepted(sql: string): string {
	const result = guardReadOnly(sql);
	if (!result.ok) throw new Error(`expected acceptance for ${sql}, got: ${result.reason}`);
	return result.sql;
}

describe("guardReadOnly", () => {
	test("accepts the ordinary shapes", () => {
		accepted("SELECT 1");
		accepted("select pk from plays");
		accepted("WITH x AS (SELECT 1 AS n) SELECT * FROM x");
		accepted("TABLE plays");
		accepted("VALUES (1), (2)");
		accepted("EXPLAIN SELECT * FROM plays");
		accepted("(SELECT 1) UNION (SELECT 2)");
	});

	test("strips a single trailing semicolon", () => {
		expect(accepted("SELECT 1;")).toBe("SELECT 1");
		expect(accepted("  SELECT 1 ;  ")).toBe("SELECT 1");
	});

	test("rejects a second statement", () => {
		expect(reason("SELECT 1; SELECT 2")).toMatch(/one statement/i);
		expect(reason("SELECT 1; DROP VIEW plays")).toMatch(/one statement/i);
	});

	test("rejects writes and DDL", () => {
		expect(reason("DELETE FROM plays")).toMatch(/read-only/i);
		expect(reason("DROP VIEW plays")).toMatch(/read-only/i);
		expect(reason("UPDATE plays SET rbi = 0")).toMatch(/read-only/i);
		expect(reason("INSERT INTO plays DEFAULT VALUES")).toMatch(/read-only/i);
	});

	test("rejects a data-modifying CTE", () => {
		expect(reason("WITH x AS (INSERT INTO plays DEFAULT VALUES RETURNING *) SELECT * FROM x")).toMatch(/CTE/i);
		expect(reason("WITH x AS NOT MATERIALIZED (DELETE FROM plays RETURNING *) SELECT * FROM x")).toMatch(/CTE/i);
	});

	test("rejects row locking, which can't run read-only anyway", () => {
		expect(reason("SELECT * FROM plays FOR UPDATE")).toMatch(/FOR UPDATE/i);
		expect(reason("SELECT * FROM plays FOR NO KEY UPDATE")).toMatch(/FOR UPDATE/i);
	});

	test("rejects EXPLAIN ANALYZE but not plain EXPLAIN", () => {
		expect(reason("EXPLAIN ANALYZE SELECT * FROM plays")).toMatch(/ANALYZE/i);
		expect(reason("EXPLAIN (ANALYZE, VERBOSE) SELECT * FROM plays")).toMatch(/ANALYZE/i);
		expect(guardReadOnly("EXPLAIN (VERBOSE) SELECT 1")).toMatchObject({ ok: true, isExplain: true });
	});

	test("rejects unbalanced parens, which would escape the row-cap wrapper", () => {
		expect(reason("SELECT 1) AS x")).toMatch(/parenthes/i);
		expect(reason("SELECT (1")).toMatch(/parenthes/i);
	});

	// The masking pass is the whole reason the keyword checks are safe to run.
	describe("literals and comments are masked, not parsed", () => {
		test("a semicolon inside a string is not a statement separator", () => {
			accepted("SELECT ';' AS semi");
			accepted(`SELECT 'it''s; fine' AS quoted`);
			accepted("SELECT $$ a ; b $$ AS dollar");
			accepted("SELECT $tag$ ; $tag$ AS tagged");
		});

		test("a semicolon inside a comment is not a statement separator", () => {
			accepted("SELECT 1 -- ; DROP VIEW plays");
			accepted("SELECT 1 /* ; DROP VIEW plays */");
			accepted("SELECT 1 /* nested /* ; */ still a comment */");
		});

		test("write keywords inside literals and identifiers are harmless", () => {
			accepted("SELECT 'DELETE FROM plays' AS label");
			accepted(`SELECT pk AS "delete" FROM plays`);
			accepted("SELECT 1 -- INSERT INTO plays");
		});

		test("a leading comment doesn't hide the real first keyword", () => {
			accepted("-- a note\nSELECT 1");
			accepted("/* a note */ SELECT 1");
			expect(reason("-- a note\nDELETE FROM plays")).toMatch(/read-only/i);
		});

		test("parens inside literals don't count toward balance", () => {
			accepted("SELECT '(' AS open");
			accepted("SELECT 1 -- )");
		});
	});

	test("rejects empty input", () => {
		expect(reason("")).toMatch(/enter a query/i);
		expect(reason("   \n  ")).toMatch(/enter a query/i);
	});
});
