/**
 * A WebSocket that reconnects, exposed as a stable object the oRPC link can
 * hold onto for the life of the page.
 *
 * oRPC's WebSocket link takes a single socket instance, so swapping in a fresh
 * socket after a drop would orphan the link. This wrapper keeps one facade and
 * replaces the underlying socket beneath it.
 */

const INITIAL_RETRY_MS = 500;
const MAX_RETRY_MS = 15_000;

export interface ReconnectingSocketOptions {
	url: string;
	onOpen?: () => void;
	onClose?: () => void;
}

type Listener = (event: Event) => void;

export class ReconnectingSocket {
	readonly #url: string;
	readonly #listeners = new Map<string, Set<Listener>>();
	readonly #options: ReconnectingSocketOptions;

	#socket: WebSocket | null = null;
	#retryMs = INITIAL_RETRY_MS;
	#retryTimer: ReturnType<typeof setTimeout> | null = null;
	#closed = false;
	/** Messages sent while the socket was down, replayed once it reopens. */
	#pending: Array<string | ArrayBufferLike | Blob | ArrayBufferView> = [];

	constructor(options: ReconnectingSocketOptions) {
		this.#url = options.url;
		this.#options = options;
		this.#connect();
	}

	get readyState(): number {
		return this.#socket?.readyState ?? WebSocket.CONNECTING;
	}

	addEventListener(type: string, listener: Listener): void {
		let listeners = this.#listeners.get(type);
		if (!listeners) {
			listeners = new Set();
			this.#listeners.set(type, listeners);
		}
		listeners.add(listener);
		this.#socket?.addEventListener(type, listener);
	}

	removeEventListener(type: string, listener: Listener): void {
		this.#listeners.get(type)?.delete(listener);
		this.#socket?.removeEventListener(type, listener);
	}

	send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
		if (this.#socket?.readyState === WebSocket.OPEN) {
			this.#socket.send(data);
			return;
		}
		this.#pending.push(data);
	}

	close(): void {
		this.#closed = true;
		if (this.#retryTimer) clearTimeout(this.#retryTimer);
		this.#socket?.close();
	}

	#connect(): void {
		const socket = new WebSocket(this.#url);
		this.#socket = socket;

		for (const [type, listeners] of this.#listeners) {
			for (const listener of listeners) socket.addEventListener(type, listener);
		}

		socket.addEventListener("open", () => {
			this.#retryMs = INITIAL_RETRY_MS;
			for (const message of this.#pending.splice(0)) socket.send(message);
			this.#options.onOpen?.();
		});

		socket.addEventListener("close", () => {
			this.#options.onClose?.();
			if (this.#closed) return;

			// Exponential backoff with jitter, so a server restart doesn't bring
			// every open tab back in the same instant.
			const delay = Math.min(this.#retryMs, MAX_RETRY_MS);
			this.#retryMs = Math.min(this.#retryMs * 2, MAX_RETRY_MS);
			this.#retryTimer = setTimeout(() => this.#connect(), delay + Math.random() * 250);
		});

		// Without a handler, a failed connection raises an unhandled error
		// event; the close handler above owns the actual retry.
		socket.addEventListener("error", () => {});
	}
}
