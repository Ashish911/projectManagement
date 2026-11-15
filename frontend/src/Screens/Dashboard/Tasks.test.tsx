import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useLocation } from "react-router-dom"

const projects = [{ id: "p1", name: "Portal", user: [] }, { id: "p2", name: "App", user: [] }]
const task = (id: string, project: { id: string; name: string }, o = {}) => ({
    id, title: id, priority: "NORMAL", currentStatus: "NEW", deadline: null, assignedTo: null, createdBy: null, project, ...o,
})
const app = vi.hoisted(() => ({ loaded: true, role: "SUPER_ADMIN", projects: null as null | object[] }))
const tasks = [task("Fix login", projects[0], { priority: "HIGH", subTaskStats: { done: 0, total: 1 } }), task("Ship app", projects[1], { priority: "URGENT" }), task("Write docs", projects[0])]
vi.mock("@/components/forms/use-app-data", async (orig) => ({
    ...(await orig<object>()),
    useAppData: () => ({ profile: { id: "me" }, role: app.role, tasks, projects: app.projects ?? projects, tasksLoaded: app.loaded }),
}))
vi.mock("@/components/forms/task-actions", () => ({ useTaskActions: () => ({ setStatus: vi.fn(), toggleResolved: vi.fn() }), useTaskPending: () => false }))
const subs = vi.hoisted(() => ({ getSubTasks: vi.fn() }))
vi.mock("@/api/subTaskApi", () => subs)
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
    it("🟢 expanding a task shows a skeleton while its subtasks load (LDR-01)", async () => {
        subs.getSubTasks.mockReturnValue(new Promise(() => {}))
        mount()
        await userEvent.click(screen.getByRole("button", { name: "List" }))
        await userEvent.click(screen.getByRole("button", { name: "Show subtasks" }))
        expect(screen.getByRole("status", { name: "Loading subtasks" })).toBeInTheDocument()
    })

    it("🟢 shows a board skeleton while tasks load", () => {
        app.loaded = false
        mount()
        expect(screen.getByRole("status", { name: "Loading tasks" })).toBeInTheDocument()
    })
})

describe("Tasks — a client admin", () => {
    afterEach(() => { app.role = "SUPER_ADMIN"; app.projects = null })

    it("🔴 who only sits on other clients' teams can't add tasks", () => {
        app.role = "CLIENT_ADMIN"
        app.projects = projects.map((p) => ({ ...p, canManage: false }))
        mount()
        expect(screen.queryByRole("button", { name: /New task/ })).not.toBeInTheDocument()
    })

    it("🟢 who runs a project can add tasks", () => {
        app.role = "CLIENT_ADMIN"
        app.projects = [{ ...projects[0], canManage: true }, { ...projects[1], canManage: false }]
        mount()
        expect(screen.getByRole("button", { name: /New task/ })).toBeInTheDocument()
    })
})
