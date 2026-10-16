import { useState } from "react"
import { useDispatch } from "react-redux"
import { IconAlertTriangle, IconDownload, IconFileExport, IconInfoCircle, IconLockOpen, IconUserShield } from "@tabler/icons-react"
import { changeUserRoles, unlockUsers } from "@/api/userApi"
import { upsertUsersInStore } from "@/redux/actions/usersListActions"
import { Avatar } from "@/components/pm/avatar"
import { Check } from "@/components/pm/check"
import { Segmented } from "@/components/pm/segmented"
import { STATUS, Tag } from "@/components/pm/status-badge"
import { cn } from "@/lib/utils"
import type { Role, User } from "@/types/userTypes"
import { Field, FormError, FormFoot, FormModal, Grid2, Note, SubmitButton } from "./form-kit"
import { Combo } from "./combo"
import { LogoChip } from "./options"
import { openTaskCount, useAppData } from "./use-app-data"
import type { FormProps } from "./forms-context"
import { toast } from "./toaster"
import { RoleCards, STATUS_LABEL, STATUS_TONE } from "./user-form"
import { useAsyncAction } from "@/hooks/use-async-action"

const roleLabel = (r: Role) => STATUS[r][0]

/** Name chips for the people a bulk action applies to. */
const PeopleChips = ({ list }: { list: User[] }) => (
    <div className="flex flex-wrap gap-1.5">
        {list.map((u) => (
            <span key={u.id} className="inline-flex h-[26px] items-center gap-1.5 rounded-full border bg-surface-2 pl-0.5 pr-2.5 text-[12.5px] font-medium">
                <Avatar name={u.name} seed={u.id} size={20} />{u.name}
            </span>
        ))}
    </div>
)

/** Sets one role for every selected user. A client admin needs exactly one person and a client. */
export function BulkRoleForm({ data, onClose, closing }: FormProps<{ userIds: string[] }>) {
    const dispatch = useDispatch()
    const { users, clients } = useAppData()
    const list = users.filter((u) => data.userIds.includes(u.id))
    const [role, setRole] = useState<Role>("USER")
    const [clientId, setClientId] = useState("")
    const { run, busy, error } = useAsyncAction()

    const changing = list.filter((u) => u.role !== role)
    const removesSuper = role !== "SUPER_ADMIN" && list.some((u) => u.role === "SUPER_ADMIN")
    const needsClient = role === "CLIENT_ADMIN"
    const tooMany = needsClient && list.length !== 1
    const canSave = changing.length > 0 && !tooMany && (!needsClient || !!clientId)

    const save = () => canSave && run(async () => {
        dispatch(upsertUsersInStore(await changeUserRoles(changing.map((u) => u.id), role, needsClient ? clientId : null)))
        toast({ text: <span>{changing.length} {changing.length === 1 ? "person is" : "people are"} now <b>{roleLabel(role)}</b></span> })
        onClose()
    })

    return (
        <FormModal
            title={`Change role for ${list.length} ${list.length === 1 ? "person" : "people"}`}
            icon={IconUserShield}
            width={600}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            footer={
                <FormFoot onClose={onClose} left={<span className="text-xs text-subtle-foreground">{changing.length} will change · {list.length - changing.length} already {roleLabel(role)}</span>}>
                    <SubmitButton busy={busy} onClick={save} disabled={!canSave}>Change role</SubmitButton>
                </FormFoot>
            }
        >
            <PeopleChips list={list} />
            <RoleCards value={role} onChange={setRole} />
            {needsClient && (tooMany ? (
                <Note tone="amber" icon={IconInfoCircle}>A client has one client admin. Select a single person to make them a client admin.</Note>
            ) : (
                <Field label="Client they manage" req>
                    <Combo
                        value={clientId}
                        onChange={setClientId}
                        placeholder="Choose client"
                        options={clients.filter((c) => !c.assignedAdmin).map((c) => ({ value: c.id, label: c.name, lead: <LogoChip name={c.name} /> }))}
                    />
                </Field>
            ))}
            {removesSuper && <Note tone="amber" icon={IconAlertTriangle}>This removes super admin access from someone in the selection. At least one super admin must remain.</Note>}
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
export function ExportUsersForm({ data, onClose, closing }: FormProps<{ role?: Role | "all" }>) {
    const { users, clients, projects, tasks } = useAppData()
    const filtered = data.role && data.role !== "all" ? users.filter((u) => u.role === data.role) : null
    const [format, setFormat] = useState<"csv" | "json">("csv")
    const [scope, setScope] = useState<"all" | "filter">(filtered ? "filter" : "all")
    const [cols, setCols] = useState<Column[]>(["name", "email", "role", "client", "open", "status"])
    const [busy, setBusy] = useState(false)

    const rows = scope === "filter" && filtered ? filtered : users
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
                            options={[{ value: "all", label: `All (${users.length})` }, ...(filtered && data.role !== "all" ? [{ value: "filter" as const, label: `${roleLabel(data.role as Role)}s (${filtered.length})` }] : [])]}
                        />
                    </div>
                </Field>
            </Grid2>
            <Field label="Columns" right={<span className="text-xs text-subtle-foreground">{chosen.length} of {COLUMNS.length}</span>}>
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
