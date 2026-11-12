import { act, renderHook } from "@testing-library/react"

const state = vi.hoisted(() => ({ preference: { preference: null as null | { theme: string } } }))
const dispatch = vi.hoisted(() => vi.fn())
vi.mock("react-redux", () => ({ useDispatch: () => dispatch, useSelector: (sel: (s: any) => unknown) => sel(state) }))
vi.mock("@/redux/actions/preferenceActions", () => ({ savePreference: (p: unknown) => ({ type: "SAVE", p }) }))

// The theme is a module-level store, so each test gets a fresh copy
const load = async () => (await import("./use-theme")).useTheme
const saves = () => dispatch.mock.calls.filter(([a]) => a?.type === "SAVE").map(([a]) => a.p)

describe("useTheme", () => {
    beforeEach(() => {
        vi.resetModules()
        state.preference.preference = null
        dispatch.mockReset()
        document.documentElement.classList.remove("dark")
    })
    afterEach(() => { vi.useRealTimers() })

    it("🟢 starts from the cached theme and applies .dark", async () => {
        localStorage.setItem("pm-theme", "DARK")
        const useTheme = await load()
        const { result } = renderHook(() => useTheme())
        expect(result.current.theme).toBe("DARK")
        expect(document.documentElement).toHaveClass("dark")
    })

    it("🟢 toggling caches a plain string that index.html can read", async () => {
        const useTheme = await load()
        const { result } = renderHook(() => useTheme())
        act(() => result.current.toggle())
        expect(localStorage.getItem("pm-theme")).toBe("DARK") // Not '"DARK"'
        expect(document.documentElement).toHaveClass("dark")
    })

    it("🔴 an unknown cached value means light", async () => {
        localStorage.setItem("pm-theme", "PURPLE")
        const useTheme = await load()
        const { result } = renderHook(() => useTheme())
        expect(result.current.theme).toBe("LIGHT")
    })

    it("🔴 rapid clicks land on the last state and save once", async () => {
        vi.useFakeTimers()
        const useTheme = await load()
        const { result } = renderHook(() => useTheme())
        for (let i = 0; i < 5; i++) act(() => result.current.toggle())
        expect(result.current.theme).toBe("DARK") // Odd number of clicks
        expect(saves()).toEqual([])
        act(() => vi.advanceTimersByTime(500))
        expect(saves()).toEqual([{ theme: "DARK" }])
    })

    it("🔴 a stale server value doesn't flip the theme back while a save is pending", async () => {
        vi.useFakeTimers()
        const useTheme = await load()
        const { result, rerender } = renderHook(() => useTheme())
        act(() => result.current.toggle()) // DARK, save pending
        state.preference.preference = { theme: "LIGHT" } // An older save's response arrives
        rerender()
        expect(result.current.theme).toBe("DARK")
    })

    it("🟢 the header toggle and the account toggle share one theme", async () => {
        const useTheme = await load()
        const header = renderHook(() => useTheme())
        const account = renderHook(() => useTheme())
        act(() => header.result.current.toggle())
        expect(account.result.current.theme).toBe("DARK")
    })

    it("🟢 the server preference applies when nothing is pending", async () => {
        const useTheme = await load()
        const { result, rerender } = renderHook(() => useTheme())
        state.preference.preference = { theme: "DARK" }
        rerender()
        expect(result.current.theme).toBe("DARK")
        expect(saves()).toEqual([]) // Applying the server's value doesn't save it back
    })
})
