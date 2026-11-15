import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { User } from "@/types/userTypes"

const users = [
    { id: "u1", name: "Ravi Shah", email: "r@x.io", role: "USER", status: "ACTIVE" },
    { id: "u2", name: "Mia Chen", email: "m@x.io", role: "CLIENT_ADMIN", status: "ACTIVE" },
    { id: "u3", name: "Raj Patel", email: "j@x.io", role: "USER", status: "ACTIVE" },
] as User[]
const clients = [
    { id: "c1", name: "Atlas", assignedAdmin: null },
    { id: "c2", name: "Bolt", assignedAdmin: { id: "u2", name: "Mia Chen" } },
]
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
vi.mock("./use-app-data", async (orig) => ({ ...(await orig<object>()), useAppData: () => ({ users, clients, projects: [], tasks: [] }) }))
const api = vi.hoisted(() => ({ updateUserRoles: vi.fn() }))
vi.mock("@/api/userApi", async (orig) => ({ ...(await orig<object>()), updateUserRoles: api.updateUserRoles }))
vi.mock("./toaster", async (orig) => ({ ...(await orig<object>()), toast: vi.fn() }))

const { BulkRoleForm } = await import("./user-bulk-forms")

const row = (name: string) => screen.getByRole("listitem", { name })
const setRole = (name: string, role: RegExp) => userEvent.click(within(row(name)).getByRole("button", { name: role }))
const open = () => render(<BulkRoleForm data={{ userIds: ["u1", "u2", "u3"] }} onClose={vi.fn()} closing={false} />)
const apply = () => screen.getByRole("button", { name: /Apply/ })

beforeEach(() => api.updateUserRoles.mockReset().mockResolvedValue(users))

describe("BulkRoleForm — per-person roles", () => {
    it("🟢 lists everyone with their current role", () => {
        open()
        expect(within(row("Mia Chen")).getAllByText("Client admin")).toHaveLength(2) // Current-role badge + the option
        expect(screen.getAllByRole("listitem")).toHaveLength(3)
    })

    it("🟢 gives each person their own role, with one shared reason and a per-person override", async () => {
        open()
        await setRole("Ravi Shah", /^Super admin$/)
        await setRole("Mia Chen", /^User$/)
        await userEvent.click(within(row("Ravi Shah")).getByRole("button", { name: "Different reason" }))
        await userEvent.type(within(row("Ravi Shah")).getByPlaceholderText("Reason for Ravi"), "Runs operations now")
        await userEvent.type(screen.getByPlaceholderText(/Why are these roles changing/), "Q4 restructure")
        expect(screen.getByText("1 promotion, 1 demotion")).toBeInTheDocument()
        await userEvent.click(apply())
        expect(api.updateUserRoles).toHaveBeenCalledWith(
            [
                { id: "u1", role: "SUPER_ADMIN", clientId: null, reason: "Runs operations now" },
                { id: "u2", role: "USER", clientId: null, reason: null },
            ],
            "Q4 restructure",
        )
    })

    it("🟢 'apply same role to all' sets every row", async () => {
        open()
        await userEvent.click(within(screen.getByRole("group", { name: "Apply same role to all" })).getByRole("button", { name: "User" }))
        expect(screen.getByText("1 demotion")).toBeInTheDocument()
    })

    it("🟢 a new client admin can be applied without a client", async () => {
        open()
        await setRole("Raj Patel", /^Client admin$/)
        await userEvent.type(screen.getByPlaceholderText(/Why are these roles changing/), "Joins as an admin")
        await userEvent.click(apply())
        expect(api.updateUserRoles).toHaveBeenCalledWith([{ id: "u3", role: "CLIENT_ADMIN", clientId: null, reason: null }], "Joins as an admin")
    })

    it("🟢 a new client admin can be given a client", async () => {
        api.updateUserRoles.mockClear()
        open()
        await setRole("Raj Patel", /^Client admin$/)
        await userEvent.type(screen.getByPlaceholderText(/Why are these roles changing/), "Leads Atlas")
        await userEvent.click(within(row("Raj Patel")).getByRole("button", { name: /No client yet/ }))
        await userEvent.click(await screen.findByText("Atlas"))
        expect(apply()).toBeEnabled()
        await userEvent.click(apply())
        expect(api.updateUserRoles).toHaveBeenCalledWith([{ id: "u3", role: "CLIENT_ADMIN", clientId: "c1", reason: null }], "Leads Atlas")
    })

    it("🔴 needs a reason", async () => {
        open()
        await setRole("Ravi Shah", /^Super admin$/)
        expect(apply()).toBeDisabled()
    })

    it("🔴 nothing to apply when no role changes", () => {
        open()
        expect(screen.getByText("No changes yet")).toBeInTheDocument()
        expect(apply()).toBeDisabled()
    })
})
