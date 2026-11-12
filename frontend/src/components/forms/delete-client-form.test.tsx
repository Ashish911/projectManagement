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
    it("🔴 can't delete until you choose what happens to the admin and why", async () => {
        await open("c1")
        await typeName("Atlas")
        expect(deleteBtn()).toBeDisabled()
        await userEvent.click(screen.getByRole("button", { name: "Make them a User" }))
        expect(deleteBtn()).toBeDisabled()
        await userEvent.type(screen.getByPlaceholderText("Why? Saved in Activity"), "Contract ended")
        expect(deleteBtn()).toBeEnabled()
    })

    it("🟢 demoting sends the plan with the delete", async () => {
        await open("c1")
        await userEvent.click(screen.getByRole("button", { name: "Make them a User" }))
        await userEvent.type(screen.getByPlaceholderText("Why? Saved in Activity"), "Contract ended")
        await typeName("Atlas")
        await userEvent.click(deleteBtn())
        expect(api.forceDeleteClient).toHaveBeenCalledWith("c1", { adminAction: "DEMOTE", reassignTo: null, reason: "Contract ended" })
    })

    it("🟢 reassigning picks a client that has no admin", async () => {
        await open("c1")
        await userEvent.click(screen.getByRole("button", { name: "Move to another client" }))
        await userEvent.click(screen.getByRole("button", { name: /Choose client/ }))
        expect(screen.queryByText("Atlas", { selector: "[role=option] *" })).not.toBeInTheDocument()
        await userEvent.click(await screen.findByText("Crest"))
        await userEvent.type(screen.getByPlaceholderText("Why? Saved in Activity"), "Moving to Crest")
        await typeName("Atlas")
        await userEvent.click(deleteBtn())
        expect(api.forceDeleteClient).toHaveBeenCalledWith("c1", { adminAction: "REASSIGN", reassignTo: "c3", reason: "Moving to Crest" })
    })

    it("🟢 a client without an admin only needs its name", async () => {
        await open("c2")
        expect(screen.queryByRole("button", { name: "Make them a User" })).not.toBeInTheDocument()
        await typeName("Bolt")
        await userEvent.click(deleteBtn())
        expect(api.forceDeleteClient).toHaveBeenCalledWith("c2", undefined)
    })
})
