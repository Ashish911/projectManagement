import { render, screen } from "@testing-library/react"
import type { Task } from "@/types/taskTypes"

const pending = vi.hoisted(() => new Set<string>())
vi.mock("@/components/forms/task-actions", () => ({ useTaskPending: (id: string) => pending.has(id) }))
const { TaskRow } = await import("./task-row")
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
