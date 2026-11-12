import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

const own = { id: "c1", name: "Atlas", email: "ops@atlas.io", phone: "+61412345678", deleteRequest: false, assignedAdmin: { id: "ca", name: "Cara Client" }, createdAt: null }
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: (sel: (s: any) => unknown) => sel({ clients: { loading: false, error: null, activeFilter: null } }) }))
vi.mock("@/components/forms/use-app-data", async (orig) => ({
    ...(await orig<object>()),
    useAppData: () => ({ profile: { id: "ca", role: "CLIENT_ADMIN" }, clients: [], projects: [], tasks: [] }),
}))
vi.mock("@/components/forms/forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => vi.fn() }))
const api = vi.hoisted(() => ({ getMyClient: vi.fn() }))
vi.mock("@/api/clientApi", async (orig) => ({ ...(await orig<object>()), getMyClient: api.getMyClient }))

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
