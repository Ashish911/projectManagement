import { useState } from "react"
import { useDispatch } from "react-redux"
import { useLocation, useNavigate } from "react-router-dom"
import type { Icon } from "@tabler/icons-react"
import {
    IconAlertTriangle,
    IconBuilding,
    IconFolder,
    IconListDetails,
    IconShieldX,
    IconTrash,
    IconUserMinus,
    IconUserOff,
    IconUsers,
} from "@tabler/icons-react"
import { deleteClientBySuperAdmin, forceDeleteClient } from "@/api/clientApi"
import { deleteProject } from "@/api/projectApi"
import { deleteUser, deleteUsers } from "@/api/userApi"
import { addClientToStore, removeClientFromStore } from "@/redux/actions/clientsActions"
import { addProjectToStore, removeProjectFromStore } from "@/redux/actions/projectsActions"
import { removeUserFromStore, upsertUsersInStore } from "@/redux/actions/usersListActions"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/pm/avatar"
import { Check } from "@/components/pm/check"
import { Field, FormFoot, FormModal, Note, inputCls } from "./form-kit"
import { useAppData } from "./use-app-data"
import { useForms, type FormProps } from "./forms-context"
import { scheduleDelete } from "./toaster"

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** Bordered list of consequences: icon, headline, detail. */
function Impacts({ items }: { items: [Icon, string, string][] }) {
    return (
        <div>
            <div className="mb-2 text-[13px] font-medium">What happens</div>
            <div className="grid rounded-[10px] border [&>*+*]:border-t">
                {items.map(([I, headline, detail]) => (
                    <div key={headline} className="flex items-start gap-3 px-3.5 py-[11px]">
                        <I size={17} className="mt-px flex-none text-subtle-foreground" />
                        <div className="min-w-0">
                            <div className="text-[13.5px] font-medium">{headline}</div>
                            <div className="truncate text-xs text-subtle-foreground">{detail}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/** Shared shell: impact list, then type the name to enable the destructive button. */
function ConfirmByName({ title, name, impacts, label, extra, onConfirm, onClose, closing, secondary }: {
    title: string
    name: string
    impacts: [Icon, string, string][]
    label: string
    extra?: React.ReactNode
    onConfirm: () => void
    onClose: () => void
    closing: boolean
    secondary?: React.ReactNode
}) {
    const [typed, setTyped] = useState("")
    const ok = typed.trim() === name
    return (
        <FormModal
            title={title}
            desc="You’ll have a few seconds to undo."
            icon={IconAlertTriangle}
            tone="red"
            width={500}
            onClose={onClose}
            onSubmit={() => ok && onConfirm()}
            closing={closing}
            footer={
                <FormFoot onClose={onClose} left={null}>
                    {secondary}
                    <Button type="button" variant="destructive" disabled={!ok} onClick={onConfirm}><IconTrash />{label}</Button>
                </FormFoot>
            }
        >
            {extra}
            <Impacts items={impacts} />
            <Field label={<span>Type <b className="rounded bg-surface-3 px-[5px] py-px font-mono font-medium">{name}</b> to confirm</span>}>
                <input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name} autoComplete="off" />
            </Field>
        </FormModal>
    )
}

/** Deletes a client: approves a pending request, or force-deletes otherwise. */
export function DeleteClientForm({ data, onClose, closing }: FormProps<{ clientId: string }>) {
    const dispatch = useDispatch()
    const openForm = useForms()
    const { clients, projects, tasks } = useAppData()
    const client = clients.find((c) => c.id === data.clientId)
    if (!client) return null
    const ps = projects.filter((p) => p.client?.id === client.id)
    const open = tasks.filter((t) => ps.some((p) => p.id === t.project?.id) && t.currentStatus !== "RESOLVED").length
    const admin = client.assignedAdmin

    const confirm = () => {
        onClose()
        scheduleDelete({
            text: <span><b>{client.name}</b> deleted</span>,
            hide: () => dispatch(removeClientFromStore(client.id)),
            restore: () => dispatch(addClientToStore(client)),
            commit: () => (client.deleteRequest ? deleteClientBySuperAdmin(client.id) : forceDeleteClient(client.id)),
        })
    }

    return (
        <ConfirmByName
            title={client.deleteRequest ? `Approve deletion of ${client.name}?` : `Delete ${client.name}?`}
            name={client.name}
            label={client.deleteRequest ? "Approve & delete" : "Delete client"}
            onConfirm={confirm}
            onClose={onClose}
            closing={closing}
            extra={client.deleteRequest && admin && (
                <Note><span className="flex items-center gap-2.5"><Avatar name={admin.name} seed={admin.id} size={24} /><span><b>{admin.name}</b> (client admin) requested this.</span></span></Note>
            )}
            secondary={client.deleteRequest && (
                <Button type="button" variant="outline" onClick={() => { onClose(); setTimeout(() => openForm("decline-request", { clientId: client.id }), 200) }}>Decline request</Button>
            )}
            impacts={[
                [IconFolder, `${plural(ps.length, "project")} lose their client`, ps.map((p) => p.name).join(", ") || "None"],
                [IconListDetails, `${plural(open, "open task")} in those projects`, "They stay, but can only be reached by super admins"],
                [IconUserMinus, admin ? `${admin.name} loses client admin access` : "No client admin to remove", admin ? "Their user account is kept" : "—"],
            ]}
        />
    )
}

/** Deletes a project (and leaves the project page if you're on it). */
export function DeleteProjectForm({ data, onClose, closing }: FormProps<{ projectId: string }>) {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const { projects, tasks } = useAppData()
    const project = projects.find((p) => p.id === data.projectId)
    if (!project) return null
    const ts = tasks.filter((t) => t.project?.id === project.id)

    const confirm = () => {
        onClose()
        if (pathname === `/projects/${project.id}`) navigate("/projects")
        scheduleDelete({
            text: <span><b>{project.name}</b> deleted</span>,
            hide: () => dispatch(removeProjectFromStore(project.id)),
            restore: () => dispatch(addProjectToStore(project)),
            commit: () => deleteProject(project.id),
        })
    }

    return (
        <ConfirmByName
            title={`Delete ${project.name}?`}
            name={project.name}
            label="Delete project"
            onConfirm={confirm}
            onClose={onClose}
            closing={closing}
            impacts={[
                [IconListDetails, `${plural(ts.length, "task")} no longer belong to a project`, `${ts.filter((t) => t.currentStatus !== "RESOLVED").length} still open`],
                [IconUsers, `${plural(project.user.length, "person").replace("persons", "people")} removed from the team`, project.user.map((u) => u.name).join(", ") || "No team"],
                [IconBuilding, "The client is not affected", project.client?.name ?? "No client"],
            ]}
        />
    )
}

/** Removes one user (typed-name confirmation) or several (checkbox acknowledgement). */
export function DeleteUsersForm({ data, onClose, closing }: FormProps<{ userIds: string[] }>) {
    const dispatch = useDispatch()
    const { profile, users, projects, tasks } = useAppData()
    const list = users.filter((u) => data.userIds.includes(u.id))
    const [ack, setAck] = useState(false)
    if (!list.length) return null

    const open = tasks.filter((t) => list.some((u) => u.id === t.assignedTo?.id) && t.currentStatus !== "RESOLVED")
    const ps = projects.filter((p) => p.user.some((m) => list.some((u) => u.id === m.id)))
    const includesSuper = list.length > 1 && list.some((u) => u.role === "SUPER_ADMIN")
    const includesSelf = list.some((u) => u.id === profile?.id)

    const confirm = () => {
        onClose()
        scheduleDelete({
            text: list.length === 1 ? <span><b>{list[0].name}</b> removed</span> : `${list.length} people removed`,
            hide: () => list.forEach((u) => dispatch(removeUserFromStore(u.id))),
            restore: () => dispatch(upsertUsersInStore(list)),
            commit: () => (list.length === 1 ? deleteUser(list[0].id) : deleteUsers(list.map((u) => u.id))),
        })
    }

    const impacts: [Icon, string, string][] = [
        [IconUserOff, "Sign-in turned off immediately", list.map((u) => u.email).join(", ")],
        [IconListDetails, `${plural(open.length, "open task")} become unassigned`, open.slice(0, 2).map((t) => t.title).join(" · ") || "None"],
        [IconFolder, `Removed from ${plural(ps.length, "project")}`, ps.map((p) => p.name).join(", ") || "None"],
    ]

    if (list.length === 1) {
        return <ConfirmByName title={`Remove ${list[0].name}?`} name={list[0].name} label="Remove user" impacts={impacts} onConfirm={confirm} onClose={onClose} closing={closing} />
    }

    const blocked = includesSuper || includesSelf
    return (
        <FormModal
            title={`Remove ${list.length} people?`}
            desc="You’ll have a few seconds to undo."
            icon={IconAlertTriangle}
            tone="red"
            width={520}
            onClose={onClose}
            onSubmit={() => ack && !blocked && confirm()}
            closing={closing}
            footer={
                <FormFoot onClose={onClose} left={null}>
                    <Button type="button" variant="destructive" disabled={!ack || blocked} onClick={confirm}><IconTrash />Remove {list.length}</Button>
                </FormFoot>
            }
        >
            <div className="flex flex-wrap gap-1.5">
                {list.map((u) => (
                    <span key={u.id} className="inline-flex h-[26px] items-center gap-1.5 rounded-full border bg-surface-2 pl-0.5 pr-2.5 text-[12.5px] font-medium">
                        <Avatar name={u.name} seed={u.id} size={20} />{u.name}
                    </span>
                ))}
            </div>
            <Impacts items={impacts} />
            {blocked ? (
                <Note tone="red" icon={IconShieldX}>{includesSelf ? "You can’t remove yourself. Deselect your own account first." : "Super admins can’t be removed in bulk. Deselect them first."}</Note>
            ) : (
                <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                    <Check checked={ack} onChange={setAck} label="I understand this removes their access" />
                    <span onClick={() => setAck(!ack)}>I understand this removes their access</span>
                </label>
            )}
        </FormModal>
    )
}
