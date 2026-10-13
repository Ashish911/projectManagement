const created = vi.hoisted(() => ({ options: null as any, dispose: vi.fn(), subscribe: vi.fn() }))
vi.mock("graphql-ws", () => ({
    createClient: (options: unknown) => {
        created.options = options
        return { dispose: created.dispose, subscribe: created.subscribe }
    },
}))

async function load() {
    vi.resetModules()
    return await import("./ws")
}

describe("ws client", () => {
    beforeEach(() => { created.options = null; created.dispose.mockReset(); created.subscribe.mockReset() })

    it("🟢 derives the ws:// URL from VITE_API_URL and connects lazily", async () => {
        const { wsClient } = await load()
        wsClient()
        expect(created.options.url).toBe("ws://localhost:8000/graphql")
        expect(created.options.lazy).toBe(true)
    })

    it("🟢 sends the token stored at connect time", async () => {
        const { wsClient } = await load()
        wsClient()
        expect(created.options.connectionParams()).toEqual({})
        localStorage.setItem("token", "abc")
        expect(created.options.connectionParams()).toEqual({ authorization: "Bearer abc" })
    })

    it("🔴 stops retrying when the server rejects the token (4403), retries on drops", async () => {
        const { wsClient } = await load()
        wsClient()
        expect(created.options.shouldRetry({ code: 4403 })).toBe(false)
        expect(created.options.shouldRetry({ code: 1006 })).toBe(true)
    })

    it("🟢 tells reconnect listeners only after a retry, not the first connect", async () => {
        const { wsClient, onReconnect } = await load()
        wsClient()
        const l = vi.fn()
        const off = onReconnect(l)
        created.options.on.connected({}, {}, false)
        expect(l).not.toHaveBeenCalled()
        created.options.on.connected({}, {}, true)
        expect(l).toHaveBeenCalledTimes(1)
        off()
        created.options.on.connected({}, {}, true)
        expect(l).toHaveBeenCalledTimes(1)
    })

    it("🟢 subscribe forwards only results that carry data", async () => {
        const { subscribe } = await load()
        const onData = vi.fn()
        subscribe("subscription S { x }", onData)
        const sink = created.subscribe.mock.calls[0][1]
        sink.next({ data: { x: 1 } })
        sink.next({ errors: [] })
        expect(onData).toHaveBeenCalledTimes(1)
        expect(onData).toHaveBeenCalledWith({ x: 1 })
    })

    it("🟢 closeSocket disposes the client and the next call makes a new one", async () => {
        const { wsClient, closeSocket } = await load()
        const first = wsClient()
        closeSocket()
        expect(created.dispose).toHaveBeenCalledTimes(1)
        expect(wsClient()).not.toBe(first)
    })
})
