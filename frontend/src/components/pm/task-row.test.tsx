import { render, screen } from "@testing-library/react"
import type { Task } from "@/types/taskTypes"

const pending = vi.hoisted(() => new Set<string>())
vi.mock("@/components/forms/task-actions", () => ({ useTaskPending: (id: string) => pending.has(id) }))
const { TaskRow, isMyWork } = await import("./task-row")
const task = { id: "t1", title: "Fix login", currentStatus: "NEW", priority: "NORMAL" } as Task

describe("TaskRow (LDR-01)", () => {
    afterEach(() => pending.clear())

    it("🟢 while its status change is in flight the check-off is busy and can't be pressed again", () => {
        pending.add("t1")
        render(<TaskRow task={task} onToggle={vi.fn()} />)
        const check = screen.getByRole("checkbox", { name: "Resolve Fix login" })
        expect(check).toBeDisabled()
        expect(check.closest("[aria-busy=true]")).not.toBeNull()
    })

    it("🔴 idle rows are clickable", () => {
        render(<TaskRow task={task} onToggle={vi.fn()} />)
        expect(screen.getByRole("checkbox", { name: "Resolve Fix login" })).toBeEnabled()
    })
})

describe("my work (TSK-05)", () => {
    const sub = { id: "s2", title: "subT2", currentStatus: "NEW", priority: "NORMAL", deadline: null }
    it("🟢 a task is mine if it's assigned to me or one of its subtasks is", () => {
        expect(isMyWork({ ...task, assignedTo: { id: "me", name: "Me", email: "" } } as Task, "me")).toBe(true)
        expect(isMyWork({ ...task, assignedTo: null, mySubTasks: [sub] } as unknown as Task, "me")).toBe(true)
    })

    it("🔴 otherwise it isn't", () => {
        expect(isMyWork({ ...task, assignedTo: null, mySubTasks: [] } as unknown as Task, "me")).toBe(false)
        expect(isMyWork({ ...task, assignedTo: { id: "u1", name: "Ravi", email: "" } } as Task, "me")).toBe(false)
    })

    it("🟢 the row lists my subtasks under the parent", () => {
        render(<TaskRow task={{ ...task, assignedTo: null, mySubTasks: [sub] } as unknown as Task} />)
        expect(screen.getByText("subT2")).toBeInTheDocument()
        expect(screen.getByText(/assigned to you/)).toBeInTheDocument()
    })
})

