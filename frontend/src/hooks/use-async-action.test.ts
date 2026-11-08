import { act, renderHook } from "@testing-library/react"
import { useAsyncAction } from "./use-async-action"

/** A promise whose resolution the test controls. */
function deferred<T>() {
    let resolve!: (v: T) => void
    let reject!: (e: unknown) => void
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
}

describe("useAsyncAction", () => {
    it("🟢 is busy while the action runs and returns its result", async () => {
        const { result } = renderHook(() => useAsyncAction())
        const d = deferred<number>()
        let out: Promise<number | undefined>
        act(() => { out = result.current.run(() => d.promise) })
        expect(result.current.busy).toBe(true)
        await act(async () => { d.resolve(42); await out })
        expect(result.current.busy).toBe(false)
        await expect(out!).resolves.toBe(42)
    })

    it("🔴 stores a thrown error's message and returns undefined", async () => {
        const { result } = renderHook(() => useAsyncAction())
        let out: unknown
        await act(async () => { out = await result.current.run(() => Promise.reject(new Error("Server said no"))) })
        expect(out).toBeUndefined()
        expect(result.current.error).toBe("Server said no")
        expect(result.current.busy).toBe(false)
    })

    it("🟢 clears the previous error on the next run", async () => {
        const { result } = renderHook(() => useAsyncAction())
        await act(async () => { await result.current.run(() => Promise.reject(new Error("first"))) })
        await act(async () => { await result.current.run(() => Promise.resolve(1)) })
        expect(result.current.error).toBe("")
    })

    it("🔴 ignores a second run while the first is in flight (double click)", async () => {
        const { result } = renderHook(() => useAsyncAction())
        const d = deferred<void>()
        const fn = vi.fn(() => d.promise)
        act(() => { result.current.run(fn); result.current.run(fn) })
        expect(fn).toHaveBeenCalledTimes(1)
        await act(async () => { d.resolve() })
    })
})
