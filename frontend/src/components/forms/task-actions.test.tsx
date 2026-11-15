import { act, renderHook } from "@testing-library/react"
import type { Task } from "@/types/taskTypes"

vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
const api = vi.hoisted(() => ({ updateTaskStatus: vi.fn() }))
vi.mock("@/api/taskApi", async (orig) => ({ ...(await orig<object>()), updateTaskStatus: api.updateTaskStatus }))
vi.mock("./toaster", async (orig) => ({ ...(await orig<object>()), toastError: vi.fn() }))
const openForm = vi.hoisted(() => vi.fn())
vi.mock("./forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => openForm }))

const { useTaskActions, useTaskPending } = await import("./task-actions")
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

    it("🟢 the task is pending while its request runs (LDR-01)", async () => {
        let finish!: (t: Task) => void
        api.updateTaskStatus.mockReturnValue(new Promise<Task>((r) => { finish = r }))
        const { result } = renderHook(() => ({ actions: useTaskActions(), pending: useTaskPending("t1") }))
        let p!: Promise<unknown>
        act(() => { p = result.current.actions.setStatus(task("NEW"), "IN_PROGRESS") })
        expect(result.current.pending).toBe(true)
        await act(async () => { finish(task("IN_PROGRESS")); await p })
        expect(result.current.pending).toBe(false)
    })

    it("🔴 a second change while one is pending is ignored (no double submit)", async () => {
        let finish!: (t: Task) => void
        api.updateTaskStatus.mockReturnValue(new Promise<Task>((r) => { finish = r }))
        const { result } = renderHook(() => useTaskActions())
        let p!: Promise<unknown>
        act(() => { p = result.current.setStatus(task("NEW"), "IN_PROGRESS") })
        await act(() => result.current.setStatus(task("NEW"), "RESOLVED"))
        expect(api.updateTaskStatus).toHaveBeenCalledTimes(1)
        await act(async () => { finish(task("IN_PROGRESS")); await p })
    })
})
