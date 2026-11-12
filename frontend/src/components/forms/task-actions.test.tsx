import { act, renderHook } from "@testing-library/react"
import type { Task } from "@/types/taskTypes"

vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
const api = vi.hoisted(() => ({ updateTaskStatus: vi.fn() }))
vi.mock("@/api/taskApi", async (orig) => ({ ...(await orig<object>()), updateTaskStatus: api.updateTaskStatus }))
vi.mock("./toaster", async (orig) => ({ ...(await orig<object>()), toastError: vi.fn() }))
const openForm = vi.hoisted(() => vi.fn())
vi.mock("./forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => openForm }))

const { useTaskActions } = await import("./task-actions")
const task = (currentStatus: string) => ({ id: "t1", title: "Fix", currentStatus }) as Task

beforeEach(() => { api.updateTaskStatus.mockReset().mockResolvedValue(task("REOPENED")); openForm.mockReset() })

describe("useTaskActions", () => {
    it("🔴 un-ticking a resolved task asks before reopening it", async () => {
        const { result } = renderHook(() => useTaskActions())
        await act(() => result.current.toggleResolved(task("RESOLVED")))
        expect(openForm).toHaveBeenCalledWith("reopen-task", { taskId: "t1" })
        expect(api.updateTaskStatus).not.toHaveBeenCalled()
    })

    it("🔴 dragging a resolved task to any other column asks before reopening it", async () => {
        const { result } = renderHook(() => useTaskActions())
        await act(() => result.current.setStatus(task("RESOLVED"), "NEW"))
        expect(openForm).toHaveBeenCalledWith("reopen-task", { taskId: "t1" })
        expect(api.updateTaskStatus).not.toHaveBeenCalled()
    })

    it("🟢 open tasks move freely", async () => {
        const { result } = renderHook(() => useTaskActions())
        await act(() => result.current.setStatus(task("NEW"), "IN_PROGRESS"))
        expect(api.updateTaskStatus).toHaveBeenCalledWith("t1", "IN_PROGRESS")
    })
})
