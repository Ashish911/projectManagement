import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const admin = { id: "a1", name: "Priya Rao" }
const clients = [
    { id: "c1", name: "Atlas", deleteRequest: false, assignedAdmin: admin },
    { id: "c2", name: "Bolt", deleteRequest: false, assignedAdmin: null },
    { id: "c3", name: "Crest", deleteRequest: false, assignedAdmin: null },
]
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
vi.mock("./use-app-data", async (orig) => ({ ...(await orig<object>()), useAppData: () => ({ clients, projects: [], tasks: [], users: [{ ...admin, role: "CLIENT_ADMIN" }] }) }))
const api = vi.hoisted(() => ({ forceDeleteClient: vi.fn(), deleteClientBySuperAdmin: vi.fn() }))
vi.mock("@/api/clientApi", async (orig) => ({ ...(await orig<object>()), forceDeleteClient: api.forceDeleteClient, deleteClientBySuperAdmin: api.deleteClientBySuperAdmin }))
// Run deletes straight away instead of after the Undo window
vi.mock("./toaster", async (orig) => ({ ...(await orig<object>()), scheduleDelete: ({ commit }: { commit: () => unknown }) => commit() }))

const { DeleteClientForm } = await import("./danger-form")
// FormModal focuses its first text field 80 ms after opening; let that happen before typing
const open = async (clientId: string) => {
    render(<DeleteClientForm data={{ clientId }} onClose={vi.fn()} closing={false} />)
    await new Promise((r) => setTimeout(r, 100))
}
const typeName = (name: string) => userEvent.type(screen.getByPlaceholderText(name), name)
const deleteBtn = () => screen.getByRole("button", { name: /Delete client/ })

beforeEach(() => { api.forceDeleteClient.mockReset().mockResolvedValue(undefined) })

describe("DeleteClientForm — the client admin", () => {
    it("🟢 only needs the client's name; the admin keeps their role", async () => {
        await open("c1")
        expect(screen.queryByRole("button", { name: "Make them a User" })).not.toBeInTheDocument()
        expect(screen.getByText("Priya Rao stays a client admin, with no client")).toBeInTheDocument()
        await typeName("Atlas")
        await userEvent.click(deleteBtn())
        expect(api.forceDeleteClient).toHaveBeenCalledWith("c1")
    })

    it("🟢 a client without an admin only needs its name", async () => {
        await open("c2")
        await typeName("Bolt")
        await userEvent.click(deleteBtn())
        expect(api.forceDeleteClient).toHaveBeenCalledWith("c2")
    })
})
