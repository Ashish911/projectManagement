import { act, renderHook } from "@testing-library/react"
import type { Task } from "@/types/taskTypes"

vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
const api = vi.hoisted(() => ({ updateTaskStatus: vi.fn() }))
vi.mock("@/api/taskApi", async (orig) => ({ ...(await orig<object>()), updateTaskStatus: api.updateTaskStatus }))
vi.mock("./toaster", async (orig) => ({ ...(await orig<object>()), toastError: vi.fn() }))

const { useTaskActions } = await import("./task-actions")
const task = (currentStatus: string) => ({ id: "t1", title: "Fix", currentStatus }) as Task

beforeEach(() => api.updateTaskStatus.mockReset().mockResolvedValue(task("REOPENED")))

describe("useTaskActions", () => {
    it("🟢 un-ticking a resolved task reopens it", async () => {
        const { result } = renderHook(() => useTaskActions())
        await act(() => result.current.toggleResolved(task("RESOLVED")))
        expect(api.updateTaskStatus).toHaveBeenCalledWith("t1", "REOPENED")
    })

    it("🔴 dragging a resolved task to any other column reopens it", async () => {
        const { result } = renderHook(() => useTaskActions())
        await act(() => result.current.setStatus(task("RESOLVED"), "NEW"))
        expect(api.updateTaskStatus).toHaveBeenCalledWith("t1", "REOPENED")
    })

    it("🟢 open tasks move freely", async () => {
        const { result } = renderHook(() => useTaskActions())
        await act(() => result.current.setStatus(task("NEW"), "IN_PROGRESS"))
        expect(api.updateTaskStatus).toHaveBeenCalledWith("t1", "IN_PROGRESS")
    })
})
