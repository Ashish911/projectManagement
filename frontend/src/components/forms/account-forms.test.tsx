import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

const profile = { id: "me", name: "Ada Admin", email: "admin@gmail.com", role: "SUPER_ADMIN", number: "+61412345678", dob: null, gender: "FEMALE" }
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
vi.mock("./use-app-data", () => ({ useAppData: () => ({ profile, users: [], projects: [], tasks: [] }) }))
vi.mock("@/components/hooks/use-theme", () => ({ useTheme: () => ({ theme: "LIGHT", toggle: vi.fn() }) }))
const api = vi.hoisted(() => ({ changePassword: vi.fn(), updateProfile: vi.fn() }))
vi.mock("@/api/userApi", async (orig) => ({ ...(await orig<object>()), changePassword: api.changePassword, updateProfile: api.updateProfile }))
const toast = vi.hoisted(() => vi.fn())
vi.mock("./toaster", async (orig) => ({ ...(await orig<object>()), toast }))

const { AccountMenu } = await import("./account-forms")

// FormModal focuses its first text field 80 ms after opening; let that happen before typing
const open = async () => {
    render(<MemoryRouter><AccountMenu onClose={vi.fn()} closing={false} /></MemoryRouter>)
    await new Promise((r) => setTimeout(r, 100))
}
const field = (label: string) => screen.getByLabelText(label)

async function fillPassword(current: string, next: string, confirm = next) {
    await userEvent.click(screen.getByText("Change password"))
    await userEvent.type(field("Current password"), current)
    await userEvent.type(field("New password"), next)
    await userEvent.type(field("Confirm new password"), confirm)
    await userEvent.click(screen.getByRole("button", { name: "Update password" }))
}

beforeEach(() => { api.changePassword.mockReset().mockResolvedValue({ message: "Password changed" }); toast.mockReset() })

describe("AccountMenu — change password", () => {
    it("🟢 changes the password and confirms with a toast", async () => {
        await open()
        await fillPassword("OldPass1!", "NewPass2@")
        expect(api.changePassword).toHaveBeenCalledWith("OldPass1!", "NewPass2@")
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ text: "Password changed" }))
    })

    it("🔴 refuses a new password that matches the current one", async () => {
        await open()
        await fillPassword("OldPass1!", "OldPass1!")
        expect(screen.getByText("Must be different from your current password")).toBeInTheDocument()
        expect(api.changePassword).not.toHaveBeenCalled()
    })

    it("🔴 refuses a confirmation that doesn't match", async () => {
        await open()
        await fillPassword("OldPass1!", "NewPass2@", "NewPass2#")
        expect(screen.getByText("Passwords don’t match")).toBeInTheDocument()
        expect(api.changePassword).not.toHaveBeenCalled()
    })

    it("🟢 shows a strength hint while typing the new password", async () => {
        await open()
        await userEvent.click(screen.getByText("Change password"))
        await userEvent.type(field("New password"), "abcdefgh")
        expect(screen.getByText(/Weak/)).toBeInTheDocument()
        await userEvent.type(field("New password"), "A1!")
        expect(screen.getByText(/Strong/)).toBeInTheDocument()
    })
})
