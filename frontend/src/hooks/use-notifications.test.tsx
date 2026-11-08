import { act, render, renderHook } from "@testing-library/react"
import type { Notification } from "@/api/notificationApi"

// ── Mocks: the HTTP API and the socket ───────────────────────────────────────
const api = vi.hoisted(() => ({
    getNotifications: vi.fn(),
    push: null as null | ((n: Notification) => void),
    unsubscribe: vi.fn(),
    subscribeToNotifications: vi.fn(),
}))
const ws = vi.hoisted(() => ({ reconnect: null as null | (() => void), off: vi.fn() }))

vi.mock("@/api/notificationApi", () => ({
    getNotifications: api.getNotifications,
    subscribeToNotifications: api.subscribeToNotifications,
}))
vi.mock("@/api/ws", () => ({
    onReconnect: (l: () => void) => { ws.reconnect = l; return ws.off },
}))

const n = (id: string, status: Notification["status"] = "UNREAD"): Notification => ({ id, content: `n${id}`, status, createdAt: "2026-10-06T00:00:00.000Z" })
const flush = () => act(async () => { await Promise.resolve() })

/** Fresh module per test, since the store is module state. */
async function load() {
    vi.resetModules()
    return await import("./use-notifications")
}

beforeEach(() => {
    api.getNotifications.mockReset().mockResolvedValue([n("1")])
    api.subscribeToNotifications.mockReset().mockImplementation((cb: (n: Notification) => void) => { api.push = cb; return api.unsubscribe })
    api.unsubscribe.mockReset()
    ws.off.mockReset()
    ws.reconnect = null
})

describe("useNotifications store", () => {
    it("🟢 the first subscriber loads once and opens one subscription", async () => {
        const { useNotifications } = await load()
        const { result } = renderHook(() => useNotifications())
        await flush()
        expect(result.current).toEqual([n("1")])
        expect(api.getNotifications).toHaveBeenCalledTimes(1)
        expect(api.subscribeToNotifications).toHaveBeenCalledTimes(1)
    })

    it("🔴 re-renders and extra subscribers cause no extra fetch (request-loop guard)", async () => {
        const { useNotifications } = await load()
        function Probe() { useNotifications(); return null }
        const { rerender } = render(<><Probe /><Probe /><Probe /></>)
        await flush()
        for (let i = 0; i < 20; i++) rerender(<><Probe /><Probe /><Probe /></>)
        await flush()
        expect(api.getNotifications).toHaveBeenCalledTimes(1)
        expect(api.subscribeToNotifications).toHaveBeenCalledTimes(1)
    })

    it("🟢 a pushed notification is prepended and announced", async () => {
        const { useNotifications, onNewNotification } = await load()
        const heard = vi.fn()
        onNewNotification(heard)
        const { result } = renderHook(() => useNotifications())
        await flush()
        act(() => api.push!(n("2")))
        expect(result.current.map((x) => x.id)).toEqual(["2", "1"])
        expect(heard).toHaveBeenCalledWith(n("2"))
    })

    it("🔴 ignores a push it already has", async () => {
        const { useNotifications, onNewNotification } = await load()
        const heard = vi.fn()
        onNewNotification(heard)
        const { result } = renderHook(() => useNotifications())
        await flush()
        act(() => api.push!(n("1")))
        expect(result.current).toHaveLength(1)
        expect(heard).not.toHaveBeenCalled()
    })

    it("🟢 refreshes after the socket reconnects", async () => {
        const { useNotifications } = await load()
        const { result } = renderHook(() => useNotifications())
        await flush()
        api.getNotifications.mockResolvedValue([n("3"), n("1")])
        await act(async () => { ws.reconnect!() })
        expect(api.getNotifications).toHaveBeenCalledTimes(2)
        expect(result.current.map((x) => x.id)).toEqual(["3", "1"])
    })

    it("🔴 keeps the current list when a refresh fails", async () => {
        const { useNotifications, refreshNotifications } = await load()
        const { result } = renderHook(() => useNotifications())
        await flush()
        api.getNotifications.mockRejectedValue(new Error("offline"))
        await act(async () => { await refreshNotifications() })
        expect(result.current).toEqual([n("1")])
    })

    it("🟢 the last unsubscribe closes the subscription and clears the list", async () => {
        const { useNotifications, currentNotifications } = await load()
        const { unmount } = renderHook(() => useNotifications())
        await flush()
        unmount()
        expect(api.unsubscribe).toHaveBeenCalledTimes(1)
        expect(ws.off).toHaveBeenCalledTimes(1)
        expect(currentNotifications()).toEqual([]) // Next user starts clean
    })
})
