import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

vi.mock("@/components/forms/use-app-data", () => ({
    useAppData: () => ({ profile: { id: "u1", name: "Ada Admin", role: "SUPER_ADMIN" }, users: [], clients: [], projects: [], tasks: [], tasksLoaded: true }),
    openTaskCount: () => 0,
}))
vi.mock("@/api/activityApi", () => ({ getActivity: async () => [] }))
vi.mock("@/components/forms/task-actions", () => ({ useTaskActions: () => ({ toggleResolved: vi.fn() }) }))

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
