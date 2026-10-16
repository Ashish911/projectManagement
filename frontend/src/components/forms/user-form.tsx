import { useRef, useState } from "react"
import { useDispatch } from "react-redux"
import type { Icon } from "@tabler/icons-react"
import {
    IconAlertTriangle,
    IconBuilding,
    IconCheck,
    IconCopy,
    IconLockOpen,
    IconMailForward,
    IconRefresh,
    IconShieldLock,
    IconUser,
    IconUserEdit,
    IconUserPlus,
} from "@tabler/icons-react"
import { changeUserRoles, createUser, resendInvite, unlockUsers, updateUser } from "@/api/userApi"
import { upsertUsersInStore } from "@/redux/actions/usersListActions"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/pm/segmented"
import { Avatar } from "@/components/pm/avatar"
import { Tag } from "@/components/pm/status-badge"
import { cn } from "@/lib/utils"
import type { Role, User } from "@/types/userTypes"
import { Field, FormError, FormFoot, FormModal, Grid2, Note, Section, SubmitButton, inputCls, useForm } from "./form-kit"
import { Combo } from "./combo"
import { LogoChip } from "./options"
import { useAppData } from "./use-app-data"
import { useForms, type FormProps } from "./forms-context"
import { toast, toastError } from "./toaster"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^\+?[\d\s()-]{7,}$/

export const ROLES: [Role, Icon, string, string][] = [
    ["USER", IconUser, "User", "Works on tasks assigned to them"],
    ["CLIENT_ADMIN", IconBuilding, "Client admin", "Runs one client’s projects and team"],
    ["SUPER_ADMIN", IconShieldLock, "Super admin", "Full access, including deletions"],
]

