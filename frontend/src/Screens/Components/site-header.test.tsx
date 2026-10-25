import { act, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { Notification } from "@/api/notificationApi"

const api = vi.hoisted(() => ({ push: null as null | ((n: Notification) => void), getNotifications: vi.fn() }))
vi.mock("@/api/notificationApi", () => ({
    getNotifications: api.getNotifications,
    subscribeToNotifications: (cb: (n: Notification) => void) => { api.push = cb; return () => {} },
}))
vi.mock("@/api/ws", () => ({ onReconnect: () => () => {} }))
const toast = vi.hoisted(() => vi.fn())
vi.mock("@/components/forms/toaster", () => ({ toast }))
vi.mock("react-redux", () => ({ useSelector: () => undefined }))
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ state: "expanded", toggleSidebar: () => {} }) }))
vi.mock("@/components/hooks/use-theme", () => ({ useTheme: () => ({ theme: "LIGHT", toggle: () => {} }) }))

const n = (id: string, status: Notification["status"] = "UNREAD"): Notification => ({ id, content: `Message ${id}`, status, createdAt: new Date().toISOString() })

async function renderHeader() {
    const openForm = vi.fn()
    const { SiteHeader } = await import("./site-header")
    const { FormsContext } = await import("@/components/forms/forms-context") // Same module instance as the header's
    render(
        <MemoryRouter initialEntries={["/dashboard"]}>
            <FormsContext.Provider value={openForm}><SiteHeader /></FormsContext.Provider>
        </MemoryRouter>,
    )
    await act(async () => { await Promise.resolve() })
    return openForm
}

beforeEach(() => {
    vi.resetModules()
    toast.mockReset()
    api.getNotifications.mockReset().mockResolvedValue([n("1"), n("2", "READ")])
})

describe("SiteHeader notifications", () => {
    it("🟢 the bell shows the unread count from the live store", async () => {
        await renderHeader()
        expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeInTheDocument()
        act(() => api.push!(n("3")))
        expect(screen.getByRole("button", { name: "Notifications, 2 unread" })).toBeInTheDocument()
    })

    it("🟢 a pushed notification shows a toast whose Open action opens the sheet", async () => {
        const openForm = await renderHeader()
        act(() => api.push!(n("3")))
        expect(toast).toHaveBeenCalledTimes(1)
        const t = toast.mock.calls[0][0]
        expect(t.text).toBe("Message 3")
        expect(t.action.label).toBe("Open")
        t.action.run()
        expect(openForm).toHaveBeenCalledWith("notifications")
    })

    it("🔴 the initial load does not toast", async () => {
        await renderHeader()
        expect(toast).not.toHaveBeenCalled()
    })
})
