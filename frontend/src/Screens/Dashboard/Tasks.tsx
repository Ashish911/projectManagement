import React, { useState } from "react"
import { createPortal } from "react-dom"
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { IconChevronRight, IconListCheck, IconMessagePlus, IconPlus, IconArrowUpRight } from "@tabler/icons-react"
import { getSubTasks } from "@/api/subTaskApi"
import { Button } from "@/components/ui/button"
import { PageHead } from "@/components/pm/page-head"
import { Segmented } from "@/components/pm/segmented"
import { StatusBadge } from "@/components/pm/status-badge"
import { Avatar } from "@/components/pm/avatar"
import { Check } from "@/components/pm/check"
import { EmptyState } from "@/components/pm/empty-state"
import { TaskRow, dueBucket, isOverdue, type DueBucket } from "@/components/pm/task-row"
import { daysFrom, dueLabel, parseDate } from "@/components/pm/dates"
import { SubtaskChip } from "@/components/forms/task-sheet"
import { useForms } from "@/components/forms/forms-context"
import { useAppData } from "@/components/forms/use-app-data"
import { useTaskActions } from "@/components/forms/task-actions"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/types/taskTypes"
import type { SubTask } from "@/types/subTaskTypes"

const COLUMNS: TaskStatus[] = ["NEW", "IN_PROGRESS", "REOPENED", "RESOLVED"]
const COLUMN_LABEL: Record<TaskStatus, string> = { NEW: "New", IN_PROGRESS: "In progress", REOPENED: "Reopened", RESOLVED: "Resolved" }
const GROUPS: [DueBucket, string][] = [["overdue", "Overdue"], ["today", "Today"], ["week", "This week"], ["later", "Later"], ["done", "Resolved"]]

/** Board card: priority, due date, title, project, subtask chip, assignee. */
function TaskCard({ task, dragging, overlay }: { task: Task; dragging?: boolean; overlay?: boolean }) {
    const due = parseDate(task.deadline)
    const overdue = isOverdue(task)
    return (
        <div
            className={cn(
                "grid gap-2.5 rounded-xl border bg-card p-3 shadow-sm transition duration-base ease-out",
                overlay ? "rotate-[1.5deg] cursor-grabbing shadow-lg" : "cursor-grab hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
                dragging && "opacity-40",
            )}
        >
            <div className="flex items-center justify-between">
                <StatusBadge value={task.priority} />
                <span className={cn("num text-xs", overdue ? "tone-red tone-fg font-semibold" : "text-subtle-foreground")}>{due ? dueLabel(due) : ""}</span>
            </div>
            <div className="text-[13.5px] font-medium leading-[1.35]">{task.title}</div>
            <div className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1 truncate text-xs text-subtle-foreground">{task.project?.name}</span>
                <SubtaskChip task={task} />
                {task.assignedTo && <Avatar name={task.assignedTo.name} seed={task.assignedTo.id} size={22} />}
            </div>
        </div>
    )
}

/** Card wrapper that can be dragged to another column; a click (without dragging) opens the task. */
function DraggableCard({ task, canDrag, onOpen }: { task: Task; canDrag: boolean; onOpen: () => void }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: !canDrag })
    return (
        <div ref={setNodeRef} {...attributes} {...listeners} onClick={onOpen} className="animate-pm-in outline-none" aria-label={task.title}>
            <TaskCard task={task} dragging={isDragging} />
        </div>
    )
}

/** Board column that accepts dropped cards and highlights while one hovers over it. */
function Column({ status, count, dragging, canAdd, onAdd, children }: { status: TaskStatus; count: number; dragging: boolean; canAdd: boolean; onAdd: () => void; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: status })
    return (
        <div
            ref={setNodeRef}
            data-testid={`column-${status}`} // e2e drag-and-drop target
            className={cn(
                "grid min-h-[320px] content-start gap-2.5 rounded-xl border bg-surface-2 p-2.5 transition-colors duration-base",
                isOver && "border-primary bg-accent",
            )}
        >
            <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
                <StatusBadge value={status} />
                <span className="num rounded-full bg-surface-3 px-1.5 py-px text-[11px] text-muted-foreground">{count}</span>
                {canAdd && (
                    <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label={`Add task to ${COLUMN_LABEL[status]}`} onClick={onAdd}><IconPlus /></Button>
                )}
            </div>
            {children}
            {isOver && dragging && (
                <div className="animate-pm-in rounded-lg border-[1.5px] border-dashed border-primary p-3.5 text-center text-[12.5px] text-accent-foreground">Drop to mark {COLUMN_LABEL[status]}</div>
            )}
        </div>
    )
}

