import { act, renderHook } from "@testing-library/react"
import { readStorage, useLocalStorage, writeStorage } from "./use-local-storage"

describe("useLocalStorage", () => {
    it("🟢 starts from the initial value and persists updates", () => {
        const { result } = renderHook(() => useLocalStorage("range", 30))
        expect(result.current[0]).toBe(30)
        act(() => result.current[1](90))
        expect(result.current[0]).toBe(90)
        expect(localStorage.getItem("range")).toBe("90")
    })

    it("🟢 reads a stored value on mount", () => {
        localStorage.setItem("range", "7")
        const { result } = renderHook(() => useLocalStorage("range", 30))
        expect(result.current[0]).toBe(7)
    })

    it("🔴 falls back on bad JSON", () => {
        localStorage.setItem("range", "{oops")
        expect(readStorage("range", 30)).toBe(30)
    })

    it("🔴 falls back and doesn't throw when storage is blocked", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError") })
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("SecurityError") })
        const { result } = renderHook(() => useLocalStorage("range", 30))
        expect(result.current[0]).toBe(30)
        expect(() => act(() => result.current[1](7))).not.toThrow()
        expect(result.current[0]).toBe(7) // Still works in memory
        expect(() => writeStorage("x", 1)).not.toThrow()
    })

    it("🟢 raw mode stores plain strings (readable by the inline script in index.html)", () => {
        localStorage.setItem("pm-theme", "DARK")
        const { result } = renderHook(() => useLocalStorage<"LIGHT" | "DARK">("pm-theme", "LIGHT", { raw: true }))
        expect(result.current[0]).toBe("DARK")
        act(() => result.current[1]("LIGHT"))
        expect(localStorage.getItem("pm-theme")).toBe("LIGHT")
    })

    it("🔴 a stored value that fails isValid falls back to the initial value", () => {
        localStorage.setItem("range", "365d")
        const isValid = (v: unknown) => v === "7d" || v === "30d" || v === "90d"
        const { result } = renderHook(() => useLocalStorage("range", "30d", { raw: true, isValid }))
        expect(result.current[0]).toBe("30d")
        expect(readStorage("range", "30d", { raw: true, isValid })).toBe("30d")
    })
})
