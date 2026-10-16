import { useRef, useState } from "react"
import { useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { IconChevronDown, IconId, IconLock, IconLockCheck, IconLogout, IconMessagePlus, IconMoon, IconSun, IconUserCircle } from "@tabler/icons-react"
import { changePassword, updateProfile } from "@/api/userApi"
import { addTaskComment } from "@/api/commentApi"
import { updateTaskStatus } from "@/api/taskApi"
import { logout } from "@/redux/actions/authActions"
import { updateTaskInStore } from "@/redux/actions/tasksActions"
import { USER_PROFILE_SUCCESS } from "@/redux/constants/userConstants"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/pm/avatar"
import { Segmented } from "@/components/pm/segmented"
import { StatusBadge } from "@/components/pm/status-badge"
import { useTheme } from "@/components/hooks/use-theme"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "@/types/taskTypes"
import { Field, FormError, FormFoot, FormModal, Grid2, Pills, SubmitButton, Switch, inputCls, textareaCls, useForm } from "./form-kit"
import { Combo } from "./combo"
import { assigneeOptions } from "./options"
import { useAppData } from "./use-app-data"
import type { FormProps } from "./forms-context"
import { toast } from "./toaster"
import { dueLabel, parseDate } from "@/components/pm/dates"

/** Clickable row inside the account menu's bordered list. */
const MenuRow = ({ icon: I, label, open, onClick }: { icon: typeof IconId; label: string; open?: boolean; onClick: () => void }) => (
    <div onClick={onClick} className="flex cursor-pointer items-center gap-3 px-3.5 py-3 text-[13.5px] transition-colors duration-fast hover:bg-surface-2">
        <I size={17} className="text-subtle-foreground" />
        <span className="flex-1">{label}</span>
        <IconChevronDown size={16} className={cn("text-subtle-foreground transition-transform duration-base", open && "rotate-180")} />
    </div>
)

/** Your account: edit profile, change password, theme, sign out. */
export function AccountMenu({ onClose, closing }: FormProps) {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { profile } = useAppData()
    const { theme, toggle } = useTheme()
    const box = useRef<HTMLDivElement>(null)
    const [section, setSection] = useState<"profile" | "password" | null>(null)

    const toDate = (v?: string | null) => (v ? new Date(/^\d+$/.test(v) ? Number(v) : v).toISOString().slice(0, 10) : "")
    const prof = useForm(
        { name: profile?.name ?? "", number: profile?.number ?? "", dob: toDate(profile?.dob), gender: profile?.gender ?? "OTHERS" },
        { name: (x: string) => (x.trim() ? null : "Name is required"), number: (x: string) => (/^\+?[\d\s()-]{7,}$/.test(x.trim()) ? null : "Use digits, spaces or +") },
    )
    const pw = useForm(
        { current: "", next: "", confirm: "" },
        {
            current: (x: string) => (x ? null : "Enter your current password"),
            next: (x: string) => (x.length < 8 ? "At least 8 characters" : null),
            confirm: (x: string, a: { next: string }) => (x !== a.next ? "Passwords don’t match" : null),
        },
    )
    if (!profile) return null

    const saveProfile = () => prof.submit(async (x) => {
        const updated = await updateProfile({ name: x.name.trim(), number: x.number.trim(), dob: x.dob || undefined, gender: x.gender })
        dispatch({ type: USER_PROFILE_SUCCESS, payload: { ...profile, ...updated } })
        toast({ text: "Profile updated" })
        setSection(null)
    }, box)
    const savePassword = () => pw.submit(async (x) => {
        await changePassword(x.current, x.next)
        toast({ text: "Password changed", icon: IconLockCheck })
        pw.setV({ current: "", next: "", confirm: "" })
        setSection(null)
    }, box)
    const submit = section === "profile" ? saveProfile : section === "password" ? savePassword : undefined

    return (
        <FormModal
            title={profile.name}
            desc={profile.email}
            icon={IconUserCircle}
            width={460}
            onClose={onClose}
            onSubmit={submit}
            closing={closing}
            shake={prof.shake + pw.shake}
            boxRef={box}
            footer={
                <FormFoot
                    onClose={onClose}
                    left={
                        <Button type="button" variant="ghost" className="tone-red tone-fg" onClick={() => { onClose(); dispatch(logout() as any); navigate("/") }}>
                            <IconLogout />Sign out
                        </Button>
                    }
                >
                    {section === "profile" && <SubmitButton busy={prof.busy} onClick={saveProfile}>Save profile</SubmitButton>}
                    {section === "password" && <SubmitButton busy={pw.busy} onClick={savePassword}>Update password</SubmitButton>}
                </FormFoot>
            }
        >
            <div className="grid rounded-[10px] border [&>*+*]:border-t">
                <div className="flex items-center gap-3 px-3.5 py-3 text-[13.5px]">
                    <Avatar name={profile.name} seed={profile.id} size={36} />
                    <div className="min-w-0 flex-1">
                        <div className="font-medium">{profile.name}</div>
                        <div className="truncate text-xs text-subtle-foreground">{profile.email}</div>
                    </div>
                    <StatusBadge value={profile.role} />
                </div>

                <MenuRow icon={IconId} label="Edit profile" open={section === "profile"} onClick={() => setSection(section === "profile" ? null : "profile")} />
                {section === "profile" && (
                    <div className="grid animate-pm-in gap-3 px-3.5 py-3">
                        <Field label="Full name" error={prof.err.name}>
                            <input className={inputCls} value={prof.v.name} onChange={(e) => prof.set("name", e.target.value)} onBlur={() => prof.blur("name")} />
                        </Field>
                        <Grid2>
                            <Field label="Phone" error={prof.err.number}>
                                <input className={cn(inputCls, "num")} value={prof.v.number} onChange={(e) => prof.set("number", e.target.value)} onBlur={() => prof.blur("number")} />
                            </Field>
                            <Field label="Date of birth">
                                <input className={cn(inputCls, "num")} type="date" value={prof.v.dob} onChange={(e) => prof.set("dob", e.target.value)} />
                            </Field>
                        </Grid2>
                        <Field label="Gender">
                            <div><Segmented size="sm" value={prof.v.gender as any} onChange={(g: string) => prof.set("gender", g)} options={[{ value: "FEMALE", label: "Female" }, { value: "MALE", label: "Male" }, { value: "OTHERS", label: "Other" }]} /></div>
                        </Field>
                        <FormError message={prof.formError} />
                    </div>
                )}

                <MenuRow icon={IconLock} label="Change password" open={section === "password"} onClick={() => setSection(section === "password" ? null : "password")} />
                {section === "password" && (
                    <div className="grid animate-pm-in gap-3 px-3.5 py-3">
                        <Field label="Current password" error={pw.err.current}>
                            <input className={inputCls} type="password" autoComplete="current-password" value={pw.v.current} onChange={(e) => pw.set("current", e.target.value)} onBlur={() => pw.blur("current")} />
                        </Field>
                        <Field label="New password" error={pw.err.next}>
                            <input className={inputCls} type="password" autoComplete="new-password" value={pw.v.next} onChange={(e) => pw.set("next", e.target.value)} onBlur={() => pw.blur("next")} />
                        </Field>
                        <Field label="Confirm new password" error={pw.err.confirm}>
                            <input className={inputCls} type="password" autoComplete="new-password" value={pw.v.confirm} onChange={(e) => pw.set("confirm", e.target.value)} onBlur={() => pw.blur("confirm")} />
                        </Field>
                        <FormError message={pw.formError} />
                    </div>
                )}

                <div className="flex items-center gap-3 px-3.5 py-3 text-[13.5px]">
                    {theme === "DARK" ? <IconMoon size={17} className="text-subtle-foreground" /> : <IconSun size={17} className="text-subtle-foreground" />}
                    <span className="flex-1">Theme</span>
                    <Segmented size="sm" value={theme === "DARK" ? "dark" : "light"} onChange={(v) => (v === "dark") !== (theme === "DARK") && toggle()} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
                </div>
            </div>
        </FormModal>
    )
}

type UpdateValues = { taskId: string; status: TaskStatus; note: string; blocked: boolean; blockedBy: string }

/** Member posts progress on one of their tasks: a comment, plus an optional status change. */
export function LogUpdateForm({ data, onClose, closing }: FormProps<{ taskId?: string }>) {
    const dispatch = useDispatch()
    const { profile, users, projects, tasks } = useAppData()
    const box = useRef<HTMLDivElement>(null)
    const mine = tasks.filter((t) => t.assignedTo?.id === profile?.id && t.currentStatus !== "RESOLVED")
    const first = mine.find((t) => t.id === data.taskId) ?? mine[0]

    const f = useForm<UpdateValues>(
        { taskId: first?.id ?? "", status: first?.currentStatus === "NEW" ? "IN_PROGRESS" : first?.currentStatus ?? "IN_PROGRESS", note: "", blocked: false, blockedBy: "" },
        {
            taskId: (x) => (x ? null : "Pick a task"),
            note: (x) => (x.trim().length < 5 ? "Write a sentence about what changed" : null),
        },
    )
    const v = f.v
    const task = tasks.find((t) => t.id === v.taskId)
    const project = projects.find((p) => p.id === task?.project?.id)
    const people = assigneeOptions(users, tasks, project).filter((o) => o.value)
    const blocker = [...users, ...(project?.user ?? [])].find((u) => u.id === v.blockedBy)

    const save = () => f.submit(async (x) => {
        const content = x.blocked && blocker ? `${x.note.trim()}\n\nBlocked — waiting on ${blocker.name}.` : x.note.trim()
        await addTaskComment(x.taskId, content)
        if (task && x.status !== task.currentStatus) dispatch(updateTaskInStore(await updateTaskStatus(x.taskId, x.status)))
        toast({ text: <span>Update logged on <b>{task?.title}</b></span> })
        onClose()
    }, box)

    return (
        <FormModal
            title="Log an update"
            desc="Post progress on one of your tasks."
            icon={IconMessagePlus}
            width={560}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            shake={f.shake}
            boxRef={box}
            footer={<FormFoot onClose={onClose}><SubmitButton busy={f.busy} onClick={save}>Post update</SubmitButton></FormFoot>}
        >
            <Field label="Task" req error={f.err.taskId} hint={mine.length ? null : "You have no open tasks assigned to you."}>
                <Combo
                    value={v.taskId}
                    onChange={(id: string) => {
                        f.set("taskId", id)
                        const t = tasks.find((x) => x.id === id)
                        if (t && t.currentStatus !== "NEW") f.set("status", t.currentStatus)
                    }}
                    placeholder="Choose one of your tasks"
                    searchPlaceholder="Search your tasks"
                    options={mine.map((t) => ({ value: t.id, label: t.title, sub: `${t.project?.name ?? ""} · due ${dueLabel(parseDate(t.deadline))}`, lead: <StatusBadge value={t.priority} dot={false} /> }))}
                />
            </Field>
            <Field
                label="Status"
                hint={task && task.currentStatus !== v.status ? <span>Moves from <b>{task.currentStatus.replace("_", " ").toLowerCase()}</b> to <b>{v.status.replace("_", " ").toLowerCase()}</b></span> : null}
            >
                <Pills value={v.status} onChange={(s) => f.set("status", s)} options={["IN_PROGRESS", "REOPENED", "RESOLVED"] as const} />
            </Field>
            <Field label="What changed?" req error={f.err.note} right={<span className="num text-xs text-subtle-foreground">{v.note.length}/500</span>}>
                <textarea className={textareaCls} rows={4} value={v.note} onChange={(e) => f.set("note", e.target.value.slice(0, 500))} onBlur={() => f.blur("note")} placeholder="e.g. Reset logic works locally, writing the e2e test next." />
            </Field>
            <Switch on={v.blocked} onChange={(b) => f.set("blocked", b)} label="I’m blocked on this" />
            {v.blocked && (
                <Field label="Blocked by">
                    <Combo value={v.blockedBy} onChange={(x) => f.set("blockedBy", x)} options={people} placeholder="Who can unblock you?" searchPlaceholder="Search people" />
                </Field>
            )}
            <div className="text-xs text-subtle-foreground">Posted as a comment on the task.</div>
            <FormError message={f.formError} />
        </FormModal>
    )
}
