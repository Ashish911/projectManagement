import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const me = { id: "me", name: "Ada Admin", role: "SUPER_ADMIN" }
const subsFor = vi.hoisted(() => ({ list: null as null | object[] }))
const base = { id: "t1", title: "Fix login", priority: "HIGH", deadline: null, assignedTo: { id: "u1", name: "Ravi Shah" }, createdBy: me, project: { id: "p1", name: "Portal" }, createdAt: null }
const state = vi.hoisted(() => ({ status: "RESOLVED", role: "SUPER_ADMIN", projects: [] as { id: string; canManage: boolean }[] }))
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
vi.mock("./use-app-data", async (orig) => ({
    ...(await orig<object>()),
    useAppData: () => ({ profile: me, role: state.role, users: [], projects: state.projects, tasks: [{ ...base, currentStatus: state.status }] }),
}))
const api = vi.hoisted(() => ({ updateTaskStatus: vi.fn(), getSubTasks: vi.fn(), getTaskComments: vi.fn(), deleteSubTask: vi.fn() }))
vi.mock("@/api/taskApi", async (orig) => ({ ...(await orig<object>()), updateTaskStatus: api.updateTaskStatus }))
vi.mock("@/api/subTaskApi", async (orig) => ({ ...(await orig<object>()), getSubTasks: api.getSubTasks, deleteSubTask: api.deleteSubTask }))
vi.mock("@/api/commentApi", async (orig) => ({ ...(await orig<object>()), getTaskComments: api.getTaskComments }))

const openForm = vi.hoisted(() => vi.fn())
vi.mock("./forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => openForm }))

const { TaskSheet } = await import("./task-sheet")
const sub = { id: "s1", title: "Write test", currentStatus: "NEW", priority: "NORMAL", deadline: null, assignedTo: null }

async function open(status: string) {
    state.status = status
    api.getSubTasks.mockResolvedValue(subsFor.list ?? [sub])
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

describe("TaskSheet — deleting", () => {
    it("🔴 Delete task asks first", async () => {
        await open("IN_PROGRESS")
        await userEvent.click(screen.getByRole("button", { name: /Delete task/ }))
        expect(openForm).toHaveBeenCalledWith("delete-task", { taskId: "t1", returnToSheet: true })
    })

    it("🔴 deleting a sub-task asks first", async () => {
        api.deleteSubTask.mockReset().mockResolvedValue(undefined)
        await open("IN_PROGRESS")
        await userEvent.click(screen.getByText("Write test"))
        await userEvent.click(screen.getByRole("button", { name: "Delete" }))
        expect(api.deleteSubTask).not.toHaveBeenCalled()
        expect(screen.getByText("Delete this sub-task and its comments?")).toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: "Yes, delete" }))
        expect(api.deleteSubTask).toHaveBeenCalledWith("s1")
    })
})

describe("TaskSheet — a client admin", () => {
    afterEach(() => { state.role = "SUPER_ADMIN"; state.projects = [] })

    it("🔴 on another client's project, can't edit or delete someone else's task", async () => {
        state.role = "CLIENT_ADMIN"
        state.projects = [{ id: "p1", canManage: false }]
        await open("IN_PROGRESS")
        expect(screen.getByLabelText("Task title")).toBeDisabled()
        expect(screen.queryByRole("button", { name: /Delete task/ })).not.toBeInTheDocument()
        expect(screen.getByPlaceholderText("Write a comment")).toBeEnabled()
    })

    it("🟢 on their own client's project, edits and deletes any task", async () => {
        state.role = "CLIENT_ADMIN"
        state.projects = [{ id: "p1", canManage: true }]
        await open("IN_PROGRESS")
        expect(screen.getByLabelText("Task title")).toBeEnabled()
        expect(screen.getByRole("button", { name: /Delete task/ })).toBeInTheDocument()
    })
})

describe("TaskSheet — someone who only owns a subtask (TSK-05)", () => {
    const mine = { id: "s2", title: "subT2", currentStatus: "NEW", priority: "NORMAL", deadline: null, assignedTo: { id: "me", name: "Ada Admin" } }
    const theirs = { id: "s3", title: "subT3", currentStatus: "NEW", priority: "NORMAL", deadline: null, assignedTo: { id: "u1", name: "Ravi Shah" } }
    beforeEach(() => { state.role = "USER"; state.projects = [{ id: "p1", canManage: false }]; subsFor.list = [mine, theirs] })
    afterEach(() => { state.role = "SUPER_ADMIN"; state.projects = []; subsFor.list = null })

    it("🟢 reads the parent but can't edit it, or add subtasks to it", async () => {
        await open("NEW")
        expect(screen.getByLabelText("Task title")).toBeDisabled()
        expect(screen.queryByPlaceholderText("Add a subtask, then press Enter")).not.toBeInTheDocument()
    })

    it("🟢 edits their own subtask; someone else's is read-only", async () => {
        await open("NEW")
        expect(screen.getByRole("checkbox", { name: /Mark subT2/ })).toBeEnabled()
        expect(screen.getByRole("checkbox", { name: /Mark subT3/ })).toBeDisabled()
        expect(screen.getByText("Yours")).toBeInTheDocument()
    })
})

