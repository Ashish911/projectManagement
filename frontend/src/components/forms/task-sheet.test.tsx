import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const me = { id: "me", name: "Ada Admin", role: "SUPER_ADMIN" }
const base = { id: "t1", title: "Fix login", priority: "HIGH", deadline: null, assignedTo: { id: "u1", name: "Ravi Shah" }, createdBy: me, project: { id: "p1", name: "Portal" }, createdAt: null }
const state = vi.hoisted(() => ({ status: "RESOLVED" }))
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
vi.mock("./use-app-data", async (orig) => ({
    ...(await orig<object>()),
    useAppData: () => ({ profile: me, role: "SUPER_ADMIN", users: [], projects: [], tasks: [{ ...base, currentStatus: state.status }] }),
}))
const api = vi.hoisted(() => ({ updateTaskStatus: vi.fn(), getSubTasks: vi.fn(), getTaskComments: vi.fn() }))
vi.mock("@/api/taskApi", async (orig) => ({ ...(await orig<object>()), updateTaskStatus: api.updateTaskStatus }))
vi.mock("@/api/subTaskApi", async (orig) => ({ ...(await orig<object>()), getSubTasks: api.getSubTasks }))
vi.mock("@/api/commentApi", async (orig) => ({ ...(await orig<object>()), getTaskComments: api.getTaskComments }))

const openForm = vi.hoisted(() => vi.fn())
vi.mock("./forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => openForm }))

const { TaskSheet } = await import("./task-sheet")
const sub = { id: "s1", title: "Write test", currentStatus: "NEW", priority: "NORMAL", deadline: null, assignedTo: null }

async function open(status: string) {
    state.status = status
    api.getSubTasks.mockResolvedValue([sub])
    api.getTaskComments.mockResolvedValue([])
    render(<TaskSheet data={{ id: "t1" }} onClose={vi.fn()} closing={false} />)
    await act(async () => { await Promise.resolve() })
}

beforeEach(() => api.updateTaskStatus.mockReset().mockResolvedValue({ ...base, currentStatus: "REOPENED" }))

describe("TaskSheet — resolved tasks are read-only", () => {
    it("🔴 a resolved task can't be edited and offers Reopen", async () => {
        await open("RESOLVED")
        expect(screen.getByText(/This task is resolved, so it’s read-only/)).toBeInTheDocument()
        expect(screen.getByLabelText("Task title")).toBeDisabled()
        expect(screen.queryByPlaceholderText("Add a subtask, then press Enter")).not.toBeInTheDocument()
        expect(screen.getByRole("checkbox", { name: /Mark Write test/ })).toBeDisabled()
        await userEvent.click(screen.getByRole("button", { name: "Reopen task" }))
        expect(openForm).toHaveBeenCalledWith("reopen-task", { taskId: "t1", returnToSheet: true })
        expect(api.updateTaskStatus).not.toHaveBeenCalled()
    })

    it("🟢 comments stay open on a resolved task", async () => {
        await open("RESOLVED")
        expect(screen.getByPlaceholderText("Write a comment")).toBeEnabled()
    })

    it("🟢 an open task stays editable", async () => {
        await open("IN_PROGRESS")
        expect(screen.getByLabelText("Task title")).toBeEnabled()
        expect(screen.getByPlaceholderText("Add a subtask, then press Enter")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Reopen task" })).not.toBeInTheDocument()
    })
})
