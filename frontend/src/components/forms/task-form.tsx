import { useEffect, useRef, useState } from "react"
import { useDispatch } from "react-redux"
import { IconKeyboard, IconPlus, IconSquareCheck, IconX } from "@tabler/icons-react"
import { createTask } from "@/api/taskApi"
import { createSubTask } from "@/api/subTaskApi"
import { addTaskToStore } from "@/redux/actions/tasksActions"
import { Button } from "@/components/ui/button"
import type { Priority } from "@/types/taskTypes"
import { Field, Flash, FormError, FormFoot, FormModal, Grid2, Pills, SubmitButton, Switch, useForm } from "./form-kit"
import { Combo } from "./combo"
import { DatePicker, daysFromToday } from "./date-picker"
import { PRIORITY_TOKENS, assigneeOptions, parseDayToken, projectOptions } from "./options"
import { useAppData } from "./use-app-data"
import { useForms, type FormProps } from "./forms-context"
import { toast } from "./toaster"

const PRIORITIES = ["URGENT", "HIGH", "NORMAL", "BACKLOG"] as const

/** Code-style hint chips under the title. */
const TokenHints = ({ items, suffix = "to fill fields" }: { items: string[]; suffix?: string }) => (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-subtle-foreground">
        <IconKeyboard size={14} />Type
        {items.map((t) => <code key={t} className="rounded-[5px] border bg-surface-2 px-1.5 py-px font-mono text-[11.5px] font-medium text-muted-foreground">{t}</code>)}
        {suffix}
    </div>
)
export { TokenHints }

/** Inline list of subtask titles; Enter adds a row, Backspace on an empty row removes it. */
function SubtaskDrafts({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const ref = useRef<HTMLDivElement>(null)
    const [focus, setFocus] = useState<number | null>(null)
    useEffect(() => {
        if (focus != null) ref.current?.querySelectorAll("input")[focus]?.focus()
    }, [focus, value.length])
    const add = () => { onChange([...value, ""]); setFocus(value.length) }
    return (
        <div ref={ref} className="grid gap-1.5">
            <div className="flex items-center gap-1.5 text-[13px] font-medium">
                Subtasks
                {value.length > 0 && <span className="num rounded-full bg-surface-3 px-1.5 py-px text-[11px] text-muted-foreground">{value.length}</span>}
                <span className="ml-auto text-xs font-normal text-subtle-foreground">Optional</span>
            </div>
            {value.length > 0 && (
                <div className="grid gap-0.5">
                    {value.map((s, i) => (
                        <div key={i} className="flex animate-pm-in items-center gap-2.5 rounded-lg py-0.5 pl-2 pr-0.5 focus-within:bg-surface-2 hover:bg-surface-2">
                            <span className="size-4 flex-none rounded-[5px] border-[1.5px] border-border-strong" />
                            <input
                                value={s}
                                placeholder="Subtask title"
                                onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); e.stopPropagation(); add() }
                                    else if (e.key === "Backspace" && !s) { e.preventDefault(); onChange(value.filter((_, j) => j !== i)); setFocus(Math.max(0, i - 1)) }
                                }}
                                className="h-[30px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] outline-none focus:ring-0"
                            />
                            <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Remove subtask" onClick={() => onChange(value.filter((_, j) => j !== i))}><IconX /></Button>
                        </div>
                    ))}
                </div>
            )}
            <button type="button" onClick={add} className="flex h-8 items-center gap-2 justify-self-start rounded-lg px-2 text-[13px] font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                <IconPlus size={16} />Add subtask
            </button>
        </div>
    )
}

type Values = {
    title: string
    projectId: string
    assigneeId: string
    priority: Priority
    due: Date | null
    status: "NEW" | "IN_PROGRESS"
    subs: string[]
}

