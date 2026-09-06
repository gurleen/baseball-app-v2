/**
 * A read-only check for user-supplied SQL, shared by both sides: the server
 * refuses anything that fails it, and the /custom-query editor uses the same
 * function to explain the problem before you press RUN.
 *
 * This is the *outer* of two defences and deliberately the weaker one — the
 * real guarantee is that the server runs every query inside a
 * `SET TRANSACTION READ ONLY` transaction, which Postgres itself enforces. So
 * the checks here are tuned to give a clear message for the mistakes people
 * actually make, not to be a SQL parser.
 */

export type GuardResult =
	| { ok: true; sql: string; isExplain: boolean }
	| { ok: false; reason: string };

/** Statements that can begin a read-only query. */
const ALLOWED_LEADING = new Set(["SELECT", "WITH", "TABLE", "VALUES", "EXPLAIN"]);

/**
 * Blanks out the contents of string literals, quoted identifiers and comments,
 * preserving length so offsets still line up with the original. Everything
 * downstream matches against the masked copy, so a column named "delete" or a
 * comment mentioning DROP can't trip the keyword checks.
 */
function maskLiterals(input: string): string {
	const out = [...input];

	function blank(from: number, to: number): void {
		for (let i = from; i < to && i < out.length; i++) {
			if (out[i] !== "\n") out[i] = " ";
		}
	}

	/** End index of a quoted run starting at `start`, where the quote doubles to escape itself. */
	function endOfQuoted(start: number, quote: string): number {
		let i = start + 1;
		while (i < input.length) {
			if (input[i] === quote) {
				if (input[i + 1] === quote) {
					i += 2;
					continue;
				}
				return i;
			}
			i++;
		}
		return input.length;
	}

	let i = 0;
	while (i < input.length) {
		const ch = input[i];
		const next = input[i + 1];

		if (ch === "'" || ch === '"') {
			const end = endOfQuoted(i, ch);
			blank(i + 1, end);
			i = end + 1;
			continue;
		}

		if (ch === "-" && next === "-") {
			const newline = input.indexOf("\n", i);
			const end = newline === -1 ? input.length : newline;
			blank(i, end);
			i = end;
			continue;
		}

		if (ch === "/" && next === "*") {
			// Postgres block comments nest, unlike C's.
			let depth = 1;
			let j = i + 2;
			while (j < input.length && depth > 0) {
				if (input[j] === "/" && input[j + 1] === "*") {
					depth++;
					j += 2;
				} else if (input[j] === "*" && input[j + 1] === "/") {
					depth--;
					j += 2;
				} else {
					j++;
				}
			}
			blank(i, j);
			i = j;
			continue;
		}

		if (ch === "$") {
			const tag = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(input.slice(i))?.[0];
			if (tag !== undefined) {
				const close = input.indexOf(tag, i + tag.length);
				const end = close === -1 ? input.length : close + tag.length;
				blank(i, end);
				i = end;
				continue;
			}
		}

		i++;
	}

	return out.join("");
}

export function guardReadOnly(input: string): GuardResult {
	const sql = input.trim();
	if (sql === "") return { ok: false, reason: "Enter a query." };

	// Masking preserves length, so offsets into `masked` index `sql` too.
	const masked = maskLiterals(sql);

	const body = masked.replace(/;\s*$/, "");
	if (body.includes(";")) {
		return { ok: false, reason: "One statement at a time — remove the extra “;”." };
	}

	// The server runs the query as `SELECT * FROM ( … ) LIMIT n`, so unbalanced
	// parens would let the text escape that wrapper. Counting here means the
	// wrapper can never be broken out of, and it catches ordinary typos early.
	let depth = 0;
	for (const ch of body) {
		if (ch === "(") depth++;
		else if (ch === ")" && --depth < 0) break;
	}
	if (depth !== 0) {
		return { ok: false, reason: "Unbalanced parentheses." };
	}

	// A leading "(" is legal: (SELECT ...) UNION (SELECT ...).
	const leading = /^[\s(]*([A-Za-z]+)/.exec(body)?.[1]?.toUpperCase();
	if (leading === undefined || !ALLOWED_LEADING.has(leading)) {
		return {
			ok: false,
			reason: `Read-only queries only — start with SELECT, WITH, TABLE, VALUES or EXPLAIN${
				leading === undefined ? "" : ` (got ${leading})`
			}.`,
		};
	}

	// A data-modifying CTE: WITH x AS (INSERT ...) SELECT * FROM x.
	const modifyingCte = /\bAS\s*(?:(?:NOT\s+)?MATERIALIZED\s*)?\(\s*(INSERT|UPDATE|DELETE|MERGE)\b/i.exec(body);
	if (modifyingCte) {
		return { ok: false, reason: `Read-only queries only — this CTE writes (${modifyingCte[1]?.toUpperCase()}).` };
	}

	// Row locks write to the heap and can't run read-only anyway.
	if (/\bFOR\s+(?:UPDATE|SHARE|NO\s+KEY\s+UPDATE|KEY\s+SHARE)\b/i.test(body)) {
		return { ok: false, reason: "Read-only queries only — drop the row-locking FOR UPDATE/SHARE clause." };
	}

	const isExplain = leading === "EXPLAIN";
	if (isExplain) {
		// Only the option list between EXPLAIN and the statement matters — a
		// later "analyze" in a column name is none of our business.
		const options = /^\s*EXPLAIN\b(.*?)\b(?:SELECT|WITH|TABLE|VALUES)\b/is.exec(body)?.[1] ?? "";
		if (/\bANALYZE\b/i.test(options)) {
			return { ok: false, reason: "EXPLAIN ANALYZE actually runs the query — use plain EXPLAIN." };
		}
	}

	return { ok: true, sql: sql.slice(0, body.length).trim(), isExplain };
}