/** Three role cards acting as a radio group. */
export function RoleCards({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
    return (
        <div role="radiogroup" className="grid grid-cols-1 gap-2 min-[560px]:grid-cols-3">
            {ROLES.map(([k, I, label, desc]) => {
                const on = value === k
                return (
                    <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        key={k}
                        onClick={() => onChange(k)}
                        className={cn(
                            "grid content-start gap-[5px] rounded-[10px] border border-border-strong bg-card p-3 text-left transition-[border-color,background,box-shadow] duration-fast hover:border-subtle-foreground",
                            on && "border-primary bg-accent shadow-[inset_0_0_0_1px_oklch(var(--primary))] hover:border-primary",
                        )}
                    >
                        <I size={18} className={on ? "text-accent-foreground" : "text-subtle-foreground"} />
                        <b className="text-[13.5px] font-semibold">{label}</b>
                        <span className="text-xs leading-[1.35] text-muted-foreground">{desc}</span>
                    </button>
                )
            })}
        </div>
    )
}

export const STATUS_TONE = { ACTIVE: "green", LOCKED: "red", INVITED: "outline" } as const
export const STATUS_LABEL = { ACTIVE: "Active", LOCKED: "Locked", INVITED: "Invited" } as const

/** 14 readable characters (no 0/O/1/l look-alikes). */
const generatePassword = () => {
    const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&"
    return Array.from(crypto.getRandomValues(new Uint32Array(14)), (n) => c[n % c.length]).join("")
}

type Values = {
    name: string
    email: string
    phone: string
    gender: string
    dob: string
    role: Role
    clientId: string
    mode: "INVITE" | "PASSWORD"
    password: string
}

/** Invite a user (SUPER_ADMIN), or edit one when `data.userId` is given. */
export function UserForm({ data, onClose, closing }: FormProps<{ userId?: string }>) {
    const dispatch = useDispatch()
    const openForm = useForms()
    const { users, clients } = useAppData()
    const box = useRef<HTMLDivElement>(null)
    const cur = data.userId ? users.find((u) => u.id === data.userId) ?? null : null
    const managed = cur ? clients.find((c) => c.assignedAdmin?.id === cur.id) : undefined
    const [copied, setCopied] = useState(false)
    const [statusBusy, setStatusBusy] = useState(false)

    const f = useForm<Values>(
        {
            name: cur?.name ?? "",
            email: cur?.email ?? "",
            phone: cur?.number ?? "",
            gender: cur?.gender ?? "",
            dob: cur?.dob ? new Date(/^\d+$/.test(cur.dob) ? Number(cur.dob) : cur.dob).toISOString().slice(0, 10) : "",
            role: cur?.role ?? "USER",
            clientId: managed?.id ?? "",
            mode: "INVITE",
            password: generatePassword(),
        },
        {
            name: (x) => (x.trim() ? null : "Name is required"),
            email: (x) =>
                !x.trim() ? "Email is required"
                    : !EMAIL.test(x.trim()) ? "That doesn’t look like an email"
                        : users.some((u) => u.id !== cur?.id && u.email === x.trim().toLowerCase()) ? "Someone already uses this email" : null,
            phone: (x) => (!x.trim() ? (cur ? null : "Phone number is required") : !PHONE.test(x.trim()) ? "Use digits, spaces or +" : null),
            gender: (x) => (cur || x ? null : "Select one"),
            clientId: (x, a) => (a.role === "CLIENT_ADMIN" && !x ? "Pick the client they’ll manage" : null),
            password: (x, a) => (!cur && a.mode === "PASSWORD" && x.length < 8 ? "At least 8 characters" : null),
        },
    )
    const v = f.v
    const strength = [v.password.length >= 8, v.password.length >= 12, /[A-Z]/.test(v.password) && /[a-z]/.test(v.password), /\d/.test(v.password) && /[^\w]/.test(v.password)].filter(Boolean).length

    // Clients without an admin, plus the one this person already manages
    const clientOptions = clients
        .filter((c) => !c.assignedAdmin || c.assignedAdmin.id === cur?.id)
        .map((c) => ({ value: c.id, label: c.name, sub: c.assignedAdmin ? "Managed by this user" : "No admin yet", lead: <LogoChip name={c.name} /> }))

    const save = () => f.submit(async (x) => {
        const profile = { name: x.name.trim(), email: x.email.trim().toLowerCase(), number: x.phone.trim(), gender: x.gender || "OTHERS", dob: x.dob || null }
        if (cur) {
            let updated: User = await updateUser({ id: cur.id, ...profile })
            const roleChanged = x.role !== cur.role || (x.role === "CLIENT_ADMIN" && x.clientId !== (managed?.id ?? ""))
            if (roleChanged) [updated] = await changeUserRoles([cur.id], x.role, x.role === "CLIENT_ADMIN" ? x.clientId : null)
            dispatch(upsertUsersInStore([updated]))
            toast({ text: <span>Saved <b>{updated.name}</b></span> })
        } else {
            const created = await createUser({ ...profile, role: x.role, clientId: x.role === "CLIENT_ADMIN" ? x.clientId : null, mode: x.mode, password: x.mode === "PASSWORD" ? x.password : null })
            dispatch(upsertUsersInStore([created]))
            toast(x.mode === "INVITE"
                ? { text: <span>Invite sent to <b>{created.email}</b></span>, icon: IconMailForward }
                : { text: <span><b>{created.name}</b> added</span> })
        }
        onClose()
    }, box)

    const runStatus = async (fn: () => Promise<void>) => {
        setStatusBusy(true)
        try { await fn() } catch (e: any) { toastError(e.message) } finally { setStatusBusy(false) }
    }
    const status = cur?.status ?? "ACTIVE"

    return (
        <FormModal
            title={cur ? "Edit user" : "Invite user"}
            desc={cur ? cur.email : "Add someone to ProjoMan and choose what they can do."}
            icon={cur ? IconUserEdit : IconUserPlus}
            width={640}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            shake={f.shake}
            boxRef={box}
            footer={
                <FormFoot onClose={onClose}>
                    <SubmitButton busy={f.busy} onClick={save}>{cur ? "Save changes" : v.mode === "INVITE" ? "Send invite" : "Create user"}</SubmitButton>
                </FormFoot>
            }
        >
            <Section>Profile</Section>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3.5">
                <Avatar name={v.name.trim() || "?"} seed={cur?.id} size={40} />
                <Field label="Full name" req error={f.err.name}>
                    <input className={inputCls} value={v.name} onChange={(e) => f.set("name", e.target.value)} onBlur={() => f.blur("name")} placeholder="e.g. Mina Lama" />
                </Field>
            </div>
            <Grid2>
                <Field label="Email" req error={f.err.email}>
                    <input className={inputCls} type="email" value={v.email} onChange={(e) => f.set("email", e.target.value)} onBlur={() => f.blur("email")} placeholder="name@company.com" />
                </Field>
                <Field label="Phone" req={!cur} error={f.err.phone}>
                    <input className={cn(inputCls, "num")} value={v.phone} onChange={(e) => f.set("phone", e.target.value)} onBlur={() => f.blur("phone")} placeholder="+977 98…" />
                </Field>
                <Field label="Gender" req={!cur} error={f.err.gender}>
                    <div>
                        <Segmented value={v.gender as any} onChange={(x: string) => f.set("gender", x)} options={[{ value: "FEMALE", label: "Female" }, { value: "MALE", label: "Male" }, { value: "OTHERS", label: "Other" }]} />
                    </div>
                </Field>
                <Field label="Date of birth" hint="Optional">
                    <input className={cn(inputCls, "num")} type="date" value={v.dob} max="2010-12-31" onChange={(e) => f.set("dob", e.target.value)} />
                </Field>
            </Grid2>

            <Section>Access</Section>
            <RoleCards value={v.role} onChange={(r) => f.set("role", r)} />
            {v.role === "SUPER_ADMIN" && (
                <Note tone="amber" icon={IconAlertTriangle}>Super admins can delete clients, projects and users. Keep this to one or two people.</Note>
            )}
            {v.role === "CLIENT_ADMIN" && (
                <Field label="Client they manage" req error={f.err.clientId} hint={clientOptions.length ? null : "Every client already has an admin."}>
                    <Combo value={v.clientId} onChange={(x) => f.set("clientId", x)} options={clientOptions} placeholder="Choose client" searchPlaceholder="Search clients" onBlur={() => f.blur("clientId")} />
                </Field>
            )}

            {!cur && (
                <>
                    <Section>Sign-in</Section>
                    <div>
                        <Segmented value={v.mode} onChange={(x) => f.set("mode", x)} options={[{ value: "INVITE", label: "Email an invite link" }, { value: "PASSWORD", label: "Set a temporary password" }]} />
                    </div>
                    {v.mode === "INVITE" ? (
                        <Note icon={IconMailForward}>We’ll email <b>{v.email.trim() || "them"}</b> a link to set their own password. It expires in 48 hours.</Note>
                    ) : (
                        <Field label="Temporary password" error={f.err.password} hint="Share it with them privately; they can change it from their account menu.">
                            <div className="flex gap-1.5">
                                <input className={cn(inputCls, "num")} value={v.password} spellCheck={false} onChange={(e) => f.set("password", e.target.value)} onBlur={() => f.blur("password")} />
                                <Button type="button" variant="outline" size="icon" title="Generate new" aria-label="Generate new password" onClick={() => f.set("password", generatePassword())}><IconRefresh /></Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-w-[88px]"
                                    onClick={() => { navigator.clipboard?.writeText(v.password).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1400) }}
                                >
                                    {copied ? <IconCheck /> : <IconCopy />}{copied ? "Copied" : "Copy"}
                                </Button>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                                {[0, 1, 2, 3].map((i) => (
                                    <i
                                        key={i}
                                        className="h-1 rounded transition-colors duration-base"
                                        style={{ background: i < strength ? `oklch(var(${strength <= 1 ? "--chart-4" : strength === 2 ? "--chart-3" : "--chart-2"}))` : "oklch(var(--surface-3))" }}
                                    />
                                ))}
                            </div>
                        </Field>
                    )}
                </>
            )}

            {cur && (
                <>
                    <Section>Account</Section>
                    <div className="grid rounded-[10px] border [&>*+*]:border-t">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-3.5 py-3 text-[13.5px]">
                            <div className="flex-1">
                                <div className="font-medium">Status</div>
                                <div className="text-xs text-subtle-foreground">
                                    {status === "LOCKED" ? "Locked after too many failed sign-in attempts" : status === "INVITED" ? "Hasn’t accepted the invite yet" : "Can sign in normally"}
                                </div>
                            </div>
                            <Tag tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Tag>
                            {status === "LOCKED" && (
                                <Button type="button" size="sm" variant="outline" disabled={statusBusy}
                                    onClick={() => runStatus(async () => { dispatch(upsertUsersInStore(await unlockUsers([cur.id]))); toast({ text: `${cur.name} unlocked`, icon: IconLockOpen }) })}>
                                    <IconLockOpen />Unlock
                                </Button>
                            )}
                            {status === "INVITED" && (
                                <Button type="button" size="sm" variant="outline" disabled={statusBusy}
                                    onClick={() => runStatus(async () => { toast({ text: await resendInvite(cur.id), icon: IconMailForward }) })}>
                                    Resend
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 px-3.5 py-3 text-[13.5px]">
                            <div className="flex-1">
                                <div className="font-medium">Remove user</div>
                                <div className="text-xs text-subtle-foreground">Turns off sign-in; their tasks become unassigned</div>
                            </div>
                            <Button type="button" size="sm" variant="outline" className="tone-red tone-fg" onClick={() => { onClose(); setTimeout(() => openForm("delete-user", { userIds: [cur.id] }), 200) }}>
                                Remove…
                            </Button>
                        </div>
                    </div>
                </>
            )}
            <FormError message={f.formError} />
        </FormModal>
    )
}
