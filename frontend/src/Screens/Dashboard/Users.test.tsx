import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { User } from "@/types/userTypes"

const me = { id: "me", name: "Ada Admin", email: "ada@x.io", role: "SUPER_ADMIN", status: "ACTIVE" } as User
const users: User[] = [
    me,
    { id: "u1", name: "Ravi Shah", email: "ravi@x.io", role: "USER", status: "ACTIVE" } as User,
    { id: "u2", name: "Mia Chen", email: "mia@x.io", role: "USER", status: "LOCKED" } as User,
    { id: "u3", name: "Raj Patel", email: "raj@x.io", role: "CLIENT_ADMIN", status: "ACTIVE" } as User,
]
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: () => ({ loading: false, error: null, roleFilter: null }) }))
vi.mock("@/components/forms/use-app-data", () => ({
    useAppData: () => ({ profile: me, users, clients: [], projects: [], tasks: [] }),
    openTaskCount: () => 0,
}))
const openForm = vi.hoisted(() => vi.fn())
vi.mock("@/components/forms/forms-context", async (orig) => ({ ...(await orig<object>()), useForms: () => openForm }))

const { Users } = await import("./Users")

const selectedCount = () => screen.getByText("selected").previousElementSibling?.textContent
const selectAll = () => userEvent.click(screen.getByRole("checkbox", { name: "Select all" }))

beforeEach(() => openForm.mockReset())

describe("Users selection", () => {
    it("🟢 select all picks everyone except yourself", async () => {
        render(<Users />)
        await selectAll()
        expect(selectedCount()).toBe("3")
        await userEvent.click(screen.getByRole("button", { name: "Change role" }))
        expect(openForm).toHaveBeenCalledWith("bulk-role", { userIds: ["u1", "u2", "u3"] })
    })

    it("🔴 you can't select yourself", () => {
        render(<Users />)
        expect(screen.getByRole("checkbox", { name: "Select Ada Admin" })).toBeDisabled()
    })

    it("🟢 a single row toggles on and off, and the header shows mixed", async () => {
        render(<Users />)
        await userEvent.click(screen.getByRole("checkbox", { name: "Select Mia Chen" }))
        expect(selectedCount()).toBe("1")
        expect(screen.getByRole("checkbox", { name: "Select all" })).toHaveAttribute("aria-checked", "mixed")
        await userEvent.click(screen.getByRole("checkbox", { name: "Select Mia Chen" }))
        expect(selectedCount()).toBe("0")
    })

    it("🔴 after select all, searching keeps only the visible people selected", async () => {
        render(<Users />)
        await selectAll()
        await userEvent.type(screen.getByPlaceholderText(/search/i), "ra")
        expect(selectedCount()).toBe("2") // Ravi and Raj
        await userEvent.click(screen.getByRole("button", { name: "Unlock" }))
        expect(openForm).toHaveBeenCalledWith("bulk-unlock", { userIds: ["u1", "u3"] })
    })

    it("🟢 clear selection empties it", async () => {
        render(<Users />)
        await selectAll()
        await userEvent.click(screen.getByRole("button", { name: "Clear selection" }))
        expect(selectedCount()).toBe("0")
        expect(within(screen.getByRole("table")).getByRole("checkbox", { name: "Select all" })).toHaveAttribute("aria-checked", "false")
    })

    it("🔴 switching tabs clears the selection", async () => {
        render(<Users />)
        await selectAll()
        await userEvent.click(screen.getByRole("tab", { name: /client admins/i }))
        expect(selectedCount()).toBe("0")
        await userEvent.click(screen.getByRole("checkbox", { name: "Select Raj Patel" }))
        expect(selectedCount()).toBe("1")
    })
})
