import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { User } from "@/types/userTypes"

const users = [
    { id: "u1", name: "Ravi Shah", email: "r@x.io", role: "USER", status: "ACTIVE" },
    { id: "u2", name: "Mina Lama", email: "m@x.io", role: "CLIENT_ADMIN", status: "ACTIVE" },
] as User[]
const client = { id: "c1", name: "Atlas", email: null, phone: null, deleteRequest: false, assignedAdmin: null }

vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
vi.mock("./use-app-data", async (orig) => ({ ...(await orig<object>()), useAppData: () => ({ role: "SUPER_ADMIN", users, clients: [client], tasks: [], projects: [] }) }))
const api = vi.hoisted(() => ({ updateClient: vi.fn(), assignAdmin: vi.fn(), getClient: vi.fn(), changeUserRoles: vi.fn() }))
vi.mock("@/api/clientApi", async (orig) => ({ ...(await orig<object>()), updateClient: api.updateClient, assignAdmin: api.assignAdmin, getClient: api.getClient }))
vi.mock("@/api/userApi", async (orig) => ({ ...(await orig<object>()), changeUserRoles: api.changeUserRoles }))
vi.mock("./toaster", async (orig) => ({ ...(await orig<object>()), toast: vi.fn() }))

const { ClientForm } = await import("./client-form")

async function pickAdmin(name: string) {
    render(<ClientForm data={{ clientId: "c1" }} onClose={vi.fn()} closing={false} />)
    await new Promise((r) => setTimeout(r, 100)) // FormModal's open-focus
    await userEvent.click(screen.getByRole("button", { name: /Assign later/ }))
    await userEvent.click(await screen.findByText(name))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
}

beforeEach(() => {
    api.updateClient.mockReset().mockResolvedValue(client)
    api.getClient.mockReset().mockResolvedValue({ ...client, assignedAdmin: users[0] })
    api.changeUserRoles.mockReset().mockResolvedValue([{ ...users[0], role: "CLIENT_ADMIN" }])
    api.assignAdmin.mockReset().mockResolvedValue({ ...client, assignedAdmin: users[1] })
})

describe("ClientForm — assigning a client admin", () => {
    it("🔴 asks before promoting a User, and promotes nobody until confirmed", async () => {
        await pickAdmin("Ravi Shah")
        expect(screen.getByText(/Ravi Shah is currently a User\. Assigning them to Atlas will promote them to Client Admin\. Continue\?/)).toBeInTheDocument()
        expect(api.changeUserRoles).not.toHaveBeenCalled()
        expect(api.updateClient).not.toHaveBeenCalled()
    })

    it("🟢 promotes and assigns once confirmed", async () => {
        await pickAdmin("Ravi Shah")
        await userEvent.click(screen.getByRole("button", { name: "Promote and assign" }))
        expect(api.changeUserRoles).toHaveBeenCalledWith(["u1"], "CLIENT_ADMIN", "c1")
    })

    it("🟢 going back from the confirmation changes nothing", async () => {
        await pickAdmin("Ravi Shah")
        await userEvent.click(screen.getByRole("button", { name: "Back" }))
        expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
        expect(api.changeUserRoles).not.toHaveBeenCalled()
    })

    it("🟢 an existing client admin is assigned without a confirmation", async () => {
        await pickAdmin("Mina Lama")
        expect(api.assignAdmin).toHaveBeenCalledWith({ id: "c1", assignedAdmin: "u2" })
    })
})
