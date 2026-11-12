import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const state = { profile: { profile: { id: "me", name: "Ada Admin", email: "a@x.io", number: "0400000000", dob: "", gender: "FEMALE" } }, preference: { preference: null } }
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: (sel: (s: any) => unknown) => sel(state) }))
const api = vi.hoisted(() => ({ updateProfile: vi.fn() }))
vi.mock("@/api/userApi", async (orig) => ({ ...(await orig<object>()), updateProfile: api.updateProfile }))

const { default: ProfileContent } = await import("./profile-content")

describe("Account page — profile", () => {
    beforeEach(() => api.updateProfile.mockReset().mockResolvedValue(state.profile.profile))

    it("🟢 shows the phone formatted and saves an older number in E.164", async () => {
        render(<ProfileContent />)
        expect(screen.getByDisplayValue("+61 400 000 000")).toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: /Edit/ }))
        await userEvent.click(screen.getByRole("button", { name: "Save Changes" }))
        expect(api.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ number: "+61400000000" }))
    })

    it("🔴 an invalid phone blocks saving with a message", async () => {
        render(<ProfileContent />)
        await userEvent.click(screen.getByRole("button", { name: /Edit/ }))
        const phone = screen.getByRole("textbox", { name: "Phone" })
        await userEvent.clear(phone)
        await userEvent.type(phone, "123")
        expect(screen.getByText("Not a valid Australia number")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled()
    })
})

describe("Account page — date of birth (PROF-04)", () => {
    it("🟢 uses the shared date picker", async () => {
        render(<ProfileContent />)
        await userEvent.click(screen.getByRole("button", { name: /Edit/ }))
        expect(screen.getByRole("button", { name: /Choose a date/ })).toBeInTheDocument()
    })
})
