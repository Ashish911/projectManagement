import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

const own = { id: "c1", name: "Atlas", email: "ops@atlas.io", phone: "+61412345678", deleteRequest: false, assignedAdmin: { id: "ca", name: "Cara Client" }, createdAt: null }
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: (sel: (s: any) => unknown) => sel({ clients: { loading: false, error: null, activeFilter: null } }) }))
const app = vi.hoisted(() => ({ role: "CLIENT_ADMIN", clients: [] as object[], users: [] as object[], projects: [] as object[] }))
vi.mock("@/components/forms/use-app-data", async (orig) => ({
    ...(await orig<object>()),
    useAppData: () => ({ profile: { id: app.role === "SUPER_ADMIN" ? "sa" : "ca", role: app.role }, clients: app.clients, users: app.users, projects: app.projects, tasks: [] }),
}))
const openForm = vi.hoisted(() => vi.fn())
vi.mock("@/components/forms/forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => openForm }))
const api = vi.hoisted(() => ({ getMyClient: vi.fn(), assignAdmin: vi.fn() }))
vi.mock("@/api/clientApi", async (orig) => ({ ...(await orig<object>()), getMyClient: api.getMyClient, assignAdmin: api.assignAdmin }))

const { Clients } = await import("./Clients")

describe("Clients — a client admin's own client (DASH-03)", () => {
    it("🟢 shows their client even before it has any projects", async () => {
        api.getMyClient.mockResolvedValue(own)
        render(<MemoryRouter><Clients /></MemoryRouter>)
        expect(await screen.findByRole("heading", { name: "Atlas" })).toBeInTheDocument()
    })
})

describe("Clients — detail panel layout (CLI-01)", () => {
    it("🟢 sections with headings, and contact details as label/value pairs", async () => {
        api.getMyClient.mockResolvedValue(own)
        render(<MemoryRouter><Clients /></MemoryRouter>)
        const panel = (await screen.findByRole("heading", { name: "Atlas" })).closest("aside")!
        expect(within(panel).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Contact", "Client admin", "At a glance", "Projects"])
        const contact = within(panel).getByRole("definition", { name: "Email" })
        expect(contact).toHaveTextContent("ops@atlas.io")
        expect(within(panel).getByRole("definition", { name: "Phone" })).toHaveTextContent("+61 412 345 678")
    })
})

describe("Clients — preview panel, super admin", () => {
    const other = { id: "c2", name: "Bluebird", email: null, phone: null, deleteRequest: false, assignedAdmin: { id: "busy", name: "Busy Admin" }, createdAt: null }
    beforeEach(() => {
        app.role = "SUPER_ADMIN"
        app.clients = [own, other]
        app.users = [
            { id: "ca", name: "Cara Client", email: "cara@x.io", role: "CLIENT_ADMIN" },
            { id: "dev", name: "Dev Admin", email: "dev@x.io", role: "CLIENT_ADMIN" },
            { id: "busy", name: "Busy Admin", email: "busy@x.io", role: "CLIENT_ADMIN" },
            { id: "u", name: "Uma User", email: "uma@x.io", role: "USER" },
        ]
        app.projects = [{ id: "p1", name: "Portal", status: "IN_PROGRESS", client: { id: "c1", name: "Atlas" }, user: [] }]
        openForm.mockReset()
        api.assignAdmin.mockReset().mockResolvedValue({ ...own, assignedAdmin: { id: "dev", name: "Dev Admin" } })
    })
    afterEach(() => { app.role = "CLIENT_ADMIN"; app.clients = []; app.users = []; app.projects = [] })

    const panel = () => screen.getByRole("heading", { name: "Atlas", level: 2 }).closest("aside")!

    it("🟢 the client admin field picks inline, in the card, not in a dialog", async () => {
        render(<MemoryRouter><Clients /></MemoryRouter>)
        await userEvent.click(within(panel()).getByRole("button", { name: /Cara Client/ }))
        const names = screen.getAllByRole("option").map((o) => o.textContent)
        expect(names.some((n) => n?.includes("Dev Admin"))).toBe(true)
        expect(names.some((n) => n?.includes("Busy Admin"))).toBe(false) // Runs another client
        expect(names.some((n) => n?.includes("Uma User"))).toBe(false) // Not a client admin
        await act(async () => { await userEvent.click(screen.getByRole("option", { name: /Dev Admin/ })) })
        expect(api.assignAdmin).toHaveBeenCalledWith({ id: "c1", assignedAdmin: "dev" })
        expect(openForm).not.toHaveBeenCalled()
    })

    it("🟢 promoting someone else still goes through the client dialog", async () => {
        render(<MemoryRouter><Clients /></MemoryRouter>)
        await userEvent.click(within(panel()).getByRole("button", { name: /Cara Client/ }))
        await userEvent.click(screen.getByRole("option", { name: /Promote someone/ }))
        expect(openForm).toHaveBeenCalledWith("client", { clientId: "c1" })
        expect(api.assignAdmin).not.toHaveBeenCalled()
    })

    it("🟢 project rows stay inside the card", () => {
        render(<MemoryRouter><Clients /></MemoryRouter>)
        const row = within(panel()).getByRole("button", { name: /Portal/ })
        expect(row.parentElement!.className).not.toMatch(/-mx-/)
    })
})

