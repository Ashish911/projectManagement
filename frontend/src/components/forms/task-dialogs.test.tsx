import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const task = { id: "t1", title: "Fix login", currentStatus: "RESOLVED", project: { id: "p1", name: "Portal" }, subTaskStats: { done: 1, total: 3 } }
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
vi.mock("./use-app-data", async (orig) => ({ ...(await orig<object>()), useAppData: () => ({ tasks: [task], users: [], projects: [] }) }))
const api = vi.hoisted(() => ({ updateTaskStatus: vi.fn(), deleteTask: vi.fn() }))
vi.mock("@/api/taskApi", async (orig) => ({ ...(await orig<object>()), updateTaskStatus: api.updateTaskStatus, deleteTask: api.deleteTask }))
const toast = vi.hoisted(() => vi.fn())
// Run deletes straight away instead of after the Undo window
vi.mock("./toaster", async (orig) => ({ ...(await orig<object>()), toast, scheduleDelete: ({ commit }: { commit: () => unknown }) => commit() }))
const openForm = vi.hoisted(() => vi.fn())
vi.mock("./forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => openForm }))

const { DeleteTaskForm, ReopenTaskForm } = await import("./task-dialogs")

const open = async (data: object) => {
    const onClose = vi.fn()
    render(<ReopenTaskForm data={{ taskId: "t1", ...data }} onClose={onClose} closing={false} />)
    await new Promise((r) => setTimeout(r, 100)) // FormModal's open-focus
    return onClose
}

beforeEach(() => { api.updateTaskStatus.mockReset().mockResolvedValue({ ...task, currentStatus: "REOPENED" }); openForm.mockReset() })

describe("ReopenTaskForm", () => {
    it("🟢 reopens with the reason and confirms", async () => {
        const onClose = await open({})
        expect(screen.getByText("Reopen “Fix login”?")).toBeInTheDocument()
        await userEvent.type(screen.getByPlaceholderText(/What still needs doing/), "Bug came back")
        await userEvent.click(screen.getByRole("button", { name: "Reopen task" }))
        expect(api.updateTaskStatus).toHaveBeenCalledWith("t1", "REOPENED", "Bug came back")
        expect(toast).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
    })

    it("🟢 the reason is optional", async () => {
        await open({})
        await userEvent.click(screen.getByRole("button", { name: "Reopen task" }))
        expect(api.updateTaskStatus).toHaveBeenCalledWith("t1", "REOPENED", "")
    })

    it("🟢 opened from the task panel, it goes back to the panel", async () => {
        await open({ returnToSheet: true })
        await userEvent.click(screen.getByRole("button", { name: "Reopen task" }))
        await new Promise((r) => setTimeout(r, 250)) // Waits for the dialog to close first
        expect(openForm).toHaveBeenCalledWith("task-view", { id: "t1" })
    })

    it("🔴 cancelling changes nothing", async () => {
        const onClose = await open({})
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
        expect(api.updateTaskStatus).not.toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
    })
})

describe("DeleteTaskForm", () => {
    const openDelete = async (data: object = {}) => {
        const onClose = vi.fn()
        render(<DeleteTaskForm data={{ taskId: "t1", ...data }} onClose={onClose} closing={false} />)
        return onClose
    }
    beforeEach(() => api.deleteTask.mockReset().mockResolvedValue(undefined))

    it("🟢 says how many sub-tasks go with it, then deletes", async () => {
        await openDelete()
        expect(screen.getByText(/This also deletes its 3 sub-tasks and all comments\./)).toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: /Delete task/ }))
        expect(api.deleteTask).toHaveBeenCalledWith("t1")
    })

    it("🔴 cancelling from the panel goes back to it and deletes nothing", async () => {
        await openDelete({ returnToSheet: true })
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
        await new Promise((r) => setTimeout(r, 250))
        expect(api.deleteTask).not.toHaveBeenCalled()
        expect(openForm).toHaveBeenCalledWith("task-view", { id: "t1" })
    })
})
