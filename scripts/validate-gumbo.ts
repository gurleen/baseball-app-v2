#!/usr/bin/env bun

import { GumboFeed } from "../src/server/mlb/schemas/gumbo.ts";

type SchemaLike = {
  def?: {
    type?: string;
    shape?: Record<string, SchemaLike>;
    innerType?: SchemaLike;
    element?: SchemaLike;
    options?: SchemaLike[];
    valueType?: SchemaLike;
    left?: SchemaLike;
    right?: SchemaLike;
    in?: SchemaLike;
    out?: SchemaLike;
  };
  safeParse?: (value: unknown) =>
    | { success: true; data: unknown }
    | { success: false; error: { issues: ArrayLike<unknown> } };
};

type UnknownField = {
  path: PropertyKey[];
};

type ValidationIssue = {
  path: PropertyKey[];
  message: string;
  code: string;
};

type IssueGroup = {
  normalizedPath: string;
  message: string;
  code: string;
  count: number;
  examples: string[];
};

type UnknownFieldGroup = {
  normalizedPath: string;
  count: number;
  examples: string[];
};

const EXAMPLE_LIMIT = 3;

function formatPath(path: PropertyKey[]): string {
  if (path.length === 0) {
    return "<root>";
  }

  return path
    .map(segment => {
      if (typeof segment === "number") {
        return `[${segment}]`;
      }

      return typeof segment === "symbol" ? String(segment) : segment;
    })
    .join(".")
    .replace(/\.\[(\d+)\]/g, "[$1]");
}

function normalizePath(path: PropertyKey[]): string {
  if (path.length === 0) {
    return "<root>";
  }

  return path
    .map(segment => {
      if (typeof segment === "number") {
        return "[]";
      }

      if (typeof segment === "symbol") {
        return String(segment);
      }

      if (/^ID\d+$/.test(segment)) {
        return "{record}";
      }

      return segment;
    })
    .join(".")
    .replace(/\.\[\]/g, "[]");
}

function pushExample(examples: string[], path: PropertyKey[]): void {
  if (examples.length >= EXAMPLE_LIMIT) {
    return;
  }

  const formattedPath = formatPath(path);

  if (!examples.includes(formattedPath)) {
    examples.push(formattedPath);
  }
}

