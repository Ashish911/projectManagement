import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useLocation } from "react-router-dom"

const projects = [{ id: "p1", name: "Portal", user: [] }, { id: "p2", name: "App", user: [] }]
const task = (id: string, project: { id: string; name: string }, o = {}) => ({
    id, title: id, priority: "NORMAL", currentStatus: "NEW", deadline: null, assignedTo: null, createdBy: null, project, ...o,
})
const app = vi.hoisted(() => ({ loaded: true }))
const tasks = [task("Fix login", projects[0], { priority: "HIGH" }), task("Ship app", projects[1], { priority: "URGENT" }), task("Write docs", projects[0])]
vi.mock("@/components/forms/use-app-data", async (orig) => ({
    ...(await orig<object>()),
    useAppData: () => ({ profile: { id: "me" }, role: "SUPER_ADMIN", tasks, projects, tasksLoaded: app.loaded }),
}))
vi.mock("@/components/forms/task-actions", () => ({ useTaskActions: () => ({ setStatus: vi.fn(), toggleResolved: vi.fn() }) }))
vi.mock("@/components/forms/forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => vi.fn() }))

const { Tasks } = await import("./Tasks")

function Where() {
    const l = useLocation()
    return <output aria-label="url">{l.search}</output>
}
const mount = (url = "/tasks") => render(<MemoryRouter initialEntries={[url]}><Tasks /><Where /></MemoryRouter>)
const titles = () => screen.getAllByText(/^(Fix login|Ship app|Write docs)$/).map((e) => e.textContent)

describe("Tasks — filter and sort", () => {
    it("🟢 a shared link opens with its project filter and sort", () => {
        mount("/tasks?projects=p1&sort=priority")
        expect(titles()).toEqual(["Fix login", "Write docs"])
    })

    it("🟢 picking a project filters the board and updates the URL", async () => {
        mount()
        await userEvent.click(screen.getByRole("button", { name: /All projects/ }))
        await userEvent.click(within(screen.getByRole("listbox")).getByText("App"))
        expect(titles()).toEqual(["Ship app"])
        expect(screen.getByLabelText("url")).toHaveTextContent("?projects=p2")
    })

    it("🟢 sorting is kept in the URL", async () => {
        mount()
        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort tasks" }), "priority")
        expect(titles()).toEqual(["Ship app", "Fix login", "Write docs"])
        expect(screen.getByLabelText("url")).toHaveTextContent("?sort=priority")
    })

    it("🟢 the list can be grouped by project", async () => {
        mount("/tasks?group=project")
        await userEvent.click(screen.getByRole("button", { name: "List" }))
        expect(screen.getByRole("heading", { name: /Portal/ })).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: /App/ })).toBeInTheDocument()
    })
})

describe("Tasks — loading", () => {
    afterEach(() => { app.loaded = true })
    it("🟢 shows a board skeleton while tasks load", () => {
        app.loaded = false
        mount()
        expect(screen.getByRole("status", { name: "Loading tasks" })).toBeInTheDocument()
    })
})