/** New task (admins). `data` may preset projectId, status or assigneeId. */
export function TaskForm({ data, onClose, closing }: FormProps<{ projectId?: string; status?: "NEW" | "IN_PROGRESS"; assigneeId?: string }>) {
    const dispatch = useDispatch()
    const openForm = useForms()
    const { users, projects, tasks } = useAppData()
    const box = useRef<HTMLDivElement>(null)
    const options = projectOptions(projects)

    const f = useForm<Values>(
        {
            title: "",
            projectId: data.projectId ?? options[0]?.value ?? "",
            assigneeId: data.assigneeId ?? "",
            priority: "NORMAL",
            due: null,
            status: data.status ?? "NEW",
            subs: [],
        },
        {
            title: (x) => (!x.trim() ? "Give the task a title" : x.trim().length < 3 ? "Use at least 3 characters" : null),
            projectId: (x) => (x ? null : "Pick a project"),
        },
    )
    const [flash, setFlash] = useState<Record<string, number>>({})
    const [another, setAnother] = useState(false)
    const [created, setCreated] = useState(0)
    const v = f.v
    const project = projects.find((p) => p.id === v.projectId)
    const bump = (k: string) => setFlash((x) => ({ ...x, [k]: (x[k] ?? 0) + 1 }))

    // "Fix login !urgent " → sets priority and strips the token once a space follows it
    const onTitle = (raw: string) => {
        let t = raw
        const m = /(^|\s)([!@#^])([\w-]+)\s$/.exec(t)
        if (m) {
            const [whole, space, sym, word] = m
            const w = word.toLowerCase()
            let used = false
            if (sym === "!" && PRIORITY_TOKENS[w]) { f.set("priority", PRIORITY_TOKENS[w]); bump("priority"); used = true }
            if (sym === "@") {
                const u = users.find((u) => u.role !== "SUPER_ADMIN" && u.name.toLowerCase().startsWith(w))
                if (u) { f.set("assigneeId", u.id); bump("assigneeId"); used = true }
            }
            if (sym === "#") {
                const p = projects.find((p) => p.name.toLowerCase().replace(/\s/g, "").startsWith(w))
                if (p) { f.set("projectId", p.id); bump("projectId"); used = true }
            }
            if (sym === "^") {
                const n = parseDayToken(w)
                if (n != null) { f.set("due", daysFromToday(n)); bump("due"); used = true }
            }
            if (used) t = t.slice(0, t.length - whole.length) + space
        }
        f.set("title", t)
    }

    const save = () => f.submit(async (x) => {
        const subs = x.subs.map((s) => s.trim()).filter(Boolean)
        const task = await createTask({
            title: x.title.trim(),
            projectId: x.projectId,
            assignedTo: x.assigneeId || null,
            deadline: x.due ? x.due.toISOString() : null,
            priority: x.priority,
            currentStatus: x.status,
        })
        for (const title of subs) {
            await createSubTask({ title, taskId: task.id, assignedTo: x.assigneeId || null, priority: "NORMAL" })
        }
        dispatch(addTaskToStore({ ...task, subTaskStats: { done: 0, total: subs.length } }))
        toast({
            text: <span>Task added to <b>{project?.name}</b>{subs.length ? ` with ${subs.length} subtasks` : ""}</span>,
            action: { label: "Open", run: () => openForm("task-view", { id: task.id }) },
        })
        if (another) {
            f.setV((o) => ({ ...o, title: "", subs: [] }))
            setCreated((c) => c + 1)
            setTimeout(() => box.current?.querySelector<HTMLInputElement>("input")?.focus(), 20)
        } else onClose()
    }, box)

    return (
        <FormModal
            title="New task"
            desc={created ? `${created} created — keep going, or close when done.` : "Only the title and project are required."}
            icon={IconSquareCheck}
            width={620}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            shake={f.shake}
            boxRef={box}
            footer={
                <FormFoot onClose={onClose} left={<Switch on={another} onChange={setAnother} label="Create another" />}>
                    <SubmitButton busy={f.busy} onClick={save}>Create task</SubmitButton>
                </FormFoot>
            }
        >
            <Field error={f.err.title}>
                <input
                    placeholder="What needs doing?"
                    value={v.title}
                    onChange={(e) => onTitle(e.target.value)}
                    onBlur={() => v.title && f.blur("title")}
                    className="w-full border-0 bg-transparent px-0 py-0.5 text-[21px] font-semibold leading-tight tracking-[-0.02em] outline-none placeholder:text-subtle-foreground focus:ring-0"
                />
                <TokenHints items={["!urgent", "@ravi", "#atlas", "^fri"]} />
            </Field>
            <Grid2>
                <Field label="Project" req error={f.err.projectId}>
                    <Flash n={flash.projectId ?? 0}>
                        <Combo value={v.projectId} onChange={(x) => f.set("projectId", x)} options={options} placeholder="Choose project" searchPlaceholder="Search projects" />
                    </Flash>
                </Field>
                <Field label="Assignee">
                    <Flash n={flash.assigneeId ?? 0}>
                        <Combo value={v.assigneeId} onChange={(x) => f.set("assigneeId", x)} options={assigneeOptions(users, tasks, project)} searchPlaceholder="Search people" />
                    </Flash>
                </Field>
                <Field label="Deadline">
                    <Flash n={flash.due ?? 0}><DatePicker value={v.due} onChange={(d) => f.set("due", d)} /></Flash>
                </Field>
                <Field label="Status">
                    <Pills value={v.status} onChange={(x) => f.set("status", x)} options={["NEW", "IN_PROGRESS"] as const} />
                </Field>
            </Grid2>
            <Field label="Priority">
                <Flash n={flash.priority ?? 0}><Pills value={v.priority} onChange={(x) => f.set("priority", x)} options={PRIORITIES} /></Flash>
            </Field>
            <SubtaskDrafts value={v.subs} onChange={(x) => f.set("subs", x)} />
            <FormError message={f.formError} />
        </FormModal>
    )
}
