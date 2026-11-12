import { useState } from "react"
import { useDispatch } from "react-redux"
import { IconArrowRight, IconDownload, IconFileExport, IconInfoCircle, IconLockOpen, IconUserShield } from "@tabler/icons-react"
import { unlockUsers, updateUserRoles } from "@/api/userApi"
import { upsertUsersInStore } from "@/redux/actions/usersListActions"
import { Avatar } from "@/components/pm/avatar"
import { Check } from "@/components/pm/check"
import { Segmented } from "@/components/pm/segmented"
import { STATUS, StatusBadge, Tag } from "@/components/pm/status-badge"
import { cn } from "@/lib/utils"
import type { Role, User } from "@/types/userTypes"
import { Field, FormError, FormFoot, FormModal, Grid2, Note, SubmitButton, inputCls, textareaCls } from "./form-kit"
import { Combo } from "./combo"
import { LogoChip } from "./options"
import { openTaskCount, useAppData } from "./use-app-data"
import type { FormProps } from "./forms-context"
import { toast } from "./toaster"
import { STATUS_LABEL, STATUS_TONE } from "./user-form"
import { useAsyncAction } from "@/hooks/use-async-action"

const roleLabel = (r: Role) => STATUS[r][0]

const ROLES: Role[] = ["USER", "CLIENT_ADMIN", "SUPER_ADMIN"]
const RANK: Record<Role, number> = { USER: 0, CLIENT_ADMIN: 1, SUPER_ADMIN: 2 }
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/**
 * Review dialog for role changes: each selected person gets their own new role (a client
 * admin also needs a client), with one shared reason and an optional per-person reason.
 */
export function BulkRoleForm({ data, onClose, closing }: FormProps<{ userIds: string[] }>) {
    const dispatch = useDispatch()
    const { users, clients } = useAppData()
    const list = users.filter((u) => data.userIds.includes(u.id))
    const managedBy = (id: string) => clients.find((c) => c.assignedAdmin?.id === id)?.id ?? ""
    const [rows, setRows] = useState(() => Object.fromEntries(list.map((u) => [u.id, { role: u.role, clientId: managedBy(u.id), reason: null as string | null }])))
    const [reason, setReason] = useState("")
    const { run, busy, error } = useAsyncAction()

    const set = (id: string, patch: Partial<(typeof rows)[string]>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }))
    const changes = list.filter((u) => rows[u.id].role !== u.role || (u.role === "CLIENT_ADMIN" && rows[u.id].clientId !== managedBy(u.id)))
    const promotions = changes.filter((u) => RANK[rows[u.id].role] > RANK[u.role]).length
    const demotions = changes.filter((u) => RANK[rows[u.id].role] < RANK[u.role]).length
    const moves = changes.length - promotions - demotions
    const summary = [promotions && plural(promotions, "promotion"), demotions && plural(demotions, "demotion"), moves && plural(moves, "client change")].filter(Boolean).join(", ")
    const missingClient = changes.some((u) => rows[u.id].role === "CLIENT_ADMIN" && !rows[u.id].clientId)
    const canSave = changes.length > 0 && !!reason.trim() && !missingClient

    // A client can be picked if it has no admin, its admin is this person, or its admin is moving elsewhere
    const clientOptions = (id: string) => clients
        .filter((c) => {
            const admin = c.assignedAdmin?.id
            const freed = admin && rows[admin] && (rows[admin].role !== "CLIENT_ADMIN" || rows[admin].clientId !== c.id)
            const takenHere = Object.entries(rows).some(([other, r]) => other !== id && r.role === "CLIENT_ADMIN" && r.clientId === c.id)
            return (!admin || admin === id || freed) && !takenHere
        })
        .map((c) => ({ value: c.id, label: c.name, lead: <LogoChip name={c.name} /> }))

    const save = () => canSave && run(async () => {
        const payload = changes.map((u) => {
            const r = rows[u.id]
            return { id: u.id, role: r.role, clientId: r.role === "CLIENT_ADMIN" ? r.clientId : null, reason: r.reason?.trim() || null }
        })
        dispatch(upsertUsersInStore(await updateUserRoles(payload, reason.trim())))
        toast({ text: <span>Roles updated: {summary}</span> })
        onClose()
    })

    return (
        <FormModal
            title={`Change roles for ${plural(list.length, "person").replace("persons", "people")}`}
            desc="Pick a new role for each person. Every change is logged with its reason."
            icon={IconUserShield}
            width={680}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            footer={
                <FormFoot onClose={onClose} left={<span className="text-xs text-subtle-foreground">{summary || "No changes yet"}</span>}>
                    <SubmitButton busy={busy} onClick={save} disabled={!canSave}>Apply {changes.length ? plural(changes.length, "change") : "changes"}</SubmitButton>
                </FormFoot>
            }
        >
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <span className="text-muted-foreground">Apply same role to all</span>
                <div role="group" aria-label="Apply same role to all" className="inline-flex gap-1">
                    {ROLES.map((r) => (
                        <button key={r} type="button" onClick={() => list.forEach((u) => set(u.id, { role: r }))}
                            className="h-[26px] rounded-md border px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
                            {roleLabel(r)}
                        </button>
                    ))}
                </div>
            </div>

            <ul className="m-0 grid list-none rounded-[10px] border p-0 [&>*+*]:border-t">
                {list.map((u) => {
                    const r = rows[u.id]
                    const changed = changes.includes(u)
                    return (
                        <li key={u.id} aria-label={u.name} className={cn("grid gap-2.5 px-3.5 py-3", changed && "bg-surface-2")}>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <Avatar name={u.name} seed={u.id} size={26} />
                                <span className="min-w-[110px] flex-1 truncate text-[13.5px] font-medium">{u.name}</span>
                                <StatusBadge value={u.role} />
                                <IconArrowRight size={15} className="text-subtle-foreground" />
                                <Segmented size="sm" value={r.role} onChange={(role: Role) => set(u.id, { role })} options={ROLES.map((x) => ({ value: x, label: roleLabel(x) }))} />
                            </div>
                            {r.role === "CLIENT_ADMIN" && (
                                <Field label="Client they manage" req>
                                    <Combo value={r.clientId} onChange={(clientId) => set(u.id, { clientId })} options={clientOptions(u.id)} placeholder="Choose client" searchPlaceholder="Search clients" />
                                </Field>
                            )}
                            {changed && (r.reason === null ? (
                                <button type="button" className="w-fit text-xs font-medium text-accent-foreground hover:underline" onClick={() => set(u.id, { reason: "" })}>Different reason</button>
                            ) : (
                                <input className={inputCls} value={r.reason} onChange={(e) => set(u.id, { reason: e.target.value })} placeholder={`Reason for ${u.name.split(" ")[0]}`} />
                            ))}
                        </li>
                    )
                })}
            </ul>

            <Field label="Reason" req hint="Saved in Activity with each change. Use “Different reason” to override it for one person.">
                <textarea className={textareaCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are these roles changing? e.g. Team restructure for Q4" />
            </Field>
            <FormError message={error} />
        </FormModal>
    )
}

