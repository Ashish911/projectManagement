import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useDispatch } from "react-redux"
import {
    IconChevronDown,
    IconChevronRight,
    IconCircleCheck,
    IconCloudCheck,
    IconEye,
    IconEyeOff,
    IconFolder,
    IconMessage,
    IconPlus,
    IconSend,
    IconSubtask,
    IconTrash,
    IconX,
} from "@tabler/icons-react"
import { deleteTask, updateTask, updateTaskStatus } from "@/api/taskApi"
import { createSubTask, deleteSubTask, getSubTasks, updateSubTask, updateSubTaskStatus } from "@/api/subTaskApi"
import { addTaskComment, deleteComment, getTaskComments } from "@/api/commentApi"
import { addTaskToStore, removeTaskFromStore, updateTaskInStore } from "@/redux/actions/tasksActions"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/pm/avatar"
import { Check } from "@/components/pm/check"
import { StatusBadge } from "@/components/pm/status-badge"
import { daysFrom, dueLabel, parseDate } from "@/components/pm/dates"
import { cn } from "@/lib/utils"
import type { Priority, Task, TaskStatus } from "@/types/taskTypes"
import type { SubTask } from "@/types/subTaskTypes"
import type { Comment } from "@/types/commentTypes"
import { Field, Grid2, Kbd, Note, Pills, Spinner, inputCls } from "./form-kit"
import { Combo } from "./combo"
import { DatePicker, daysFromToday } from "./date-picker"
import { GhostAvatar, PRIORITY_TOKENS, assigneeOptions, parseDayToken } from "./options"
import { useAppData } from "./use-app-data"
import type { FormProps } from "./forms-context"
import { scheduleDelete, toastError } from "./toaster"

const STATUSES = ["NEW", "IN_PROGRESS", "REOPENED", "RESOLVED"] as const
const PRIORITIES = ["URGENT", "HIGH", "NORMAL", "BACKLOG"] as const

/** Right-hand panel with a dimmed backdrop; Esc closes. Used for the task sheet and notifications. */
export function SideSheet({ onClose, closing, width = 580, label, children }: { onClose: () => void; closing: boolean; width?: number; label: string; children: React.ReactNode }) {
    const closeRef = useRef(onClose)
    closeRef.current = onClose
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current()
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])
    return createPortal(
        <div className={cn("fixed inset-0 z-50 bg-[oklch(0.22_0.01_65/.22)] dark:bg-[oklch(0.05_0_0/.6)]", closing ? "animate-fm-fade-out" : "animate-fm-fade")} onMouseDown={onClose}>
            <aside
                role="dialog"
                aria-label={label}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn("fixed bottom-2 right-2 top-2 flex flex-col rounded-[14px] border bg-card shadow-lg", closing ? "animate-sh-out" : "animate-sh-in")}
                style={{ width: `min(${width}px, calc(100vw - 16px))` }}
            >
                {children}
            </aside>
        </div>,
        document.body,
    )
}

/** Splits "Write tests !high @ravi ^fri" into a title plus priority, assignee and due date. */
function parseTokens(raw: string, people: { id: string; name: string }[]) {
    let priority: Priority | null = null
    let assigneeId: string | null = null
    let due: Date | null = null
    const title = raw
        .replace(/(^|\s)([!@^])([\w-]+)/g, (m, space, sym, word) => {
            const w = word.toLowerCase()
            if (sym === "!" && PRIORITY_TOKENS[w]) { priority = PRIORITY_TOKENS[w]; return space }
            if (sym === "@") {
                const u = people.find((p) => p.name.toLowerCase().startsWith(w))
                if (u) { assigneeId = u.id; return space }
            }
            if (sym === "^") {
                const n = parseDayToken(w)
                if (n != null) { due = daysFromToday(n); return space }
            }
            return m
        })
        .replace(/\s+/g, " ")
        .trim()
    return { title, priority, assigneeId, due } as { title: string; priority: Priority | null; assigneeId: string | null; due: Date | null }
}

