import { cn } from "@/lib/utils"
import type { Task } from "@/types/taskTypes"
import { SubtaskChip } from "@/components/forms/task-sheet"
import { useTaskPending } from "@/components/forms/task-actions"
import { Spinner } from "@/components/forms/form-kit"
import { Avatar } from "./avatar"
import { Check } from "./check"
import { StatusBadge } from "./status-badge"
import { daysFrom, dueLabel, parseDate } from "./dates"

/**
 * One task line: optional check-off, title + project, subtask chip, priority,
 * due date (red when overdue), assignee, and optionally the status.
 */
export function TaskRow({ task, showStatus, showProject = true, onOpen, onToggle }: {
    task: Task
    showStatus?: boolean
    showProject?: boolean
    /** Click anywhere on the row */
    onOpen?: () => void
    /** Shows a checkbox that resolves / reopens the task */
    onToggle?: () => void
}) {
    const due = parseDate(task.deadline)
    const done = task.currentStatus === "RESOLVED"
    const overdue = !!due && !done && daysFrom(due) < 0
    const pending = useTaskPending(task.id)

    return (
        <div
            onClick={onOpen}
            className={cn("flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-fast hover:bg-surface-2", onOpen && "cursor-pointer")}
        >
            {onToggle && (
                <span aria-busy={pending || undefined} className="relative grid place-items-center">
                    <Check checked={done} label={done ? `Reopen ${task.title}` : `Resolve ${task.title}`} onChange={onToggle} disabled={pending} />
                    {pending && <span className="absolute text-primary [&>span]:size-3"><Spinner /></span>}
                </span>
            )}
            <div className="min-w-0 flex-1">
                <div className={cn("truncate text-[13.5px] font-medium transition-colors duration-base", done && "text-subtle-foreground line-through")}>{task.title}</div>
                {showProject && task.project && <div className="truncate text-xs text-subtle-foreground">{task.project.name}</div>}
                <MySubTasks task={task} />
            </div>
            <SubtaskChip task={task} />
            <StatusBadge value={task.priority} />
            <span className={cn("num w-[60px] text-right text-[12.5px]", overdue ? "tone-red tone-fg font-semibold" : "text-muted-foreground")}>{dueLabel(due)}</span>
            {task.assignedTo ? <Avatar name={task.assignedTo.name} seed={task.assignedTo.id} size={24} /> : <span className="size-6 flex-none" />}
            {showStatus && <span className="hidden w-24 justify-end sm:flex"><StatusBadge value={task.currentStatus} /></span>}
        </div>
    )
}

/** The viewer's own subtasks under a parent: "↳ subT2 · assigned to you" (TSK-05). */
export function MySubTasks({ task }: { task: Task }) {
    if (!task.mySubTasks?.length) return null
    return (
        <ul className="mt-0.5 grid gap-px">
            {task.mySubTasks.map((s) => (
                <li key={s.id} className="flex min-w-0 items-center gap-1.5 text-xs">
                    <span className="text-subtle-foreground">↳</span>
                    <span className={cn("truncate font-medium text-accent-foreground", s.currentStatus === "RESOLVED" && "line-through opacity-60")}>{s.title}</span>
                    <span className="flex-none text-subtle-foreground">· assigned to you</span>
                </li>
            ))}
        </ul>
    )
}

/** My work: the task is assigned to me, or one of its subtasks is (TSK-05). Lists and counts share this. */
export const isMyWork = (t: Task, me: string | undefined) => !!me && (t.assignedTo?.id === me || (t.mySubTasks?.length ?? 0) > 0)

/** Open = anything not resolved. Overdue = open with a past deadline. */
export const isOpen = (t: Task) => t.currentStatus !== "RESOLVED"
export const isOverdue = (t: Task) => {
    const d = parseDate(t.deadline)
    return isOpen(t) && !!d && daysFrom(d) < 0
}

/** Due bucket used by list views: overdue, today, this week, later, or done. */
export type DueBucket = "overdue" | "today" | "week" | "later" | "done"
export function dueBucket(t: Task): DueBucket {
    if (!isOpen(t)) return "done"
    const d = parseDate(t.deadline)
    if (!d) return "later"
    const n = daysFrom(d)
    return n < 0 ? "overdue" : n === 0 ? "today" : n < 7 ? "week" : "later"
}
