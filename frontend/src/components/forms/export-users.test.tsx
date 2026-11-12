import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { User } from "@/types/userTypes"

const users = [
    { id: "u1", name: "Ravi Shah", email: "r@x.io", role: "USER", status: "ACTIVE" },
    { id: "u2", name: "Mia Chen", email: "m@x.io", role: "USER", status: "ACTIVE" },
    { id: "u3", name: "Raj Patel", email: "j@x.io", role: "CLIENT_ADMIN", status: "ACTIVE" },
] as User[]
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
vi.mock("./use-app-data", async (orig) => ({ ...(await orig<object>()), useAppData: () => ({ users, clients: [], projects: [], tasks: [] }) }))

const { ExportUsersForm } = await import("./user-bulk-forms")
const preview = () => screen.getByText((_, el) => el?.tagName === "PRE").textContent ?? ""
const open = (data: object) => render(<ExportUsersForm data={data} onClose={vi.fn()} closing={false} />)

describe("ExportUsersForm — rows", () => {
    it("🟢 with a selection, defaults to the selected rows only", () => {
        open({ role: "all", userIds: ["u2"] })
        expect(screen.getByRole("button", { name: "Selected (1)" })).toHaveAttribute("aria-pressed", "true")
        expect(preview()).toContain("Mia Chen")
        expect(preview()).not.toContain("Ravi Shah")
    })

    it("🟢 can switch to all rows", async () => {
        open({ role: "all", userIds: ["u2"] })
        await userEvent.click(screen.getByRole("button", { name: "All (3)" }))
        expect(preview()).toContain("Ravi Shah")
    })

    it("🔴 without a selection there is no Selected option", () => {
        open({ role: "all" })
        expect(screen.queryByRole("button", { name: /Selected/ })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "All (3)" })).toHaveAttribute("aria-pressed", "true")
    })
})

describe("ExportUsersForm — columns", () => {
    const all = () => screen.getByRole("checkbox", { name: "All columns" })

    it("🟢 starts mixed, select all picks every column", async () => {
        open({ role: "all" })
        expect(all()).toHaveAttribute("aria-checked", "mixed")
        await userEvent.click(all())
        expect(all()).toHaveAttribute("aria-checked", "true")
        expect(screen.getByText(/9 of 9/)).toBeInTheDocument()
    })

    it("🔴 clicking again clears them all, and download is disabled", async () => {
        open({ role: "all" })
        await userEvent.click(all())
        await userEvent.click(all())
        expect(all()).toHaveAttribute("aria-checked", "false")
        expect(screen.getByRole("button", { name: /Download/ })).toBeDisabled()
    })
})
