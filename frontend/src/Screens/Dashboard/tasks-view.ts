import type { Task } from "@/types/taskTypes"
import { daysFrom, parseDate } from "@/components/pm/dates"

export type TaskSort = "due" | "priority" | "status" | "updated"
export type TaskGroup = "due" | "project"
export type TaskDue = "" | "overdue" | "week" | "none"
/**
 * What the Tasks page shows, kept in the URL so a refresh or a shared link keeps it.
 * `assignees` may include "none" (unassigned); `due` "" means any.
 */
export type TaskView = {
    projects: string[]; sort: TaskSort; group: TaskGroup
    clients: string[]; assignees: string[]; statuses: string[]; due: TaskDue
}

export const SORTS: { value: TaskSort; label: string }[] = [
    { value: "due", label: "Due date" },
    { value: "priority", label: "Priority" },
    { value: "status", label: "Status" },
    { value: "updated", label: "Recently updated" },
]
export const DUES: { value: TaskDue; label: string }[] = [
    { value: "", label: "Any due date" },
    { value: "overdue", label: "Overdue" },
    { value: "week", label: "Due in 7 days" },
    { value: "none", label: "No due date" },
]
const DEFAULT: TaskView = { projects: [], sort: "due", group: "due", clients: [], assignees: [], statuses: [], due: "" }
const PRIORITY_ORDER = ["URGENT", "HIGH", "NORMAL", "BACKLOG"]
const STATUS_ORDER = ["NEW", "IN_PROGRESS", "REOPENED", "RESOLVED"]

const list = (params: URLSearchParams, key: string) => (params.get(key) ?? "").split(",").filter(Boolean)

/** `?projects=a,b&sort=priority&group=project&clients=…&assignees=…&status=…&due=…`; unknown values fall back to the defaults. */
export function readTaskView(params: URLSearchParams): TaskView {
    const sort = params.get("sort") as TaskSort
    const group = params.get("group") as TaskGroup
    const due = params.get("due") as TaskDue
    return {
        projects: list(params, "projects"),
        sort: SORTS.some((s) => s.value === sort) ? sort : DEFAULT.sort,
        group: group === "project" ? "project" : DEFAULT.group,
        clients: list(params, "clients"),
        assignees: list(params, "assignees"),
        statuses: list(params, "status").filter((x) => STATUS_ORDER.includes(x)),
        due: DUES.some((d) => d.value === due) ? due : DEFAULT.due,
    }
}

/** The view as URL params, leaving out anything that matches the defaults. */
export function writeTaskView(view: TaskView): URLSearchParams {
    const params = new URLSearchParams()
    if (view.projects.length) params.set("projects", view.projects.join(","))
    if (view.sort !== DEFAULT.sort) params.set("sort", view.sort)
    if (view.group !== DEFAULT.group) params.set("group", view.group)
    if (view.clients.length) params.set("clients", view.clients.join(","))
    if (view.assignees.length) params.set("assignees", view.assignees.join(","))
    if (view.statuses.length) params.set("status", view.statuses.join(","))
    if (view.due) params.set("due", view.due)
    return params
}

const time = (iso?: string | null) => parseDate(iso)?.getTime()
const compare: Record<TaskSort, (a: Task, b: Task) => number> = {
    // Soonest first; no deadline goes last
    due: (a, b) => (time(a.deadline) ?? Infinity) - (time(b.deadline) ?? Infinity),
    priority: (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
    status: (a, b) => STATUS_ORDER.indexOf(a.currentStatus) - STATUS_ORDER.indexOf(b.currentStatus),
    updated: (a, b) => (time(b.updatedAt) ?? 0) - (time(a.updatedAt) ?? 0),
}

const dueMatches = (t: Task, due: TaskDue) => {
    if (!due) return true
    const d = parseDate(t.deadline)
    if (due === "none") return !d
    if (!d || t.currentStatus === "RESOLVED") return false
    const n = daysFrom(d)
    return due === "overdue" ? n < 0 : n >= 0 && n < 7
}

/**
 * Filters to the chosen projects (ignoring ids the user can't see, e.g. from someone
 * else's link), clients (via `clientOf`, project id → client id), assignees, statuses and
 * due date, then sorts. Ties keep a stable order by title.
 */
export function applyTaskView(tasks: Task[], view: TaskView, visibleProjectIds: string[], clientOf: Record<string, string | undefined> = {}): Task[] {
    const chosen = view.projects.filter((id) => visibleProjectIds.includes(id))
    const filtered = tasks.filter((t) =>
        (!chosen.length || (!!t.project && chosen.includes(t.project.id))) &&
        (!view.clients.length || (!!t.project && view.clients.includes(clientOf[t.project.id] ?? ""))) &&
        (!view.assignees.length || view.assignees.includes(t.assignedTo?.id ?? "none")) &&
        (!view.statuses.length || view.statuses.includes(t.currentStatus)) &&
        dueMatches(t, view.due),
    )
    return [...filtered].sort((a, b) => compare[view.sort](a, b) || a.title.localeCompare(b.title))
}
