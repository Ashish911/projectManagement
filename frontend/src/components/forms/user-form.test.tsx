import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { User } from "@/types/userTypes"

const me = { id: "me", name: "Ada Admin", email: "ada@x.io", role: "SUPER_ADMIN", status: "ACTIVE" } as User
const users = [
    me,
    { id: "s2", name: "Sam Super", email: "sam@x.io", role: "SUPER_ADMIN", status: "ACTIVE" },
    { id: "u1", name: "Ravi Shah", email: "r@x.io", role: "USER", status: "ACTIVE" },
] as User[]
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
const api = vi.hoisted(() => ({ updateUser: vi.fn(), changeUserRoles: vi.fn() }))
vi.mock("@/api/userApi", async (orig) => ({ ...(await orig<object>()), updateUser: api.updateUser, changeUserRoles: api.changeUserRoles }))
vi.mock("./toaster", async (orig) => ({ ...(await orig<object>()), toast: vi.fn() }))
vi.mock("./use-app-data", async (orig) => ({ ...(await orig<object>()), useAppData: () => ({ profile: me, users, clients: [], projects: [], tasks: [] }) }))

const { UserForm } = await import("./user-form")
const open = (userId: string) => render(<UserForm data={{ userId }} onClose={vi.fn()} closing={false} />)

describe("UserForm — protected accounts", () => {
    it("🔴 another super admin opens view-only", () => {
        open("s2")
        expect(screen.getByText("Super admin accounts are view-only.")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument()
        expect(screen.getByDisplayValue("Sam Super")).toBeDisabled()
    })

    it("🔴 your own account points you to Edit profile", () => {
        open("me")
        expect(screen.getByText(/This is you\. Change your own details from Edit profile/)).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
    })

    it("🟢 a regular user can still be edited", () => {
        open("u1")
        expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
        expect(screen.getByDisplayValue("Ravi Shah")).toBeEnabled()
    })

    it("🔴 changing someone's role asks for a reason, and sends it", async () => {
        api.updateUser.mockResolvedValue(users[2])
        api.changeUserRoles.mockResolvedValue([{ ...users[2], role: "SUPER_ADMIN" }])
        open("u1")
        await new Promise((r) => setTimeout(r, 100)) // FormModal's open-focus
        await userEvent.click(screen.getByRole("radio", { name: /Super admin/ }))
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
        expect(await screen.findByText("Say why their role is changing")).toBeInTheDocument()
        expect(api.changeUserRoles).not.toHaveBeenCalled()
        await userEvent.type(screen.getByPlaceholderText("Why is their role changing?"), "Covers ops")
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
        expect(api.changeUserRoles).toHaveBeenCalledWith(["u1"], "SUPER_ADMIN", null, "Covers ops")
    })
})
