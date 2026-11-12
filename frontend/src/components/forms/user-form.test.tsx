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
const api = vi.hoisted(() => ({ updateUser: vi.fn(), changeUserRoles: vi.fn(), createUser: vi.fn() }))
vi.mock("@/api/userApi", async (orig) => ({ ...(await orig<object>()), updateUser: api.updateUser, changeUserRoles: api.changeUserRoles, createUser: api.createUser }))
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

describe("UserForm — phone", () => {
    it("🟢 an invite sends the phone in E.164", async () => {
        api.createUser.mockReset().mockResolvedValue({ id: "n1", name: "Mina Lama", email: "mina@x.io" })
        render(<UserForm data={{}} onClose={vi.fn()} closing={false} />)
        await new Promise((r) => setTimeout(r, 100))
        await userEvent.type(screen.getByPlaceholderText("e.g. Mina Lama"), "Mina Lama")
        await userEvent.type(screen.getByPlaceholderText("name@company.com"), "mina@x.io")
        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Country code" }), "NP")
        await userEvent.type(screen.getByRole("textbox", { name: "Phone" }), "9801234567")
        await userEvent.click(screen.getByRole("button", { name: "Female" }))
        await userEvent.click(screen.getByRole("button", { name: "Send invite" }))
        expect(api.createUser).toHaveBeenCalledWith(expect.objectContaining({ number: "+9779801234567" }))
    })

    it("🔴 editing someone with no phone doesn't send an empty number", async () => {
        api.updateUser.mockReset().mockResolvedValue(users[2])
        open("u1")
        await new Promise((r) => setTimeout(r, 100))
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
        expect(api.updateUser).toHaveBeenCalledWith(expect.not.objectContaining({ number: expect.anything() }))
    })
})
