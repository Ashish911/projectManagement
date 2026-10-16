import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { User } from "@/types/userTypes"

// ── Store and API mocks ──────────────────────────────────────────────────────
const users: User[] = [
    { id: "u1", name: "Ravi Shah", email: "r@x.io", role: "USER", status: "LOCKED" } as User,
    { id: "u2", name: "Mia Chen", email: "m@x.io", role: "USER", status: "ACTIVE" } as User,
]
const client = { id: "c1", name: "Atlas", deleteRequest: true, assignedAdmin: { id: "u3", name: "Ana Diaz" } }
const project = { id: "p1", name: "Portal", user: [{ id: "u2", name: "Mia Chen", email: "m@x.io" }] }
const state = { profile: { profile: null }, usersList: { users }, clients: { clients: [client] }, projects: { projects: [project] }, tasks: { tasks: [], loaded: true } }

const dispatch = vi.hoisted(() => vi.fn())
vi.mock("react-redux", () => ({ useDispatch: () => dispatch, useSelector: (sel: (s: any) => unknown) => sel(state) }))

const api = vi.hoisted(() => ({
    unlockUsers: vi.fn(), changeUserRoles: vi.fn(), declineClientDeletion: vi.fn(),
    confirmDeleteClient: vi.fn(), addUserToProject: vi.fn(), removeUserFromProject: vi.fn(),
}))
vi.mock("@/api/userApi", async (orig) => ({ ...(await orig<object>()), unlockUsers: api.unlockUsers, changeUserRoles: api.changeUserRoles }))
vi.mock("@/api/clientApi", async (orig) => ({ ...(await orig<object>()), declineClientDeletion: api.declineClientDeletion, confirmDeleteClient: api.confirmDeleteClient }))
vi.mock("@/api/projectApi", async (orig) => ({ ...(await orig<object>()), addUserToProject: api.addUserToProject, removeUserFromProject: api.removeUserFromProject }))
const toasts = vi.hoisted(() => ({ toast: vi.fn(), toastError: vi.fn() }))
vi.mock("@/components/forms/toaster", async (orig) => ({ ...(await orig<object>()), toast: toasts.toast, toastError: toasts.toastError }))

const { BulkUnlockForm, BulkRoleForm } = await import("./user-bulk-forms")
const { DeclineRequestForm } = await import("./client-form")
const { TeamForm } = await import("./project-form")
const { RequestDeletionDialog } = await import("@/Screens/Dashboard/Clients")

function deferred<T>() {
    let resolve!: (v: T) => void
    const promise = new Promise<T>((r) => { resolve = r })
    return { promise, resolve }
}
const cmdEnter = () => fireEvent.keyDown(window, { key: "Enter", metaKey: true })

/** Each form: how to render it, its submit button, the API call it makes, and how it reports errors. */
const cases = [
    {
        name: "BulkUnlockForm",
        render: (onClose: () => void) => <BulkUnlockForm data={{ userIds: ["u1", "u2"] }} onClose={onClose} closing={false} />,
        button: /unlock/i,
        call: api.unlockUsers,
        args: [["u1"]],
        ok: [users[0]],
        errorIn: "dialog" as const,
    },
    {
        name: "BulkRoleForm",
        render: (onClose: () => void) => <BulkRoleForm data={{ userIds: ["u1"] }} onClose={onClose} closing={false} />,
        prepare: async () => { await userEvent.click(screen.getByRole("radio", { name: /super admin/i })) },
        button: /change role/i,
        call: api.changeUserRoles,
        args: [["u1"], "SUPER_ADMIN", null],
        ok: [users[0]],
        errorIn: "dialog" as const,
    },
    {
        name: "DeclineRequestForm",
        render: (onClose: () => void) => <DeclineRequestForm data={{ clientId: "c1" }} onClose={onClose} closing={false} />,
        button: /decline request/i,
        call: api.declineClientDeletion,
        args: ["c1", ""],
        ok: client,
        errorIn: "dialog" as const,
    },
    {
        name: "TeamForm",
        render: (onClose: () => void) => <TeamForm data={{ projectId: "p1" }} onClose={onClose} closing={false} />,
        prepare: async () => { await userEvent.click(screen.getByText("Ravi Shah")) },
        button: /save team/i,
        call: api.addUserToProject,
        args: [{ id: "p1", users: ["u1"] }],
        ok: project,
        errorIn: "dialog" as const,
    },
    {
        name: "RequestDeletionDialog",
        render: (onClose: () => void) => <RequestDeletionDialog client={client as any} onClose={onClose} onDone={() => {}} />,
        button: /request deletion/i,
        call: api.confirmDeleteClient,
        args: ["c1"],
        ok: undefined,
        errorIn: "toast" as const,
    },
]

beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    toasts.toast.mockReset()
    toasts.toastError.mockReset()
    dispatch.mockReset()
})

describe.each(cases)("$name", (c) => {
    it("🟢 saves once with the right arguments, then closes", async () => {
        c.call.mockResolvedValue(c.ok)
        const onClose = vi.fn()
        render(c.render(onClose))
        await c.prepare?.()
        await userEvent.click(screen.getByRole("button", { name: c.button }))
        expect(c.call).toHaveBeenCalledTimes(1)
        expect(c.call).toHaveBeenCalledWith(...c.args)
        expect(onClose).toHaveBeenCalled()
        expect(toasts.toast).toHaveBeenCalled()
    })

    it("🟢 shows Saving… while the request is in flight", async () => {
        const d = deferred<unknown>()
        c.call.mockReturnValue(d.promise)
        render(c.render(() => {}))
        await c.prepare?.()
        await userEvent.click(screen.getByRole("button", { name: c.button }))
        expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument()
        await act(async () => d.resolve(c.ok))
    })

    it("🔴 a server error is shown and the form stays open", async () => {
        c.call.mockRejectedValue(new Error("Server says no"))
        const onClose = vi.fn()
        render(c.render(onClose))
        await c.prepare?.()
        await userEvent.click(screen.getByRole("button", { name: c.button }))
        if (c.errorIn === "dialog") expect(screen.getByRole("dialog")).toHaveTextContent("Server says no")
        else expect(toasts.toastError).toHaveBeenCalledWith("Server says no")
        expect(onClose).not.toHaveBeenCalled()
        expect(screen.getByRole("button", { name: c.button })).toBeInTheDocument() // No longer busy
    })

    it("🔴 ⌘↵ while a save is in flight does not send a second request", async () => {
        const d = deferred<unknown>()
        c.call.mockReturnValue(d.promise)
        render(c.render(() => {}))
        await c.prepare?.()
        await userEvent.click(screen.getByRole("button", { name: c.button }))
        act(() => { cmdEnter(); cmdEnter() })
        expect(c.call).toHaveBeenCalledTimes(1)
        await act(async () => d.resolve(c.ok))
    })
})
