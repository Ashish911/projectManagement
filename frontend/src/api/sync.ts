/** Same-browser tab sync: tells the other open tabs that data changed, so they refetch. */
export const SYNC_CHANNEL = "projoman-sync"

let channel: BroadcastChannel | null | undefined

/** The shared channel, or null where BroadcastChannel isn't available. */
export const syncChannel = () => {
    if (channel === undefined) channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(SYNC_CHANNEL) : null
    return channel
}

// This tab's own listeners: lists derived from other stores (a user's client, project counts)
// go stale unless the tab that made the change refetches too (USR-08)
const localListeners = new Set<(mutation: string) => void>()
export function onLocalChange(listener: (mutation: string) => void): () => void {
    localListeners.add(listener)
    return () => { localListeners.delete(listener) }
}

/** Called after a successful mutation with its query text. Other tabs refetch everything; this one refetches what it touched. */
export function announceChange(mutation = "") {
    syncChannel()?.postMessage({ type: "changed" })
    localListeners.forEach((l) => l(mutation))
}
