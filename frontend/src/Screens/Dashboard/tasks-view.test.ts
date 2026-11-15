import { applyTaskView, readTaskView, writeTaskView, type TaskView } from "./tasks-view"
import type { Task } from "@/types/taskTypes"

const t = (id: string, o: Partial<Task>) => ({ id, title: id, priority: "NORMAL", currentStatus: "NEW", project: { id: "p1", name: "Portal" }, ...o }) as Task
const tasks = [
    t("a", { deadline: "2026-12-05", priority: "BACKLOG", currentStatus: "RESOLVED", updatedAt: "2026-11-01T00:00:00Z" }),
    t("b", { deadline: null, priority: "URGENT", currentStatus: "IN_PROGRESS", updatedAt: "2026-11-09T00:00:00Z", project: { id: "p2", name: "App" } }),
    t("c", { deadline: "2026-11-20", priority: "HIGH", currentStatus: "NEW", updatedAt: "2026-11-05T00:00:00Z" }),
]
const ids = (list: Task[]) => list.map((x) => x.id)

const view = (o: Partial<Record<keyof TaskView, unknown>>) => ({ projects: [], sort: "due", group: "due", clients: [], assignees: [], statuses: [], due: "", ...o }) as TaskView

describe("readTaskView / writeTaskView", () => {
    it("🟢 reads projects and sort from the URL", () => {
        expect(readTaskView(new URLSearchParams("projects=p1,p2&sort=priority&group=project"))).toMatchObject({ projects: ["p1", "p2"], sort: "priority", group: "project" })
    })

    it("🔴 unknown values fall back to the defaults", () => {
        expect(readTaskView(new URLSearchParams("sort=banana&group=x&due=later&status=DONE"))).toEqual({ projects: [], sort: "due", group: "due", clients: [], assignees: [], statuses: [], due: "" })
    })

    it("🟢 writes only what differs from the defaults", () => {
        expect(writeTaskView(view({ projects: ["p2"] })).toString()).toBe("projects=p2")
        expect(writeTaskView(view({ sort: "updated", group: "project" })).toString()).toBe("sort=updated&group=project")
    })
})

describe("applyTaskView", () => {
    it("🟢 filters by project", () => {
        expect(ids(applyTaskView(tasks, view({ projects: ["p2"] }), ["p1", "p2"]))).toEqual(["b"])
    })

    it("🔴 ignores projects you can't see", () => {
        expect(ids(applyTaskView(tasks, view({ projects: ["secret"] }), ["p1", "p2"]))).toEqual(["c", "a", "b"])
    })

    it.each([
        ["due", ["c", "a", "b"]], // Soonest first, no deadline last
        ["priority", ["b", "c", "a"]], // Urgent → backlog
        ["status", ["c", "b", "a"]], // New, in progress, …, resolved
        ["updated", ["b", "c", "a"]], // Most recent first
    ])("🟢 sorts by %s", (sort, expected) => {
        expect(ids(applyTaskView(tasks, view({ sort }), ["p1", "p2"]))).toEqual(expected)
    })
})

describe("oversight filters (TSK-04)", () => {
    const u = (id: string) => ({ id, name: id, email: "" })
    const today = new Date()
    const iso = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days).toISOString()
    const list = [
        t("late", { deadline: iso(-2), assignedTo: u("u1"), currentStatus: "NEW" }),
        t("soon", { deadline: iso(3), assignedTo: u("u2"), currentStatus: "REOPENED", project: { id: "p2", name: "App" } }),
        t("open", { deadline: null, assignedTo: null, currentStatus: "IN_PROGRESS" }),
    ]
    const clientOf = { p1: "c1", p2: "c2" }
    const run = (o: Partial<Record<keyof TaskView, unknown>>) => ids(applyTaskView(list, view(o), ["p1", "p2"], clientOf)).sort()

    it("🟢 the new filters round-trip through the URL", () => {
        const v = view({ clients: ["c1"], assignees: ["u1", "none"], statuses: ["NEW", "REOPENED"], due: "overdue" })
        expect(readTaskView(writeTaskView(v))).toEqual(v)
    })

    it("🟢 by client (through the task's project)", () => expect(run({ clients: ["c2"] })).toEqual(["soon"]))
    it("🟢 by assignee, including unassigned", () => expect(run({ assignees: ["u1", "none"] })).toEqual(["late", "open"]))
    it("🟢 by status", () => expect(run({ statuses: ["REOPENED", "IN_PROGRESS"] })).toEqual(["open", "soon"]))
    it("🟢 by due date", () => {
        expect(run({ due: "overdue" })).toEqual(["late"])
        expect(run({ due: "week" })).toEqual(["soon"])
        expect(run({ due: "none" })).toEqual(["open"])
    })
})

