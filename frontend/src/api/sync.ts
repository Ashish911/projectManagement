/** Same-browser tab sync: tells the other open tabs that data changed, so they refetch. */
export const SYNC_CHANNEL = "projoman-sync"

let channel: BroadcastChannel | null | undefined

/** The shared channel, or null where BroadcastChannel isn't available. */
export const syncChannel = () => {
    if (channel === undefined) channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(SYNC_CHANNEL) : null
    return channel
}

/** Called after a successful mutation. Other tabs refresh; this one already updated itself. */
export function announceChange() {
    syncChannel()?.postMessage({ type: "changed" })
}