function printUsage(): void {
  console.error("Usage: bun run validate-gumbo <path-to-json>");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapSchema(schema: SchemaLike): SchemaLike {
  let current = schema;

  while (true) {
    const type = current.def?.type;

    if (
      type === "optional" ||
      type === "nullable" ||
      type === "default" ||
      type === "prefault" ||
      type === "catch" ||
      type === "readonly" ||
      type === "nonoptional"
    ) {
      current = current.def?.innerType ?? current;
      continue;
    }

    if (type === "pipe") {
      current = current.def?.in ?? current;
      continue;
    }

    return current;
  }
}

function pickBestUnionOption(options: SchemaLike[], value: unknown): SchemaLike | undefined {
  let bestOption: SchemaLike | undefined;
  let bestIssueCount = Number.POSITIVE_INFINITY;

  for (const option of options) {
    const result = option.safeParse?.(value);

    if (!result) {
      continue;
    }

    if (result.success) {
      return option;
    }

    const issueCount = result.error.issues.length;

    if (issueCount < bestIssueCount) {
      bestIssueCount = issueCount;
      bestOption = option;
    }
  }

  return bestOption;
}

function findUnknownFields(schema: SchemaLike, value: unknown, path: PropertyKey[] = []): UnknownField[] {
  const current = unwrapSchema(schema);
  const type = current.def?.type;

  if (type === "object") {
    if (!isPlainObject(value)) {
      return [];
    }

    const shape = current.def?.shape ?? {};
    const unknownFields: UnknownField[] = [];

    for (const key of Object.keys(value)) {
      if (!(key in shape)) {
        unknownFields.push({ path: [...path, key] });
      }
    }

    for (const [key, childSchema] of Object.entries(shape)) {
      if (key in value) {
        unknownFields.push(...findUnknownFields(childSchema, value[key], [...path, key]));
      }
    }

    return unknownFields;
  }

  if (type === "array") {
    if (!Array.isArray(value)) {
      return [];
    }

    const elementSchema = current.def?.element;

    if (!elementSchema) {
      return [];
    }

    return value.flatMap((item, index) => findUnknownFields(elementSchema, item, [...path, index]));
  }

  if (type === "record") {
    if (!isPlainObject(value)) {
      return [];
    }

    const valueSchema = current.def?.valueType;

    if (!valueSchema) {
      return [];
    }

    return Object.entries(value).flatMap(([key, entryValue]) =>
      findUnknownFields(valueSchema, entryValue, [...path, key])
    );
  }

  if (type === "union") {
    const options = current.def?.options ?? [];
    const bestOption = pickBestUnionOption(options, value);

    return bestOption ? findUnknownFields(bestOption, value, path) : [];
  }

  if (type === "intersection") {
    const leftUnknownFields = current.def?.left
      ? findUnknownFields(current.def.left, value, path)
      : [];
    const rightUnknownFields = current.def?.right
      ? findUnknownFields(current.def.right, value, path)
      : [];

    return [...leftUnknownFields, ...rightUnknownFields];
  }

  return [];
}

function dedupeUnknownFields(fields: UnknownField[]): UnknownField[] {
  const seen = new Set<string>();

  return fields.filter(field => {
    const key = formatPath(field.path);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function groupValidationIssues(issues: ValidationIssue[]): IssueGroup[] {
  const groups = new Map<string, IssueGroup>();

  for (const issue of issues) {
    const normalizedPath = normalizePath(issue.path);
    const groupKey = `${normalizedPath}\u0000${issue.code}\u0000${issue.message}`;
    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      existingGroup.count += 1;
      pushExample(existingGroup.examples, issue.path);
      continue;
    }

    const nextGroup: IssueGroup = {
      normalizedPath,
      message: issue.message,
      code: issue.code,
      count: 1,
      examples: [],
    };

    pushExample(nextGroup.examples, issue.path);
    groups.set(groupKey, nextGroup);
  }

  return [...groups.values()].sort((left, right) => right.count - left.count || left.normalizedPath.localeCompare(right.normalizedPath));
}

function groupUnknownFields(fields: UnknownField[]): UnknownFieldGroup[] {
  const groups = new Map<string, UnknownFieldGroup>();

  for (const field of fields) {
    const normalizedPath = normalizePath(field.path);
    const existingGroup = groups.get(normalizedPath);

    if (existingGroup) {
      existingGroup.count += 1;
      pushExample(existingGroup.examples, field.path);
      continue;
    }

    const nextGroup: UnknownFieldGroup = {
      normalizedPath,
      count: 1,
      examples: [],
    };

    pushExample(nextGroup.examples, field.path);
    groups.set(normalizedPath, nextGroup);
  }

  return [...groups.values()].sort((left, right) => right.count - left.count || left.normalizedPath.localeCompare(right.normalizedPath));
}

const filePath = Bun.argv[2];

if (!filePath || filePath === "--help" || filePath === "-h") {
  printUsage();
  process.exit(filePath ? 0 : 1);
}

let rawText: string;

try {
  rawText = await Bun.file(filePath).text();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to read JSON file: ${filePath}`);
  console.error(message);
  process.exit(1);
}

let payload: unknown;

try {
  payload = JSON.parse(rawText);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Invalid JSON in file: ${filePath}`);
  console.error(message);
  process.exit(1);
}

const result = GumboFeed.safeParse(payload);
const unknownFields = dedupeUnknownFields(findUnknownFields(GumboFeed, payload));
const groupedUnknownFields = groupUnknownFields(unknownFields);

if (result.success && unknownFields.length === 0) {
  console.log(`Valid GumboFeed JSON: ${filePath}`);
  process.exit(0);
}

if (!result.success) {
  const validationIssues = result.error.issues as ValidationIssue[];
  const groupedIssues = groupValidationIssues(validationIssues);

  console.error(`Validation failed for ${filePath}`);
  console.error(
    `Found ${validationIssues.length} issue${validationIssues.length === 1 ? "" : "s"} across ${groupedIssues.length} group${groupedIssues.length === 1 ? "" : "s"}:`
  );

  for (const [index, issueGroup] of groupedIssues.entries()) {
    console.error(`${index + 1}. ${issueGroup.normalizedPath}`);
    console.error(`   ${issueGroup.message} (${issueGroup.code})`);
    console.error(`   Occurrences: ${issueGroup.count}`);

    if (issueGroup.examples.length > 0) {
      console.error(`   Examples: ${issueGroup.examples.join(", ")}`);
    }
  }
}

if (unknownFields.length > 0) {
  if (result.success) {
    console.error(`Schema coverage failed for ${filePath}`);
  }

  console.error(
    `Found ${unknownFields.length} field${unknownFields.length === 1 ? "" : "s"} present in JSON but not covered by the schema, across ${groupedUnknownFields.length} group${groupedUnknownFields.length === 1 ? "" : "s"}:`
  );

  for (const [index, fieldGroup] of groupedUnknownFields.entries()) {
    console.error(`${index + 1}. ${fieldGroup.normalizedPath}`);
    console.error(`   Occurrences: ${fieldGroup.count}`);

    if (fieldGroup.examples.length > 0) {
      console.error(`   Examples: ${fieldGroup.examples.join(", ")}`);
    }
  }
}

process.exit(1);