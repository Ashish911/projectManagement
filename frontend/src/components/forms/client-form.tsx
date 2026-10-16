import { useRef, useState } from "react"
import { useDispatch } from "react-redux"
import { IconArrowBigUpLines, IconBuildingPlus, IconShieldCheck } from "@tabler/icons-react"
import { addClient, assignAdmin, declineClientDeletion, getClient, updateClient } from "@/api/clientApi"
import { changeUserRoles } from "@/api/userApi"
import { addClientToStore, updateClientInStore } from "@/redux/actions/clientsActions"
import { upsertUsersInStore } from "@/redux/actions/usersListActions"
import { Avatar } from "@/components/pm/avatar"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/clientTypes"
import { Chip, Field, FormError, FormFoot, FormModal, Grid2, Note, SubmitButton, inputCls, textareaCls, useForm } from "./form-kit"
import { Combo } from "./combo"
import { GhostAvatar, personOption } from "./options"
import { useAppData } from "./use-app-data"
import type { FormProps } from "./forms-context"
import { toast } from "./toaster"
import { useAsyncAction } from "@/hooks/use-async-action"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^\+?[\d\s()-]{7,}$/

type Values = { name: string; email: string; phone: string; adminId: string }

/**
 * New client or edit (`data.clientId`). Super admins also pick the client admin,
 * including promoting a regular user to the role. `data.client` lets client admins
 * edit their own client, which isn't in the clients list they can't read.
 */
export function ClientForm({ data, onClose, closing }: FormProps<{ clientId?: string; client?: Client; onSaved?: (c: Client) => void }>) {
    const dispatch = useDispatch()
    const { role, users, clients, tasks } = useAppData()
    const box = useRef<HTMLDivElement>(null)
    const isSuper = role === "SUPER_ADMIN"
    const cur = data.client ?? (data.clientId ? clients.find((c) => c.id === data.clientId) ?? null : null)

    const f = useForm<Values>(
        { name: cur?.name ?? "", email: cur?.email ?? "", phone: cur?.phone ?? "", adminId: cur?.assignedAdmin?.id ?? "" },
        {
            name: (x) => (!x.trim() ? "Client name is required" : clients.some((c) => c.id !== cur?.id && c.name.toLowerCase() === x.trim().toLowerCase()) ? "This client already exists" : null),
            email: (x) => (x.trim() && !EMAIL.test(x.trim()) ? "That doesn’t look like an email" : null),
            phone: (x) => (x.trim() && !PHONE.test(x.trim()) ? "Use digits, spaces or +" : null),
        },
    )
    const v = f.v

    const adminOptions = [
        { value: "", label: "Assign later", sub: "The client can’t manage its own projects until assigned", lead: <GhostAvatar /> },
        ...users.filter((u) => u.role === "CLIENT_ADMIN").map((u) => {
            const other = clients.find((c) => c.assignedAdmin?.id === u.id && c.id !== cur?.id)
            return { ...personOption(u, tasks, "Client admins"), sub: other ? `Already manages ${other.name}` : "Available", meta: null }
        }),
        ...users.filter((u) => u.role === "USER").map((u) => ({ ...personOption(u, tasks, "Promote a team member"), meta: <span className="text-xs text-subtle-foreground">Promote</span> })),
    ]
    const promote = users.find((u) => u.id === v.adminId && u.role === "USER")

    const save = () => f.submit(async (x) => {
        const fields = { name: x.name.trim(), email: x.email.trim().toLowerCase() || null, phone: x.phone.trim() || null }
        let client = cur ? await updateClient({ id: cur.id, ...fields }) : await addClient(fields)

        // Admin changes: promoting a user also assigns them; an existing client admin is just assigned
        if (isSuper && x.adminId && x.adminId !== cur?.assignedAdmin?.id) {
            if (promote) {
                dispatch(upsertUsersInStore(await changeUserRoles([promote.id], "CLIENT_ADMIN", client.id)))
                client = await getClient(client.id)
            } else {
                client = await assignAdmin({ id: client.id, assignedAdmin: x.adminId })
            }
        }

        dispatch(cur ? updateClientInStore(client) : addClientToStore(client))
        data.onSaved?.(client)
        toast({ text: <span><b>{client.name}</b> {cur ? "updated" : "added"}{promote ? ` · ${promote.name.split(" ")[0]} is now client admin` : ""}</span> })
        onClose()
    }, box)

    return (
        <FormModal
            title={cur ? "Edit client" : "New client"}
            desc={cur ? cur.name : "Clients own projects. A client admin manages them."}
            icon={IconBuildingPlus}
            width={560}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            shake={f.shake}
            boxRef={box}
            footer={<FormFoot onClose={onClose}><SubmitButton busy={f.busy} onClick={save}>{cur ? "Save changes" : "Add client"}</SubmitButton></FormFoot>}
        >
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3.5">
                <span className="grid size-11 place-items-center rounded-lg bg-surface-3 text-lg font-semibold text-muted-foreground">{(v.name.trim()[0] || "?").toUpperCase()}</span>
                <Field label="Client name" req error={f.err.name}>
                    <input className={inputCls} value={v.name} onChange={(e) => f.set("name", e.target.value)} onBlur={() => f.blur("name")} placeholder="e.g. Northwind" />
                </Field>
            </div>
            <Grid2>
                <Field label="Email" error={f.err.email} hint={f.err.email ? null : "Optional"}>
                    <input className={inputCls} value={v.email} onChange={(e) => f.set("email", e.target.value)} onBlur={() => f.blur("email")} placeholder="ops@company.com" />
                </Field>
                <Field label="Phone" error={f.err.phone} hint={f.err.phone ? null : "Optional"}>
                    <input className={cn(inputCls, "num")} value={v.phone} onChange={(e) => f.set("phone", e.target.value)} onBlur={() => f.blur("phone")} placeholder="+977 1-…" />
                </Field>
            </Grid2>
            {isSuper && (
                <Field label="Client admin" hint="Client admins can create projects and manage their own team.">
                    <Combo value={v.adminId} onChange={(x) => f.set("adminId", x)} options={adminOptions} placeholder="Assign later" searchPlaceholder="Search people" />
                </Field>
            )}
            {promote && (
                <Note icon={IconArrowBigUpLines}><b>{promote.name}</b> will be promoted from User to Client admin for this client.</Note>
            )}
            <FormError message={f.formError} />
        </FormModal>
    )
}

