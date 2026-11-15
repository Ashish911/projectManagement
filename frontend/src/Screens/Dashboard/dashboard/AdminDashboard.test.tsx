import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"

const data = vi.hoisted(() => ({ clients: [] as object[], role: "SUPER_ADMIN", projects: [] as object[], loaded: true }))
vi.mock("@/components/forms/use-app-data", async (orig) => ({
    ...(await orig<object>()),
    useAppData: () => ({ profile: { id: "u1", name: "Ada Admin", role: data.role }, role: data.role, users: [], clients: data.clients, projects: data.projects, tasks: [], tasksLoaded: data.loaded, loaded: { users: data.loaded, clients: data.loaded, projects: data.loaded, tasks: data.loaded } }),
    openTaskCount: () => 0,
}))
const dispatch = vi.hoisted(() => vi.fn())
vi.mock("react-redux", async (orig) => ({ ...(await orig<object>()), useDispatch: () => dispatch }))
vi.mock("@/api/activityApi", () => ({ getActivity: async () => [] }))
vi.mock("@/components/forms/task-actions", () => ({ useTaskActions: () => ({ toggleResolved: vi.fn() }), useTaskPending: () => false }))

const { AdminDashboard } = await import("./AdminDashboard")

const mount = () => render(<MemoryRouter><AdminDashboard /></MemoryRouter>)
const pressed = () => screen.getByRole("group").querySelector("[aria-pressed=true]")?.textContent

describe("AdminDashboard range", () => {
    it("🟢 defaults to 30d", () => {
        mount()
        expect(pressed()).toBe("30d")
    })

    it("🟢 the chosen range survives a remount (reload)", async () => {
        const { unmount } = mount()
        await userEvent.click(screen.getByRole("button", { name: "90d" }))
        expect(pressed()).toBe("90d")
        unmount()
        mount()
        expect(pressed()).toBe("90d")
        expect(localStorage.getItem("pm-dash-range")).toBe("90d") // Same plain format as before
    })

    it("🔴 an unknown stored range falls back to 30d", () => {
        localStorage.setItem("pm-dash-range", "365d")
        mount()
        expect(pressed()).toBe("30d")
    })
})

describe("AdminDashboard — needs a decision (DASH-01)", () => {
    const c = (id: string, name: string, createdAt: string, o = {}) => ({ id, name, createdAt, deleteRequest: false, assignedAdmin: null, ...o })
    beforeEach(() => {
        dispatch.mockReset()
        data.clients = [
            c("c1", "Newest", "2026-11-01T00:00:00Z"),
            c("c2", "Oldest", "2026-01-01T00:00:00Z"),
            c("c3", "Middle", "2026-06-01T00:00:00Z"),
            c("c4", "Wants out", "2026-09-01T00:00:00Z", { deleteRequest: true, assignedAdmin: { id: "a", name: "Priya" } }),
        ]
    })
    afterEach(() => { data.clients = [] })

    it("🟢 shows the count but only the two that need it most: deletion requests, then oldest", () => {
        mount()
        expect(screen.getByText("Needs decision: 4")).toBeInTheDocument()
        const items = screen.getAllByRole("listitem").map((li) => li.textContent)
        expect(items).toHaveLength(2)
        expect(items[0]).toContain("Wants out requested deletion")
        expect(items[1]).toContain("Oldest has no client admin")
    })

    it("🟢 View all opens Clients on the needs-attention tab", async () => {
        render(<MemoryRouter initialEntries={["/dashboard"]}><Routes>
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/clients" element={<h1>Clients page</h1>} />
        </Routes></MemoryRouter>)
        await userEvent.click(screen.getByRole("button", { name: "View all 4" }))
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: "unassigned" }))
        expect(screen.getByRole("heading", { name: "Clients page" })).toBeInTheDocument()
    })
})

describe("AdminDashboard — a client admin", () => {
    const project = (id: string, client: string, canManage: boolean) => ({ id, name: id, status: "IN_PROGRESS", dueDate: null, canManage, client: { id: client, name: client }, user: [] })
    afterEach(() => { data.role = "SUPER_ADMIN"; data.clients = []; data.projects = [] })

    it("🔴 with no client, who is only on other clients' teams, can't create tasks or projects", () => {
        data.role = "CLIENT_ADMIN"
        data.projects = [project("Portal", "Bolt", false)]
        mount()
        expect(screen.queryByRole("button", { name: /New task/ })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /New project/ })).not.toBeInTheDocument()
    })

    it("🟢 with a client, creates both, and the project panel is titled with their own client", () => {
        data.role = "CLIENT_ADMIN"
        data.clients = [{ id: "Atlas", name: "Atlas", deleteRequest: false, assignedAdmin: { id: "u1" } }]
        data.projects = [project("Portal", "Bolt", false), project("Site", "Atlas", true)]
        mount()
        expect(screen.getByRole("button", { name: /New task/ })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /New project/ })).toBeInTheDocument()
        expect(screen.getByText("Atlas")).toBeInTheDocument()
    })
})

describe("AdminDashboard — loading (LDR-01)", () => {
    afterEach(() => { data.loaded = true })

    it("🟢 KPI cards show skeletons, not zeros, until their lists load", () => {
        data.loaded = false
        mount()
        for (const label of ["Users", "Clients", "Active projects", "Overdue tasks"])
            expect(screen.getByRole("status", { name: `Loading ${label}` })).toBeInTheDocument()
    })

    it("🔴 loaded lists show their numbers", () => {
        mount()
        expect(screen.queryByRole("status", { name: "Loading Users" })).not.toBeInTheDocument()
    })
})

