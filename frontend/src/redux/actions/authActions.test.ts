import { LOGOUT } from "../constants/authConstants"

const closeSocket = vi.hoisted(() => vi.fn())
vi.mock("@/api/ws", () => ({ closeSocket }))

const { logout } = await import("./authActions")

describe("logout", () => {
    it("🟢 removes the token, closes the live socket and dispatches LOGOUT", async () => {
        localStorage.setItem("token", "abc")
        const dispatch = vi.fn()
        await logout()(dispatch)
        expect(localStorage.getItem("token")).toBeNull()
        expect(closeSocket).toHaveBeenCalledTimes(1)
        expect(dispatch).toHaveBeenCalledWith({ type: LOGOUT })
    })
})