const QUICK_REPLIES = ["Project still in progress", "Contract runs until December", "Let’s talk first"]

/** Super admin declines a client admin's deletion request, with an optional message. */
export function DeclineRequestForm({ data, onClose, closing }: FormProps<{ clientId: string }>) {
    const dispatch = useDispatch()
    const { clients } = useAppData()
    const client = clients.find((c) => c.id === data.clientId)
    const [message, setMessage] = useState("")
    const { run, busy, error } = useAsyncAction()
    if (!client) return null
    const admin = client.assignedAdmin

    const save = () => run(async () => {
        dispatch(updateClientInStore(await declineClientDeletion(client.id, message.trim())))
        toast({ text: <span>Request declined{admin ? ` · ${admin.name.split(" ")[0]} was notified` : ""}</span>, icon: IconShieldCheck })
        onClose()
    })

    return (
        <FormModal
            title={`Decline deletion of ${client.name}?`}
            desc="The client and its projects stay as they are."
            icon={IconShieldCheck}
            width={520}
            onClose={onClose}
            onSubmit={save}
            closing={closing}
            footer={<FormFoot onClose={onClose}><SubmitButton busy={busy} onClick={save}>Decline request</SubmitButton></FormFoot>}
        >
            {admin && (
                <Note><span className="flex items-center gap-2.5"><Avatar name={admin.name} seed={admin.id} size={24} /><span><b>{admin.name}</b> (client admin) asked to delete this client.</span></span></Note>
            )}
            <Field label={admin ? `Message to ${admin.name.split(" ")[0]}` : "Message"} hint="Optional. Shown in their notification.">
                <textarea className={textareaCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Atlas Portal is still in progress. Let’s revisit when it’s complete." />
            </Field>
            <div className="-mt-1.5 flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map((s) => <Chip key={s} onClick={() => setMessage(`${s}.`)}>{s}</Chip>)}
            </div>
            <FormError message={error} />
        </FormModal>
    )
}
