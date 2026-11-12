import { applyTaskView, readTaskView, writeTaskView, type TaskView } from "./tasks-view"
import type { Task } from "@/types/taskTypes"

const t = (id: string, o: Partial<Task>) => ({ id, title: id, priority: "NORMAL", currentStatus: "NEW", project: { id: "p1", name: "Portal" }, ...o }) as Task
const tasks = [
    t("a", { deadline: "2026-12-05", priority: "BACKLOG", currentStatus: "RESOLVED", updatedAt: "2026-11-01T00:00:00Z" }),
    t("b", { deadline: null, priority: "URGENT", currentStatus: "IN_PROGRESS", updatedAt: "2026-11-09T00:00:00Z", project: { id: "p2", name: "App" } }),
    t("c", { deadline: "2026-11-20", priority: "HIGH", currentStatus: "NEW", updatedAt: "2026-11-05T00:00:00Z" }),
]
const ids = (list: Task[]) => list.map((x) => x.id)

describe("readTaskView / writeTaskView", () => {
    it("🟢 reads projects and sort from the URL", () => {
        expect(readTaskView(new URLSearchParams("projects=p1,p2&sort=priority&group=project"))).toEqual({ projects: ["p1", "p2"], sort: "priority", group: "project" })
    })

    it("🔴 unknown values fall back to the defaults", () => {
        expect(readTaskView(new URLSearchParams("sort=banana&group=x"))).toEqual({ projects: [], sort: "due", group: "due" })
    })

    it("🟢 writes only what differs from the defaults", () => {
        expect(writeTaskView({ projects: ["p2"], sort: "due", group: "due" }).toString()).toBe("projects=p2")
        expect(writeTaskView({ projects: [], sort: "updated", group: "project" }).toString()).toBe("sort=updated&group=project")
    })
})

describe("applyTaskView", () => {
    const view = (o: Partial<Record<keyof TaskView, unknown>>) => ({ projects: [], sort: "due", group: "due", ...o }) as TaskView

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
