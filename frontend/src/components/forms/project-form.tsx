import { useMemo, useRef, useState } from "react"
import { useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { IconFolderCog, IconFolderPlus, IconSearch, IconTrash, IconUsersPlus } from "@tabler/icons-react"
import { addProject, addUserToProject, removeUserFromProject, updateProject } from "@/api/projectApi"
import { addProjectToStore, updateProjectInStore } from "@/redux/actions/projectsActions"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/pm/avatar"
import { Check } from "@/components/pm/check"
import { Tag } from "@/components/pm/status-badge"
import { ProjectCard, projectProgress } from "@/components/pm/project-card"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/projectTypes"
import { Field, FormError, FormFoot, FormModal, Grid2, Pills, Section, SubmitButton, inputCls, textareaCls, useForm } from "./form-kit"
import { Combo } from "./combo"
import { DatePicker } from "./date-picker"
import { LoadMeter, LogoChip, personOption } from "./options"
import { openTaskCount, useAppData } from "./use-app-data"
import { useForms, type FormProps } from "./forms-context"
import { toast } from "./toaster"
import { parseDate } from "@/components/pm/dates"
import { useAsyncAction } from "@/hooks/use-async-action"

type Values = { name: string; desc: string; clientId: string; status: Project["status"]; due: Date | null; team: string[] }

/** Applies team changes as add/remove calls; returns the updated project. */
async function syncTeam(project: Project, team: string[]): Promise<Project> {
    const before = project.user.map((u) => u.id)
    const add = team.filter((id) => !before.includes(id))
    const remove = before.filter((id) => !team.includes(id))
    let result = project
    if (add.length) result = await addUserToProject({ id: project.id, users: add })
    if (remove.length) result = await removeUserFromProject({ id: project.id, users: remove })
    return result
}

/** New project, or edit when `data.projectId` is given. Wide layout with a live card preview. */
export function ProjectForm({ data, onClose, closing }: FormProps<{ projectId?: string }>) {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const openForm = useForms()
    const { role, users, clients, projects, tasks } = useAppData()
    const box = useRef<HTMLDivElement>(null)
    const cur = data.projectId ? projects.find((p) => p.id === data.projectId) ?? null : null

    // Client admins can only use their own client (known from their projects)
    const clientChoices = useMemo(() => {
        if (role === "SUPER_ADMIN") return clients.map((c) => ({ id: c.id, name: c.name, deleteRequest: c.deleteRequest }))
        const byId = new Map<string, { id: string; name: string; deleteRequest?: boolean }>()
        projects.forEach((p) => p.client && byId.set(p.client.id, p.client))
        return [...byId.values()]
    }, [role, clients, projects])
    const locked = role === "CLIENT_ADMIN"

    const f = useForm<Values>(
        cur
            ? { name: cur.name, desc: cur.description ?? "", clientId: cur.client?.id ?? "", status: cur.status, due: parseDate(cur.dueDate), team: cur.user.map((u) => u.id) }
            : { name: "", desc: "", clientId: locked ? clientChoices[0]?.id ?? "" : "", status: "NOT_STARTED", due: null, team: [] },
        {
            name: (x) =>
                !x.trim() ? "Name is required"
                    : projects.some((p) => p.id !== cur?.id && p.name.toLowerCase() === x.trim().toLowerCase()) ? "A project with this name already exists"
                        : x.length > 60 ? "Keep it under 60 characters" : null,
            desc: (x) => (!x.trim() ? "Add a short description. It appears on project cards." : x.length > 280 ? "Keep it under 280 characters" : null),
            clientId: (x) => (x ? null : locked ? "Your client has no projects yet; ask a super admin to create the first one" : "Pick the client this belongs to"),
        },
    )
    const v = f.v

    const people = users.filter((u) => u.role !== "SUPER_ADMIN")
    const teamOptions = [
        ...people.filter((u) => u.role === "USER").map((u) => personOption(u, tasks, "Team members")),
        ...people.filter((u) => u.role === "CLIENT_ADMIN").map((u) => personOption(u, tasks, "Client admins")),
    ]
    const teamPreview = [...people, ...(cur?.user ?? [])].filter((u, i, all) => v.team.includes(u.id) && all.findIndex((x) => x.id === u.id) === i)
    const progress = cur ? projectProgress(tasks, cur.id) : { open: 0, pct: 0 }

    const save = () => f.submit(async (x) => {
        const fields = { name: x.name.trim(), description: x.desc.trim(), status: x.status, dueDate: x.due ? x.due.toISOString() : null }
        if (cur) {
            let updated = await updateProject({ id: cur.id, ...fields })
            updated = await syncTeam(updated, x.team)
            dispatch(updateProjectInStore(updated))
            toast({ text: "Project updated" })
        } else {
            let created = await addProject({ ...fields, clientId: x.clientId })
            if (x.team.length) created = await addUserToProject({ id: created.id, users: x.team })
            dispatch(addProjectToStore(created))
            toast({ text: <span><b>{created.name}</b> created</span>, action: { label: "Open", run: () => navigate(`/projects/${created.id}`) } })
        }
        onClose()
    }, box)

    return (
        <FormModal
            title={cur ? "Edit project" : "New project"}
            desc={cur ? cur.name : "A project groups tasks and a team under one client."}
            icon={cur ? IconFolderCog : IconFolderPlus}
            width={900}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            shake={f.shake}
            boxRef={box}
            footer={
                <FormFoot
                    onClose={onClose}
                    left={cur ? (
                        <Button type="button" variant="ghost" className="tone-red tone-fg" onClick={() => { onClose(); setTimeout(() => openForm("delete-project", { projectId: cur.id }), 200) }}>
                            <IconTrash />Delete project
                        </Button>
                    ) : undefined}
                >
                    <SubmitButton busy={f.busy} onClick={save}>{cur ? "Save changes" : "Create project"}</SubmitButton>
                </FormFoot>
            }
        >
            <div className="grid items-start gap-6 min-[780px]:grid-cols-[minmax(0,1.4fr)_minmax(240px,1fr)]">
                <div className="grid min-w-0 gap-4">
                    <Field label="Project name" req error={f.err.name}>
                        <input className={inputCls} value={v.name} onChange={(e) => f.set("name", e.target.value)} onBlur={() => f.blur("name")} placeholder="e.g. Atlas Portal" />
                    </Field>
                    <Field label="Description" req error={f.err.desc} right={<span className={cn("num text-xs text-subtle-foreground", v.desc.length > 280 && "tone-red tone-fg")}>{v.desc.length}/280</span>}>
                        <textarea className={textareaCls} rows={3} value={v.desc} onChange={(e) => f.set("desc", e.target.value)} onBlur={() => f.blur("desc")} placeholder="What is this project for?" />
                    </Field>
                    <Grid2>
                        <Field label="Client" req error={f.err.clientId} hint={locked ? "Locked to your client" : cur ? "Can't be changed after creation" : null}>
                            <Combo
                                value={v.clientId}
                                onChange={(x) => f.set("clientId", x)}
                                disabled={locked || !!cur}
                                placeholder="Choose client"
                                searchPlaceholder="Search clients"
                                onBlur={() => f.blur("clientId")}
                                options={clientChoices.map((c) => ({ value: c.id, label: c.name, lead: <LogoChip name={c.name} />, meta: c.deleteRequest ? <Tag tone="red">Delete requested</Tag> : null }))}
                            />
                        </Field>
                        <Field label="Target date">
                            <DatePicker value={v.due} onChange={(d) => f.set("due", d)} placeholder="No target date" />
                        </Field>
                    </Grid2>
                    <Field label="Status">
                        <Pills value={v.status} onChange={(x) => f.set("status", x)} options={["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const} />
                    </Field>
                    <Field label="Team" hint="The bar next to each person shows how many open tasks they have.">
                        <Combo multi value={v.team} onChange={(x) => f.set("team", x)} options={teamOptions} placeholder="Add people" searchPlaceholder="Search people" />
                    </Field>
                    <FormError message={f.formError} />
                </div>
                <div className="grid gap-3 rounded-xl border border-dashed border-border-strong bg-surface-2 p-4">
                    <Section>Live preview</Section>
                    <div className="pointer-events-none">
                        <ProjectCard
                            preview
                            open={progress.open}
                            pct={progress.pct}
                            project={{
                                name: v.name.trim() || "Untitled project",
                                status: v.status,
                                description: v.desc.trim() || "Your description appears here.",
                                client: clientChoices.find((c) => c.id === v.clientId) ?? null,
                                user: teamPreview,
                                dueDate: v.due?.toISOString() ?? null,
                            }}
                        />
                    </div>
                    <div className="text-xs text-subtle-foreground">This card appears in the project grid, the board and the dashboard.</div>
                </div>
            </div>
        </FormModal>
    )
}

/** Add or remove people on a project, showing who's being added/removed before saving. */
export function TeamForm({ data, onClose, closing }: FormProps<{ projectId: string }>) {
    const dispatch = useDispatch()
    const { users, projects, tasks } = useAppData()
    const project = projects.find((p) => p.id === data.projectId)
    const original = project?.user.map((u) => u.id) ?? []
    const [selected, setSelected] = useState<string[]>(original)
    const [q, setQ] = useState("")
    const { run, busy, error } = useAsyncAction()
    if (!project) return null

    // Current members first (including any the user list doesn't include), then everyone else
    const people = [...project.user, ...users.filter((u) => u.role !== "SUPER_ADMIN" && !original.includes(u.id))]
    const list = people.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
    const adding = selected.filter((id) => !original.includes(id)).length
    const removing = original.filter((id) => !selected.includes(id)).length
    const roleOf = (id: string) => users.find((u) => u.id === id)?.role

    const save = () => {
        if (!adding && !removing) return onClose()
        run(async () => {
            dispatch(updateProjectInStore(await syncTeam(project, selected)))
            toast({ text: <span>Team updated on <b>{project.name}</b></span> })
            onClose()
        })
    }

    return (
        <FormModal
            title="Manage team"
            desc={project.name}
            icon={IconUsersPlus}
            width={540}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            footer={
                <FormFoot
                    onClose={onClose}
                    left={
                        <span className="text-xs text-subtle-foreground">
                            {adding || removing ? (
                                <>
                                    {adding > 0 && <b className="text-foreground">+{adding} adding</b>}
                                    {adding > 0 && removing > 0 && " · "}
                                    {removing > 0 && <b className="tone-red tone-fg">−{removing} removing</b>}
                                </>
                            ) : `${selected.length} on the team`}
                        </span>
                    }
                >
                    <SubmitButton busy={busy} onClick={save}>Save team</SubmitButton>
                </FormFoot>
            }
        >
            <label className="flex h-[34px] items-center gap-2 rounded-lg border border-border-strong bg-card px-3 focus-within:ring-[3px] focus-within:ring-ring/35">
                <IconSearch size={16} className="text-subtle-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] outline-none focus:ring-0" />
            </label>
            <div className="-mx-2 grid max-h-[360px] gap-0.5 overflow-y-auto">
                {list.map((u) => {
                    const on = selected.includes(u.id)
                    const was = original.includes(u.id)
                    return (
                        <div
                            key={u.id}
                            onClick={() => setSelected((s) => (on ? s.filter((x) => x !== u.id) : [...s, u.id]))}
                            className={cn("flex cursor-pointer items-center gap-3 rounded-[9px] p-2 transition-colors duration-fast hover:bg-surface-2", on && "bg-accent hover:bg-accent")}
                        >
                            <Check checked={on} onChange={() => setSelected((s) => (on ? s.filter((x) => x !== u.id) : [...s, u.id]))} label={u.name} />
                            <Avatar name={u.name} seed={u.id} size={30} />
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{u.name}</div>
                                <div className="truncate text-xs text-subtle-foreground">{roleOf(u.id) === "CLIENT_ADMIN" ? "Client admin" : u.email}</div>
                            </div>
                            {!was && on && <Tag tone="blue" dot={false}>Adding</Tag>}
                            {was && !on && <Tag tone="red" dot={false}>Removing</Tag>}
                            <LoadMeter n={openTaskCount(tasks, u.id)} />
                        </div>
                    )
                })}
            </div>
            <FormError message={error} />
        </FormModal>
    )
}