/** Clears failed sign-in attempts for the locked users in the selection. */
export function BulkUnlockForm({ data, onClose, closing }: FormProps<{ userIds: string[] }>) {
    const dispatch = useDispatch()
    const { users } = useAppData()
    const list = users.filter((u) => data.userIds.includes(u.id))
    const locked = list.filter((u) => u.status === "LOCKED")
    const { run, busy, error } = useAsyncAction()

    const save = () => locked.length > 0 && run(async () => {
        dispatch(upsertUsersInStore(await unlockUsers(locked.map((u) => u.id))))
        toast({ text: `${locked.length} account${locked.length === 1 ? "" : "s"} unlocked`, icon: IconLockOpen })
        onClose()
    })

    return (
        <FormModal
            title="Unlock accounts"
            desc="Resets failed sign-in attempts so they can sign in again."
            icon={IconLockOpen}
            width={500}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            footer={<FormFoot onClose={onClose}><SubmitButton busy={busy} onClick={save} disabled={!locked.length}>Unlock {locked.length || ""}</SubmitButton></FormFoot>}
        >
            <div className="grid rounded-[10px] border [&>*+*]:border-t">
                {list.map((u) => {
                    const st = u.status ?? "ACTIVE"
                    return (
                        <div key={u.id} className="flex items-center gap-3 px-3.5 py-[11px]">
                            <Avatar name={u.name} seed={u.id} size={26} />
                            <div className="min-w-0 flex-1">
                                <div className="text-[13.5px] font-medium">{u.name}</div>
                                <div className="text-xs text-subtle-foreground">{st === "LOCKED" ? "Locked after too many failed attempts" : "Not locked, no change"}</div>
                            </div>
                            <Tag tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Tag>
                        </div>
                    )
                })}
            </div>
            {!locked.length && <Note icon={IconInfoCircle}>None of the selected accounts are locked.</Note>}
            <FormError message={error} />
        </FormModal>
    )
}

