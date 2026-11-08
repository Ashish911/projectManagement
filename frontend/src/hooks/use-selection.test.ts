import { act, renderHook } from "@testing-library/react"
import { useSelection } from "./use-selection"

describe("useSelection", () => {
    it("🟢 toggles one id and reports a mixed state", () => {
        const { result } = renderHook(() => useSelection(["a", "b", "c"]))
        act(() => result.current.toggle("b"))
        expect(result.current.selected).toEqual(["b"])
        expect(result.current.isSelected("b")).toBe(true)
        expect(result.current.mixed).toBe(true)
        expect(result.current.allSelected).toBe(false)
        act(() => result.current.toggle("b"))
        expect(result.current.selected).toEqual([])
    })

    it("🟢 toggleAll selects everything, then nothing", () => {
        const { result } = renderHook(() => useSelection(["a", "b"]))
        act(() => result.current.toggleAll())
        expect(result.current.selected).toEqual(["a", "b"])
        expect(result.current.allSelected).toBe(true)
        expect(result.current.mixed).toBe(false)
        act(() => result.current.toggleAll())
        expect(result.current.selected).toEqual([])
    })

    it("🔴 drops ids that are no longer in the list (filtered or deleted)", () => {
        const { result, rerender } = renderHook(({ ids }) => useSelection(ids), { initialProps: { ids: ["a", "b", "c"] } })
        act(() => result.current.toggleAll())
        rerender({ ids: ["a", "c"] })
        expect(result.current.selected).toEqual(["a", "c"])
        expect(result.current.allSelected).toBe(true)
    })

    it("🔴 an empty list is never 'all selected'", () => {
        const { result } = renderHook(() => useSelection([]))
        expect(result.current.allSelected).toBe(false)
    })

    it("🟢 clear empties the selection", () => {
        const { result } = renderHook(() => useSelection(["a", "b"]))
        act(() => result.current.toggleAll())
        act(() => result.current.clear())
        expect(result.current.selected).toEqual([])
    })
})
