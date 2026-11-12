import type { Task } from "@/types/taskTypes"
import { parseDate } from "@/components/pm/dates"

export type TaskSort = "due" | "priority" | "status" | "updated"
export type TaskGroup = "due" | "project"
/** What the Tasks page shows, kept in the URL so a refresh or a shared link keeps it. */
export type TaskView = { projects: string[]; sort: TaskSort; group: TaskGroup }

export const SORTS: { value: TaskSort; label: string }[] = [
    { value: "due", label: "Due date" },
    { value: "priority", label: "Priority" },
    { value: "status", label: "Status" },
    { value: "updated", label: "Recently updated" },
]
const DEFAULT: TaskView = { projects: [], sort: "due", group: "due" }
const PRIORITY_ORDER = ["URGENT", "HIGH", "NORMAL", "BACKLOG"]
const STATUS_ORDER = ["NEW", "IN_PROGRESS", "REOPENED", "RESOLVED"]

/** `?projects=a,b&sort=priority&group=project`; unknown values fall back to the defaults. */
export function readTaskView(params: URLSearchParams): TaskView {
    const sort = params.get("sort") as TaskSort
    const group = params.get("group") as TaskGroup
    return {
        projects: (params.get("projects") ?? "").split(",").filter(Boolean),
        sort: SORTS.some((s) => s.value === sort) ? sort : DEFAULT.sort,
        group: group === "project" ? "project" : DEFAULT.group,
    }
}

/** The view as URL params, leaving out anything that matches the defaults. */
export function writeTaskView(view: TaskView): URLSearchParams {
    const params = new URLSearchParams()
    if (view.projects.length) params.set("projects", view.projects.join(","))
    if (view.sort !== DEFAULT.sort) params.set("sort", view.sort)
    if (view.group !== DEFAULT.group) params.set("group", view.group)
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

/**
 * Filters to the chosen projects (ignoring ids the user can't see, e.g. from someone
 * else's link) and sorts. Ties keep a stable order by title.
 */
export function applyTaskView(tasks: Task[], view: TaskView, visibleProjectIds: string[]): Task[] {
    const chosen = view.projects.filter((id) => visibleProjectIds.includes(id))
    const filtered = chosen.length ? tasks.filter((t) => t.project && chosen.includes(t.project.id)) : tasks
    return [...filtered].sort((a, b) => compare[view.sort](a, b) || a.title.localeCompare(b.title))
}
