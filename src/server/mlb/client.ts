import { z } from "zod";

import { MlbApiError, MlbApiNetworkError, MlbApiParseError, isAbortError } from "./errors";

const DEFAULT_BASE_URL = "https://statsapi.mlb.com/api/v1";
const DEFAULT_TIMEOUT_MS = 10000;

type QueryPrimitive = string | number | boolean;
type QueryValue = QueryPrimitive | QueryPrimitive[] | null | undefined;

export interface MlbClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export interface MlbRequestOptions<TSchema extends z.ZodTypeAny | undefined = undefined> {
  path: string;
  params?: Record<string, QueryValue>;
  schema?: TSchema;
  signal?: AbortSignal;
  timeoutMs?: number;
  init?: RequestInit;
}

function appendQuery(searchParams: URLSearchParams, key: string, value: QueryValue) {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      searchParams.append(key, String(item));
    }
    return;
  }

  searchParams.set(key, String(value));
}

function buildUrl(baseUrl: string, path: string, params?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, `${baseUrl.replace(/\/$/, "")}/`);

  for (const [key, value] of Object.entries(params ?? {})) {
    appendQuery(url.searchParams, key, value);
  }

  return url;
}

function createTimeoutSignal(timeoutMs: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  const abortFromParent = () => controller.abort();
  signal?.addEventListener("abort", abortFromParent, { once: true });

  return {
    signal: controller.signal,
    cleanup() {
      globalThis.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortFromParent);
    },
  };
}

export class MlbClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: MlbClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async request<TSchema extends z.ZodTypeAny | undefined = undefined>(
    options: MlbRequestOptions<TSchema>,
  ): Promise<TSchema extends z.ZodTypeAny ? z.infer<TSchema> : unknown> {
    const url = buildUrl(this.baseUrl, options.path, options.params);
    const timeout = createTimeoutSignal(options.timeoutMs ?? this.timeoutMs, options.signal);

    try {
      const response = await fetch(url, {
        ...options.init,
        headers: {
          Accept: "application/json",
          ...options.init?.headers,
        },
        signal: timeout.signal,
      });

      if (!response.ok) {
        let details: unknown;
        try {
          details = await response.json();
        } catch {
          details = await response.text().catch(() => undefined);
        }

        throw new MlbApiError(`MLB API request failed with status ${response.status}`, {
          status: response.status,
          url: url.toString(),
          details,
        });
      }

      const payload = await response.json();

      if (!options.schema) {
        return payload as TSchema extends z.ZodTypeAny ? z.infer<TSchema> : unknown;
      }

      const parsed = options.schema.safeParse(payload);
      if (!parsed.success) {
        console.error(z.treeifyError(parsed.error));
        throw new MlbApiParseError("MLB API response did not match the expected schema", {
          url: url.toString(),
          cause: parsed.error,
        });
      }

      return parsed.data as TSchema extends z.ZodTypeAny ? z.infer<TSchema> : unknown;
    } catch (error) {
      if (error instanceof MlbApiError || error instanceof MlbApiParseError || isAbortError(error)) {
        throw error;
      }

      throw new MlbApiNetworkError("MLB API request failed before a valid response was received", {
        url: url.toString(),
        cause: error,
      });
    } finally {
      timeout.cleanup();
    }
  }
}

export const mlbClient = new MlbClient();