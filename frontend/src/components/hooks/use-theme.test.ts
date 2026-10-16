import { act, renderHook } from "@testing-library/react"

const state = vi.hoisted(() => ({ preference: { preference: null as null | { theme: string } } }))
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: (sel: (s: any) => unknown) => sel(state) }))
vi.mock("@/redux/actions/preferenceActions", () => ({ savePreference: (p: unknown) => ({ type: "SAVE", p }) }))

const { useTheme } = await import("./use-theme")

describe("useTheme", () => {
    beforeEach(() => { state.preference.preference = null; document.documentElement.classList.remove("dark") })

    it("🟢 starts from the cached theme and applies .dark", () => {
        localStorage.setItem("pm-theme", "DARK")
        const { result } = renderHook(() => useTheme())
        expect(result.current.theme).toBe("DARK")
        expect(document.documentElement).toHaveClass("dark")
    })

    it("🟢 toggling caches a plain string that index.html can read", () => {
        const { result } = renderHook(() => useTheme())
        act(() => result.current.toggle())
        expect(localStorage.getItem("pm-theme")).toBe("DARK") // Not '"DARK"'
        expect(document.documentElement).toHaveClass("dark")
    })

    it("🔴 an unknown cached value means light", () => {
        localStorage.setItem("pm-theme", "PURPLE")
        const { result } = renderHook(() => useTheme())
        expect(result.current.theme).toBe("LIGHT")
    })
})