/** One subtask: check to resolve, click to expand an inline editor. */
function SubtaskRow({ sub, open, onToggleOpen, onChange, onDelete, assignees }: {
    sub: SubTask
    open: boolean
    onToggleOpen: () => void
    onChange: (patch: Partial<SubTask> & { assigneeId?: string | null }) => void
    onDelete: () => void
    assignees: ReturnType<typeof assigneeOptions>
}) {
    const done = sub.currentStatus === "RESOLVED"
    const due = parseDate(sub.deadline)
    const overdue = !!due && !done && daysFrom(due) < 0
    const [title, setTitle] = useState(sub.title)
    useEffect(() => setTitle(sub.title), [sub.title])

    return (
        <div className={cn("rounded-[9px] transition-colors duration-fast hover:bg-surface-2", open && "bg-surface-2")}>
            <div className="flex min-h-10 cursor-pointer items-center gap-2.5 p-2" onClick={onToggleOpen}>
                <Check checked={done} label={`Mark ${sub.title} ${done ? "not done" : "done"}`} onChange={() => onChange({ currentStatus: done ? "NEW" : "RESOLVED" })} />
                <span className={cn("min-w-0 flex-1 truncate text-[13.5px] font-medium transition-colors", done && "text-subtle-foreground line-through")}>{sub.title}</span>
                {sub.currentStatus === "IN_PROGRESS" && <span title="In progress" className="size-[7px] flex-none rounded-full bg-primary shadow-[0_0_0_3px_oklch(var(--accent))]" />}
                {sub.currentStatus === "REOPENED" && <StatusBadge value="REOPENED" />}
                {sub.priority !== "NORMAL" && !done && <StatusBadge value={sub.priority} />}
                {due && <span className={cn("num text-xs", overdue ? "tone-red tone-fg font-semibold" : "text-muted-foreground")}>{dueLabel(due)}</span>}
                {sub.assignedTo ? <Avatar name={sub.assignedTo.name} seed={sub.assignedTo.id} size={22} /> : <GhostAvatar size={22} />}
                <IconChevronDown size={15} className={cn("text-subtle-foreground transition-transform duration-base ease-out", open && "rotate-180")} />
            </div>
            {open && (
                <div className="grid animate-pm-in gap-3.5 pb-3.5 pl-[34px] pr-2.5 pt-1">
                    <input
                        className={inputCls}
                        value={title}
                        aria-label="Subtask title"
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => title.trim() && title.trim() !== sub.title && onChange({ title: title.trim() })}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    />
                    <Grid2>
                        <Field label="Assignee">
                            <Combo value={sub.assignedTo?.id ?? ""} onChange={(id: string) => onChange({ assigneeId: id || null })} options={assignees} searchPlaceholder="Search people" />
                        </Field>
                        <Field label="Deadline">
                            <DatePicker value={due} onChange={(d) => onChange({ deadline: d ? d.toISOString() : null })} />
                        </Field>
                    </Grid2>
                    <Field label="Priority"><Pills value={sub.priority} onChange={(p) => onChange({ priority: p })} options={PRIORITIES} /></Field>
                    <Field label="Status"><Pills value={sub.currentStatus} onChange={(s) => onChange({ currentStatus: s })} options={STATUSES} /></Field>
                    <div className="flex items-center">
                        <Button type="button" size="sm" variant="ghost" className="tone-red tone-fg" onClick={onDelete}><IconTrash />Delete</Button>
                        <span className="flex-1" />
                        <Button type="button" size="sm" variant="outline" onClick={onToggleOpen}>Done</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

const timeAgo = (iso?: string | null) => {
    if (!iso) return ""
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return "now"
    if (mins < 60) return `${mins}m`
    if (mins < 1440) return `${Math.floor(mins / 60)}h`
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Task detail side-sheet: every field saves as you change it. */
export function TaskSheet({ data, onClose, closing }: FormProps<{ id: string }>) {
    const dispatch = useDispatch()
    const { profile, role, users, projects, tasks } = useAppData()
    const task = tasks.find((t) => t.id === data.id)
    const project = projects.find((p) => p.id === task?.project?.id)
    const isAdmin = role === "SUPER_ADMIN" || role === "CLIENT_ADMIN"
    const canEdit = isAdmin || task?.assignedTo?.id === profile?.id

    const [title, setTitle] = useState(task?.title ?? "")
    const [saving, setSaving] = useState(0)
    const [subs, setSubs] = useState<SubTask[] | null>(null)
    const [openSub, setOpenSub] = useState<string | null>(null)
    const [hideDone, setHideDone] = useState(false)
    const [draft, setDraft] = useState("")
    const [comments, setComments] = useState<Comment[] | null>(null)
    const [comment, setComment] = useState("")

    useEffect(() => {
        if (!data.id) return
        getSubTasks(data.id).then(setSubs).catch(() => setSubs([]))
        getTaskComments(data.id).then(setComments).catch(() => setComments([]))
    }, [data.id])

    if (!task) return null

    /** Runs a save with the "Saving…" indicator and an error toast on failure. */
    const save = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
        setSaving((n) => n + 1)
        try {
            return await fn()
        } catch (e: any) {
            toastError(e.message)
        } finally {
            setSaving((n) => n - 1)
        }
    }
    const patchTask = (fields: Parameters<typeof updateTask>[0]) =>
        save(async () => dispatch(updateTaskInStore(await updateTask(fields))))
    const setStatus = (s: TaskStatus) => save(async () => dispatch(updateTaskInStore(await updateTaskStatus(task.id, s))))

    // Subtasks: keep the task's "done/total" chip in step
    const syncStats = (list: SubTask[]) => {
        setSubs(list)
        dispatch(updateTaskInStore({ ...task, subTaskStats: { done: list.filter((s) => s.currentStatus === "RESOLVED").length, total: list.length } }))
    }
    const changeSub = (sub: SubTask, patch: Partial<SubTask> & { assigneeId?: string | null }) =>
        save(async () => {
            const updated = patch.currentStatus
                ? await updateSubTaskStatus(sub.id, patch.currentStatus)
                : await updateSubTask({
                    id: sub.id,
                    ...(patch.title && { title: patch.title }),
                    ...(patch.priority && { priority: patch.priority }),
                    ...("deadline" in patch && { deadline: patch.deadline }),
                    ...("assigneeId" in patch && { assignedTo: patch.assigneeId }),
                })
            syncStats((subs ?? []).map((s) => (s.id === sub.id ? updated : s)))
        })
    const removeSub = (sub: SubTask) =>
        save(async () => {
            await deleteSubTask(sub.id)
            setOpenSub(null)
            syncStats((subs ?? []).filter((s) => s.id !== sub.id))
        })
    const addSub = () => {
        const parsed = parseTokens(draft, users)
        if (!parsed.title) return
        setDraft("")
        save(async () => {
            const created = await createSubTask({
                title: parsed.title,
                taskId: task.id,
                priority: parsed.priority ?? "NORMAL",
                assignedTo: parsed.assigneeId ?? task.assignedTo?.id ?? null,
                deadline: parsed.due ? parsed.due.toISOString() : null,
            })
            syncStats([...(subs ?? []), created])
        })
    }

    const postComment = () => {
        const text = comment.trim()
        if (!text) return
        setComment("")
        save(async () => setComments([...(comments ?? []), await addTaskComment(task.id, text)]))
    }

    const removeTask = () => {
        onClose()
        scheduleDelete({
            text: "Task deleted",
            hide: () => dispatch(removeTaskFromStore(task.id)),
            restore: () => dispatch(addTaskToStore(task)),
            commit: () => deleteTask(task.id),
        })
    }

    const list = subs ?? []
    const done = list.filter((s) => s.currentStatus === "RESOLVED").length
    const shown = hideDone ? list.filter((s) => s.currentStatus !== "RESOLVED") : list
    const assignees = assigneeOptions(users, tasks, project)
    const createdAt = task.createdAt ? new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null

    return (
        <SideSheet onClose={onClose} closing={closing} label={task.title}>
            <header className="flex min-h-[50px] items-center gap-2.5 border-b py-2.5 pl-[18px] pr-3">
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-subtle-foreground">
                    <IconFolder size={14} /><span className="truncate">{task.project?.name ?? "No project"}</span>
                    <IconChevronRight size={12} /><span className="num">TASK-{task.id.slice(-4).toUpperCase()}</span>
                </span>
                <span className="flex items-center gap-[5px] text-xs text-subtle-foreground">
                    {saving ? <><Spinner />Saving…</> : <><IconCloudCheck size={15} />Saved</>}
                </span>
                <Button variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label="Close"><IconX /></Button>
            </header>

            <div className="grid flex-1 content-start gap-6 overflow-y-auto px-[22px] pb-7 pt-5">
                <textarea
                    rows={1}
                    value={title}
                    disabled={!canEdit}
                    aria-label="Task title"
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => title.trim() && title.trim() !== task.title && patchTask({ id: task.id, title: title.trim() })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() } }}
                    className="min-h-7 w-full resize-none border-0 bg-transparent p-0 text-[22px] font-semibold leading-tight tracking-[-0.02em] outline-none [field-sizing:content] focus:ring-0 disabled:opacity-100"
                />

                <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3">
                    <span className="text-[13px] text-muted-foreground">Status</span>
                    {canEdit ? <Pills value={task.currentStatus} onChange={setStatus} options={STATUSES} /> : <div><StatusBadge value={task.currentStatus} /></div>}
                    <span className="text-[13px] text-muted-foreground">Priority</span>
                    {canEdit ? <Pills value={task.priority} onChange={(p) => patchTask({ id: task.id, priority: p })} options={PRIORITIES} /> : <div><StatusBadge value={task.priority} /></div>}
                    <span className="text-[13px] text-muted-foreground">Assignee</span>
                    <div className="max-w-[300px]">
                        <Combo value={task.assignedTo?.id ?? ""} onChange={(id: string) => patchTask({ id: task.id, assignedTo: id || null })} options={assignees} disabled={!isAdmin} searchPlaceholder="Search people" />
                    </div>
                    <span className="text-[13px] text-muted-foreground">Deadline</span>
                    <div className="max-w-[300px]">
                        {canEdit ? (
                            <DatePicker value={parseDate(task.deadline)} onChange={(d) => patchTask({ id: task.id, deadline: d ? d.toISOString() : null })} />
                        ) : <span className="text-[13.5px]">{dueLabel(parseDate(task.deadline))}</span>}
                    </div>
                    <span className="text-[13px] text-muted-foreground">Created by</span>
                    <span className="flex items-center gap-2 text-[13.5px]">
                        {task.createdBy && <Avatar name={task.createdBy.name} seed={task.createdBy.id} size={22} />}
                        {task.createdBy?.name ?? "Unknown"}
                        {createdAt && <span className="text-xs text-subtle-foreground">· {createdAt}</span>}
                    </span>
                </div>

                <section className="grid gap-2.5">
                    <div className="flex min-h-7 items-center gap-2.5">
                        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Subtasks</h3>
                        {list.length > 0 && <span className="num text-xs text-subtle-foreground">{done}/{list.length} done</span>}
                        <span className="flex-1" />
                        {done > 0 && (
                            <Button size="sm" variant="ghost" onClick={() => setHideDone(!hideDone)}>
                                {hideDone ? <IconEye /> : <IconEyeOff />}{hideDone ? `Show ${done} done` : "Hide done"}
                            </Button>
                        )}
                    </div>
                    {list.length > 0 && (
                        <div className="h-1 overflow-hidden rounded-full bg-surface-3">
                            <i className="block h-full rounded-[inherit] bg-primary transition-[width] duration-[450ms] ease-out" style={{ width: `${(done / list.length) * 100}%` }} />
                        </div>
                    )}
                    {list.length > 0 && done === list.length && task.currentStatus !== "RESOLVED" && canEdit && (
                        <Note tone="green" icon={IconCircleCheck}>
                            <span className="flex items-center gap-2"><span className="flex-1">All subtasks are done.</span><Button size="sm" onClick={() => setStatus("RESOLVED")}>Resolve task</Button></span>
                        </Note>
                    )}
                    {subs === null ? (
                        <div className="text-xs text-subtle-foreground">Loading subtasks…</div>
                    ) : shown.length > 0 ? (
                        <div className="-mx-2 grid gap-0.5">
                            {shown.map((s) => (
                                <SubtaskRow
                                    key={s.id}
                                    sub={s}
                                    assignees={assignees}
                                    open={openSub === s.id}
                                    onToggleOpen={() => setOpenSub(openSub === s.id ? null : s.id)}
                                    onChange={(p) => changeSub(s, p)}
                                    onDelete={() => removeSub(s)}
                                />
                            ))}
                        </div>
                    ) : !list.length && (
                        <div className="text-xs text-subtle-foreground">Split this task into smaller steps. Each subtask gets its own assignee, priority and deadline.</div>
                    )}
                    <label className="flex h-10 cursor-text items-center gap-2.5 rounded-[9px] border border-dashed border-border-strong px-2.5 transition-[border-color,box-shadow] duration-fast focus-within:border-solid focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ring/35">
                        <IconPlus size={16} className="text-subtle-foreground" />
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub() } }}
                            placeholder="Add a subtask, then press Enter"
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] outline-none focus:ring-0"
                        />
                        {draft && <Kbd>↵</Kbd>}
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-subtle-foreground">
                        {["!high", "@ravi", "^fri"].map((t) => <code key={t} className="rounded-[5px] border bg-surface-2 px-1.5 py-px font-mono text-[11.5px] font-medium text-muted-foreground">{t}</code>)}
                        work here too
                    </div>
                </section>

                <section className="grid gap-2.5">
                    <div className="flex min-h-7 items-center gap-2.5">
                        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Comments</h3>
                        {comments && comments.length > 0 && <span className="num text-xs text-subtle-foreground">{comments.length}</span>}
                    </div>
                    {comments === null ? (
                        <div className="text-xs text-subtle-foreground">Loading comments…</div>
                    ) : comments.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-subtle-foreground"><IconMessage size={15} />No comments yet.</div>
                    ) : (
                        <div className="grid gap-3.5">
                            {comments.map((c) => (
                                <div key={c.id} className="group flex animate-pm-in items-start gap-2.5">
                                    <Avatar name={c.author?.name ?? "?"} seed={c.author?.id} size={26} />
                                    <div className="min-w-0 flex-1 text-[13px] leading-[1.4]">
                                        <span className="font-medium">{c.author?.name ?? "Someone"}</span>
                                        <span className="ml-2 text-xs text-subtle-foreground">{timeAgo(c.createdAt)}</span>
                                        <div className="whitespace-pre-wrap text-muted-foreground">{c.content}</div>
                                    </div>
                                    {(c.author?.id === profile?.id || isAdmin) && (
                                        <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100" aria-label="Delete comment"
                                            onClick={() => save(async () => { await deleteComment(c.id); setComments((cs) => (cs ?? []).filter((x) => x.id !== c.id)) })}>
                                            <IconX />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input
                            className={inputCls}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); postComment() } }}
                            placeholder="Write a comment"
                        />
                        <Button type="button" variant="outline" size="icon" aria-label="Post comment" disabled={!comment.trim()} onClick={postComment}><IconSend /></Button>
                    </div>
                </section>
            </div>

            <footer className="flex items-center gap-2 rounded-b-[14px] border-t bg-surface-2 px-3.5 py-2.5">
                {isAdmin && <Button size="sm" variant="ghost" className="tone-red tone-fg" onClick={removeTask}><IconTrash />Delete task</Button>}
                <span className="flex-1" />
                <span className="text-xs text-subtle-foreground">Changes save as you go</span>
            </footer>
        </SideSheet>
    )
}

/** Small "2/3" subtask counter for task rows and cards (green when all done). */
export function SubtaskChip({ task }: { task: Task }) {
    const s = task.subTaskStats
    if (!s?.total) return null
    return (
        <span title={`${s.done} of ${s.total} subtasks done`} className={cn("num inline-flex items-center gap-[3px] text-[11.5px] font-medium", s.done === s.total ? "tone-green tone-fg" : "text-subtle-foreground")}>
            <IconSubtask size={13} />
            {s.done}/{s.total}
        </span>
    )
}