/** List row with a caret that reveals the task's subtasks (loaded on first expand). */
function ExpandableRow({ task, onOpen, onToggle }: { task: Task; onOpen: () => void; onToggle: () => void }) {
    const [open, setOpen] = useState(false)
    const [subs, setSubs] = useState<SubTask[] | null>(null)
    const hasSubs = (task.subTaskStats?.total ?? 0) > 0
    const toggleOpen = () => {
        setOpen(!open)
        if (!subs) getSubTasks(task.id).then(setSubs).catch(() => setSubs([]))
    }
    return (
        <div>
            <div className="grid grid-cols-[24px_minmax(0,1fr)] items-center">
                {hasSubs ? (
                    <button type="button" onClick={toggleOpen} aria-expanded={open} aria-label={open ? "Hide subtasks" : "Show subtasks"}
                        className={cn("grid size-[22px] place-items-center rounded-md text-subtle-foreground transition-transform duration-base ease-out hover:bg-surface-3 hover:text-foreground", open && "rotate-90")}>
                        <IconChevronRight size={15} />
                    </button>
                ) : <span />}
                <TaskRow task={task} showStatus onOpen={onOpen} onToggle={onToggle} />
            </div>
            {open && (
                <div className="mb-2 ml-9 grid animate-pm-in gap-px border-l-[1.5px] pl-3">
                    {subs === null ? (
                        <div className="px-2 py-1.5 text-xs text-subtle-foreground">Loading…</div>
                    ) : subs.map((s) => {
                        const due = parseDate(s.deadline)
                        const done = s.currentStatus === "RESOLVED"
                        return (
                            <div key={s.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-surface-2">
                                <Check checked={done} label={s.title} onChange={() => {}} disabled />
                                <span className={cn("min-w-0 flex-1 truncate", done && "text-subtle-foreground line-through")}>{s.title}</span>
                                {s.currentStatus === "IN_PROGRESS" && <span className="size-[7px] flex-none rounded-full bg-primary shadow-[0_0_0_3px_oklch(var(--accent))]" />}
                                {s.priority !== "NORMAL" && !done && <StatusBadge value={s.priority} />}
                                {due && <span className={cn("num w-[52px] text-right text-xs", !done && daysFrom(due) < 0 ? "tone-red tone-fg" : "text-subtle-foreground")}>{dueLabel(due)}</span>}
                                {s.assignedTo ? <Avatar name={s.assignedTo.name} seed={s.assignedTo.id} size={20} /> : <span className="size-5" />}
                            </div>
                        )
                    })}
                    <button type="button" onClick={onOpen} className="flex h-7 items-center gap-2 justify-self-start rounded-lg px-2 text-[12.5px] font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                        <IconArrowUpRight size={15} />Open task to edit subtasks
                    </button>
                </div>
            )}
        </div>
    )
}

export const Tasks: React.FC = () => {
    const openForm = useForms()
    const { profile, role, tasks, tasksLoaded } = useAppData()
    const { setStatus, toggleResolved } = useTaskActions()
    const isMember = role === "USER"
    const isAdmin = role === "SUPER_ADMIN" || role === "CLIENT_ADMIN"

    const [view, setView] = useState<"board" | "list">("board")
    const [who, setWho] = useState<"all" | "mine">("all")
    const [dragId, setDragId] = useState<string | null>(null)
    // A small movement threshold, so a plain click still opens the card
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

    const mine = (t: Task) => t.assignedTo?.id === profile?.id
    const visible = tasks.filter((t) => (isMember || who === "mine" ? mine(t) : true))
    const open = visible.filter((t) => t.currentStatus !== "RESOLVED").length
    const overdue = visible.filter(isOverdue).length
    // Members may only move their own tasks; admins can move any
    const canMove = (t: Task) => isAdmin || mine(t)

    const onDragStart = (e: DragStartEvent) => setDragId(String(e.active.id))
    const onDragEnd = (e: DragEndEvent) => {
        setDragId(null)
        const task = tasks.find((t) => t.id === e.active.id)
        if (task && e.over) setStatus(task, e.over.id as TaskStatus)
    }
    const dragged = tasks.find((t) => t.id === dragId)

    return (
        <>
            <PageHead title={isMember ? "My tasks" : "Tasks"} sub={`${open} open · ${overdue} overdue`}>
                <Segmented value={view} onChange={setView} options={[{ value: "board", label: "Board" }, { value: "list", label: "List" }]} />
                {!isMember && <Segmented value={who} onChange={setWho} options={[{ value: "all", label: "Everyone" }, { value: "mine", label: "Assigned to me" }]} />}
                {isAdmin && <Button onClick={() => openForm("task")}><IconPlus />New task</Button>}
                {isMember && <Button onClick={() => openForm("log-update")}><IconMessagePlus />Log update</Button>}
            </PageHead>

            {!tasksLoaded ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Loading tasks…</div>
            ) : view === "board" ? (
                <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
                    <div key={`b-${who}`} className="grid animate-pm-tab grid-cols-[repeat(4,minmax(240px,1fr))] items-start gap-3.5 overflow-x-auto pb-1.5">
                        {COLUMNS.map((s) => {
                            const col = visible.filter((t) => t.currentStatus === s)
                            return (
                                <Column key={s} status={s} count={col.length} dragging={!!dragId} canAdd={isAdmin && (s === "NEW" || s === "IN_PROGRESS")} onAdd={() => openForm("task", { status: s })}>
                                    {col.map((t) => (
                                        <DraggableCard key={t.id} task={t} canDrag={canMove(t)} onOpen={() => openForm("task-view", { id: t.id })} />
                                    ))}
                                </Column>
                            )
                        })}
                    </div>
                    {/* Portalled: PageTransition's filter/transform would make the fixed overlay sit off the pointer and drop into the wrong column */}
                    {createPortal(
                        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(.22,1,.36,1)" }}>{dragged ? <TaskCard task={dragged} overlay /> : null}</DragOverlay>,
                        document.body,
                    )}
                </DndContext>
            ) : (
                <div key={`l-${who}`} className="grid animate-pm-tab gap-4">
                    {GROUPS.map(([bucket, label], gi) => {
                        const list = visible.filter((t) => dueBucket(t) === bucket)
                        if (!list.length) return null
                        return (
                            <section key={bucket} className="animate-pm-in rounded-xl border bg-card px-2.5 py-2 shadow-sm" style={{ animationDelay: `${gi * 50}ms` }}>
                                <div className="flex items-center gap-2 px-2 pb-1.5 pt-2">
                                    <span className={cn("text-[15px] font-semibold tracking-[-0.01em]", bucket === "overdue" && "tone-red tone-fg")}>{label}</span>
                                    <span className="num rounded-full bg-surface-3 px-1.5 py-px text-[11px] text-muted-foreground">{list.length}</span>
                                </div>
                                {list.map((t) => (
                                    <ExpandableRow
                                        key={t.id}
                                        task={t}
                                        onOpen={() => openForm("task-view", { id: t.id })}
                                        onToggle={() => (canMove(t) ? toggleResolved(t) : openForm("task-view", { id: t.id }))}
                                    />
                                ))}
                            </section>
                        )
                    })}
                    {!visible.length && (
                        <div className="rounded-xl border bg-card"><EmptyState icon={IconListCheck} title={isMember || who === "mine" ? "Nothing assigned to you" : "No tasks yet"} /></div>
                    )}
                </div>
            )}
        </>
    )
}
