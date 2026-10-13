import { createClient, type Client } from "graphql-ws"

/** WebSocket URL for subscriptions: VITE_WS_URL, or VITE_API_URL with http(s) → ws(s). */
const WS_URL = import.meta.env.VITE_WS_URL ?? String(import.meta.env.VITE_API_URL).replace(/^http/, "ws")

const FORBIDDEN = 4403 // Server closes with this when the token is missing or invalid

let client: Client | null = null
const reconnectListeners = new Set<() => void>()

/**
 * The shared graphql-ws client. Lazy: the socket opens with the first subscription
 * and closes shortly after the last one ends. Reconnects with back-off, except
 * when the server rejects the token.
 */
export function wsClient(): Client {
    if (client) return client
    client = createClient({
        url: WS_URL,
        lazy: true,
        // Read at connect time, so a new login is picked up on the next connection
        connectionParams: () => {
            const token = localStorage.getItem("token")
            return token ? { authorization: `Bearer ${token}` } : {}
        },
        retryAttempts: Infinity,
        shouldRetry: (e) => !(e && typeof e === "object" && "code" in e && (e as CloseEvent).code === FORBIDDEN),
        on: {
            // Events may have been missed while the socket was down
            connected: (_socket, _payload, wasRetry) => {
                if (wasRetry) reconnectListeners.forEach((l) => l())
            },
        },
    })
    return client
}

/** Calls `listener` whenever the socket reconnects after a drop. Returns an unsubscribe function. */
export function onReconnect(listener: () => void): () => void {
    reconnectListeners.add(listener)
    return () => reconnectListeners.delete(listener)
}

/**
 * Subscribes to a GraphQL subscription and calls `onData` with each result's `data`.
 * @returns A function that ends the subscription.
 */
export function subscribe<T>(query: string, onData: (data: T) => void, variables?: Record<string, unknown>): () => void {
    return wsClient().subscribe<T>(
        { query, variables },
        {
            next: (result) => { if (result.data) onData(result.data as T) },
            error: (err) => console.warn("Subscription error", err),
            complete: () => {},
        },
    )
}

/** Closes the socket (e.g. on logout); the next subscription opens a fresh one with the new token. */
export function closeSocket() {
    client?.dispose()
    client = null
}
