import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
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
    unlockUsers: vi.fn(), updateUserRoles: vi.fn(), declineClientDeletion: vi.fn(),
    confirmDeleteClient: vi.fn(), addUserToProject: vi.fn(), removeUserFromProject: vi.fn(), getAssignableUsers: vi.fn(),
}))
vi.mock("@/api/userApi", async (orig) => ({ ...(await orig<object>()), unlockUsers: api.unlockUsers, updateUserRoles: api.updateUserRoles }))
vi.mock("@/api/clientApi", async (orig) => ({ ...(await orig<object>()), declineClientDeletion: api.declineClientDeletion, confirmDeleteClient: api.confirmDeleteClient }))
vi.mock("@/api/projectApi", async (orig) => ({ ...(await orig<object>()), addUserToProject: api.addUserToProject, removeUserFromProject: api.removeUserFromProject, getAssignableUsers: api.getAssignableUsers }))
const toasts = vi.hoisted(() => ({ toast: vi.fn(), toastError: vi.fn() }))
vi.mock("@/components/forms/toaster", async (orig) => ({ ...(await orig<object>()), toast: toasts.toast, toastError: toasts.toastError }))

const { BulkUnlockForm, BulkRoleForm } = await import("./user-bulk-forms")
const { DeclineRequestForm } = await import("./client-form")
const { TeamForm, ProjectForm } = await import("./project-form")
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
        prepare: async () => {
            await userEvent.click(within(screen.getByRole("group", { name: "Apply same role to all" })).getByRole("button", { name: "Super admin" }))
            await userEvent.type(screen.getByPlaceholderText(/Why are these roles changing/), "Covers ops")
        },
        button: /apply/i,
        call: api.updateUserRoles,
        args: [[{ id: "u1", role: "SUPER_ADMIN", clientId: null, reason: null }], "Covers ops"],
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
        prepare: async () => { await userEvent.click(await screen.findByText("Ravi Shah")) },
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
    api.getAssignableUsers.mockResolvedValue(users)
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
        expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled() // Can't be pressed twice
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

describe("TeamForm — who can be added (CA-02)", () => {
    const candidates = [
        { id: "u1", name: "Ravi Shah", email: "r@x.io", role: "USER" },
        { id: "u2", name: "Mia Chen", email: "m@x.io", role: "USER" },
        { id: "u9", name: "Zoe New", email: "z@x.io", role: "CLIENT_ADMIN" },
    ]
    beforeEach(() => { api.getAssignableUsers.mockReset().mockResolvedValue(candidates); api.addUserToProject.mockReset().mockResolvedValue(project) })

    it("🟢 lists everyone the server says can join, not only people already on a team", async () => {
        render(<TeamForm data={{ projectId: "p1" }} onClose={() => {}} closing={false} />)
        expect(api.getAssignableUsers).toHaveBeenCalledWith("p1")
        await userEvent.click(await screen.findByText("Zoe New")) // Not in the client admin's users list
        await userEvent.click(screen.getByRole("button", { name: /save team/i }))
        expect(api.addUserToProject).toHaveBeenCalledWith({ id: "p1", users: ["u9"] })
    })

    it("🟢 shows a skeleton while the list loads; current members are listed once", async () => {
        let done!: (v: typeof candidates) => void
        api.getAssignableUsers.mockReturnValue(new Promise((r) => { done = r }))
        render(<TeamForm data={{ projectId: "p1" }} onClose={() => {}} closing={false} />)
        expect(screen.getByRole("status", { name: "Loading people" })).toBeInTheDocument()
        await act(async () => done(candidates))
        expect(screen.getAllByText("Mia Chen")).toHaveLength(1)
    })

    it("🔴 if the list can't load, current members can still be removed", async () => {
        api.getAssignableUsers.mockRejectedValue(new Error("nope"))
        render(<TeamForm data={{ projectId: "p1" }} onClose={() => {}} closing={false} />)
        expect(await screen.findByText("Mia Chen")).toBeInTheDocument()
        expect(screen.queryByText("Zoe New")).not.toBeInTheDocument()
    })
})

describe("ProjectForm — team picker (CA-02)", () => {
    it("🟢 a new project offers everyone the server says can join", async () => {
        api.getAssignableUsers.mockResolvedValue([{ id: "u9", name: "Zoe New", email: "z@x.io", role: "USER" }])
        render(<MemoryRouter><ProjectForm data={{}} onClose={() => {}} closing={false} /></MemoryRouter>)
        expect(api.getAssignableUsers).toHaveBeenCalledWith(undefined)
        await act(async () => {})
        await userEvent.click(screen.getByRole("button", { name: /Add people/ }))
        expect(screen.getByRole("option", { name: /Zoe New/ })).toBeInTheDocument()
    })
})