type Column = "name" | "email" | "phone" | "role" | "client" | "projects" | "open" | "last" | "status"
const COLUMNS: [Column, string][] = [
    ["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["role", "Role"], ["client", "Client"],
    ["projects", "Projects"], ["open", "Open tasks"], ["last", "Last sign-in"], ["status", "Status"],
]

/** Download the user list as CSV or JSON with chosen columns and a live preview. */
export function ExportUsersForm({ data, onClose, closing }: FormProps<{ role?: Role | "all"; userIds?: string[] }>) {
    const { users, clients, projects, tasks } = useAppData()
    const filtered = data.role && data.role !== "all" ? users.filter((u) => u.role === data.role) : null
    const selected = data.userIds?.length ? users.filter((u) => data.userIds!.includes(u.id)) : null
    const [format, setFormat] = useState<"csv" | "json">("csv")
    // Default to the narrowest thing the person was looking at: their selection, then the role tab
    const [scope, setScope] = useState<"all" | "filter" | "selected">(selected ? "selected" : filtered ? "filter" : "all")
    const [cols, setCols] = useState<Column[]>(["name", "email", "role", "client", "open", "status"])
    const [busy, setBusy] = useState(false)

    const rows = scope === "selected" && selected ? selected : scope === "filter" && filtered ? filtered : users
    const chosen = COLUMNS.filter(([k]) => cols.includes(k))
    const value = (u: User, k: Column): string | number => {
        switch (k) {
            case "name": return u.name
            case "email": return u.email
            case "phone": return u.number ?? ""
            case "role": return roleLabel(u.role)
            case "client": return clients.find((c) => c.assignedAdmin?.id === u.id)?.name ?? ""
            case "projects": return projects.filter((p) => p.user.some((m) => m.id === u.id)).length
            case "open": return openTaskCount(tasks, u.id)
            case "last": return u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().slice(0, 10) : ""
            case "status": return STATUS_LABEL[u.status ?? "ACTIVE"]
        }
    }
    const build = () =>
        format === "json"
            ? JSON.stringify(rows.map((u) => Object.fromEntries(chosen.map(([k, label]) => [label, value(u, k)]))), null, 2)
            : [chosen.map(([, l]) => l).join(","), ...rows.map((u) => chosen.map(([k]) => `"${String(value(u, k)).replace(/"/g, '""')}"`).join(","))].join("\n")

    const download = () => {
        if (!chosen.length) return
        setBusy(true)
        const url = URL.createObjectURL(new Blob([build()], { type: format === "json" ? "application/json" : "text/csv" }))
        Object.assign(document.createElement("a"), { href: url, download: `projoman-users.${format}` }).click()
        URL.revokeObjectURL(url)
        setBusy(false)
        toast({ text: <span>Exported {rows.length} users as {format.toUpperCase()}</span>, icon: IconDownload })
        onClose()
    }

    const toggle = (k: Column) => setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))

    return (
        <FormModal
            title="Export users"
            desc="Download a copy of the user list."
            icon={IconFileExport}
            width={600}
            onClose={onClose}
            onSubmit={download}
            closing={closing}
            footer={<FormFoot onClose={onClose}><SubmitButton busy={busy} onClick={download} disabled={!chosen.length}><IconDownload />Download {format.toUpperCase()}</SubmitButton></FormFoot>}
        >
            <Grid2>
                <Field label="Format"><div><Segmented value={format} onChange={setFormat} options={[{ value: "csv", label: "CSV" }, { value: "json", label: "JSON" }]} /></div></Field>
                <Field label="Rows">
                    <div>
                        <Segmented
                            value={scope}
                            onChange={setScope}
                            options={[
                                ...(selected ? [{ value: "selected" as const, label: `Selected (${selected.length})` }] : []),
                                ...(filtered && data.role !== "all" ? [{ value: "filter" as const, label: `${roleLabel(data.role as Role)}s (${filtered.length})` }] : []),
                                { value: "all" as const, label: `All (${users.length})` },
                            ]}
                        />
                    </div>
                </Field>
            </Grid2>
            <Field label="Columns" right={
                <span className="flex items-center gap-2 text-xs text-subtle-foreground">
                    {chosen.length} of {COLUMNS.length}
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Check
                            label="All columns"
                            checked={chosen.length === COLUMNS.length}
                            mixed={chosen.length > 0 && chosen.length < COLUMNS.length}
                            onChange={(on) => setCols(on ? COLUMNS.map(([k]) => k) : [])}
                        />
                        {chosen.length === COLUMNS.length ? "Clear all" : "Select all"}
                    </span>
                </span>
            }>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-1.5">
                    {COLUMNS.map(([k, label]) => {
                        const on = cols.includes(k)
                        return (
                            <label key={k} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-[7px] text-[13px] transition-all duration-fast", on && "border-primary bg-accent")}>
                                <Check checked={on} onChange={() => toggle(k)} label={label} />
                                <span onClick={() => toggle(k)}>{label}</span>
                            </label>
                        )
                    })}
                </div>
            </Field>
            <Field label="Preview">
                <pre className="m-0 max-h-[180px] overflow-auto rounded-lg border bg-surface-2 p-3 font-mono text-xs leading-[1.55] text-muted-foreground">
                    {build().split("\n").slice(0, format === "json" ? 9 : 4).join("\n")}{"\n…"}
                </pre>
            </Field>
            <div className="text-xs text-subtle-foreground">Passwords and reset tokens are never exported.</div>
        </FormModal>
    )
}
