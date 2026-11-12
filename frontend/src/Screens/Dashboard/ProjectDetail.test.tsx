import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"

const project = { id: "p1", name: "Portal", status: "IN_PROGRESS", dueDate: null, client: { id: "c1", name: "Atlas" }, user: [{ id: "u1", name: "Ravi Shah", email: "r@x.io" }] }
vi.mock("react-redux", () => ({ useSelector: (sel: (s: any) => unknown) => sel({ projects: { loading: false } }) }))
vi.mock("@/components/forms/use-app-data", async (orig) => ({
    ...(await orig<object>()),
    useAppData: () => ({ role: "CLIENT_ADMIN", users: [], projects: [project], tasks: [], tasksLoaded: true }),
}))
vi.mock("@/components/forms/task-actions", () => ({ useTaskActions: () => ({ toggleResolved: vi.fn() }) }))
const openForm = vi.hoisted(() => vi.fn())
vi.mock("@/components/forms/forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => openForm }))

const { ProjectDetail } = await import("./ProjectDetail")
const mount = () => render(<MemoryRouter initialEntries={["/projects/p1"]}><Routes><Route path="/projects/:id" element={<ProjectDetail />} /></Routes></MemoryRouter>)

describe("ProjectDetail — team (PRJ-02)", () => {
    it("🟢 one Manage team entry point, no separate Add member", async () => {
        mount()
        expect(screen.queryByRole("button", { name: /Add member/ })).not.toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: /Manage team/ }))
        expect(openForm).toHaveBeenCalledWith("team", { projectId: "p1" })
    })

    it("🔴 the More menu doesn't repeat it", async () => {
        mount()
        await userEvent.click(screen.getByRole("button", { name: "More project actions" }))
        expect(screen.getAllByText(/Manage team/)).toHaveLength(1)
    })
})
