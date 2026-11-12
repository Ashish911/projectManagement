import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const state = vi.hoisted(() => ({ role: "USER" as string | null }))
vi.mock("react-redux", () => ({ useSelector: (pick: (s: unknown) => unknown) => pick({ profile: { profile: state.role ? { role: state.role } : null } }) }))
const navigate = vi.hoisted(() => vi.fn())
vi.mock("react-router-dom", async (orig) => ({ ...(await orig<object>()), useNavigate: () => navigate }))

const { Guide } = await import("./Guide")

const topicHeadings = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
const as = (role: string | null) => { state.role = role; return render(<Guide />) }

beforeEach(() => navigate.mockReset())

describe("Guide", () => {
    it("🟢 a USER gets their own guide, without admin topics", () => {
        as("USER")
        expect(screen.getByText(/You get the work done/)).toBeInTheDocument()
        expect(topicHeadings()).toEqual(expect.arrayContaining(["Tasks", "Projects", "Notifications"]))
        expect(topicHeadings()).not.toContain("Users")
        expect(topicHeadings()).not.toContain("Clients")
    })

    it("🟢 a CLIENT_ADMIN sees only their side of a client deletion", () => {
        as("CLIENT_ADMIN")
        const clients = screen.getByRole("region", { name: "Clients" })
        expect(within(clients).getByText("Waiting for a super admin to approve")).toBeInTheDocument()
        expect(within(clients).queryByText(/Approve deletion/)).not.toBeInTheDocument()
    })

    it("🟢 a SUPER_ADMIN sees how to decide a deletion, with no waiting note", () => {
        as("SUPER_ADMIN")
        const clients = screen.getByRole("region", { name: "Clients" })
        expect(within(clients).getAllByText(/Approve deletion/).length).toBeGreaterThan(0)
        expect(within(clients).queryByText(/Waiting for/)).not.toBeInTheDocument()
        expect(topicHeadings()).toContain("Users")
    })

    it("🟢 search narrows the topics", async () => {
        as("USER")
        await userEvent.type(screen.getByPlaceholderText("Search the guide"), "comment")
        expect(topicHeadings()).toContain("Task details, sub-tasks and comments")
        expect(topicHeadings()).not.toContain("Your account")
    })

    it("🔴 a search with no match says so", async () => {
        as("USER")
        await userEvent.type(screen.getByPlaceholderText("Search the guide"), "zzzz")
        expect(screen.getByText("Nothing in the guide matches “zzzz”")).toBeInTheDocument()
    })

    it("🟢 a topic's link opens that page", async () => {
        as("USER")
        await userEvent.click(within(screen.getByRole("region", { name: "Tasks" })).getByRole("button", { name: /Open tasks/ }))
        expect(navigate).toHaveBeenCalledWith("/tasks")
    })

    it("🔴 an unknown role falls back to the USER guide", () => {
        as("SOMETHING_ELSE")
        expect(topicHeadings()).not.toContain("Users")
        expect(topicHeadings()).toContain("Tasks")
    })

    it("🔴 waits for the profile before picking a guide", () => {
        as(null)
        expect(screen.getByText("Loading guide…")).toBeInTheDocument()
        expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0)
    })
})
