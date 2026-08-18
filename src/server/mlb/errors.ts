export class MlbApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly details?: unknown;

  constructor(message: string, options: { status: number; url: string; details?: unknown }) {
    super(message);
    this.name = "MlbApiError";
    this.status = options.status;
    this.url = options.url;
    this.details = options.details;
  }
}

export class MlbApiNetworkError extends Error {
  override readonly cause: unknown;
  readonly url: string;

  constructor(message: string, options: { url: string; cause: unknown }) {
    super(message);
    this.name = "MlbApiNetworkError";
    this.url = options.url;
    this.cause = options.cause;
  }
}

export class MlbApiParseError extends Error {
  readonly url: string;
  override readonly cause: unknown;

  constructor(message: string, options: { url: string; cause: unknown }) {
    super(message);
    this.name = "MlbApiParseError";
    this.url = options.url;
    this.cause = options.cause;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}