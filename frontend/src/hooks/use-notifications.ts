import { useSyncExternalStore } from "react"
import { getNotifications, subscribeToNotifications, type Notification } from "@/api/notificationApi"
import { onReconnect } from "@/api/ws"

// ── Shared notification store ─────────────────────────────────────────────────
// One list for the header's unread dot and the notifications sheet. Loaded once,
// then kept live over WebSocket; a slow poll and a refresh after reconnecting
// cover anything the socket missed.

let items: Notification[] = []
const listeners = new Set<() => void>()
const newListeners = new Set<(n: Notification) => void>()
const emit = () => listeners.forEach((l) => l())

/** Replaces the list (used for loads and optimistic updates). */
export function setNotifications(next: Notification[]) {
    // An empty result replacing an empty list is no change; skipping it avoids needless re-renders
    if (!next.length && !items.length) return
    items = next
    emit()
}

export const currentNotifications = () => items

export async function refreshNotifications() {
    try {
        setNotifications(await getNotifications())
    } catch {
        // Keep what we have; the next poll or push will catch up
    }
}

const SAFETY_POLL_MS = 5 * 60_000 // Backstop only; new notifications arrive over the socket
let stop: (() => void) | null = null

function start() {
    refreshNotifications()
    const unsubscribe = subscribeToNotifications((n) => {
        if (items.some((x) => x.id === n.id)) return
        setNotifications([n, ...items])
        newListeners.forEach((l) => l(n))
    })
    const offReconnect = onReconnect(refreshNotifications)
    const poller = setInterval(refreshNotifications, SAFETY_POLL_MS)
    return () => { unsubscribe(); offReconnect(); clearInterval(poller) }
}

/**
 * Must be a stable function: useSyncExternalStore re-subscribes whenever it changes,
 * and each re-subscribe would restart the socket subscription with a fresh fetch.
 */
const subscribeStore = (listener: () => void) => {
    listeners.add(listener)
    if (!stop) stop = start()
    return () => {
        listeners.delete(listener)
        if (!listeners.size && stop) { stop(); stop = null; items = [] }
    }
}
const snapshot = () => items

/** Live notification list, newest first. The first subscriber opens the WebSocket subscription. */
export function useNotifications() {
    return useSyncExternalStore(subscribeStore, snapshot)
}

/** Calls `listener` for each notification pushed live (not for loads). Returns an unsubscribe function. */
export function onNewNotification(listener: (n: Notification) => void): () => void {
    newListeners.add(listener)
    return () => newListeners.delete(listener)
}
