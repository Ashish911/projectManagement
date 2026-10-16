import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Notification } from "@/api/notificationApi"

const api = vi.hoisted(() => ({
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    markNotificationsRead: vi.fn(),
    deleteNotification: vi.fn(),
    deleteAllNotifications: vi.fn(),
    subscribeToNotifications: vi.fn(),
    push: null as null | ((n: Notification) => void),
}))
vi.mock("@/api/notificationApi", () => ({
    ...api,
    subscribeToNotifications: (cb: (n: Notification) => void) => { api.push = cb; return () => {} },
}))
vi.mock("@/api/ws", () => ({ onReconnect: () => () => {} }))
const toastError = vi.hoisted(() => vi.fn())
vi.mock("./toaster", () => ({ toastError }))

const n = (id: string, status: Notification["status"] = "UNREAD"): Notification => ({ id, content: `Message ${id}`, status, createdAt: new Date().toISOString() })

async function renderSheet() {
    vi.resetModules()
    const { NotificationsSheet } = await import("./notifications-sheet")
    render(<NotificationsSheet data={{}} onClose={() => {}} closing={false} />)
    await act(async () => { await Promise.resolve() })
    return screen.getByRole("dialog", { name: "Notifications" })
}

beforeEach(() => {
    Object.values(api).forEach((f) => typeof f === "function" && "mockReset" in f && f.mockReset())
    api.getNotifications.mockResolvedValue([n("1"), n("2"), n("3", "READ")])
    api.markAsRead.mockResolvedValue(undefined)
    api.markAllAsRead.mockResolvedValue(undefined)
    toastError.mockReset()
})

const unreadDots = (sheet: HTMLElement) => sheet.querySelectorAll("[data-unread=true]").length

describe("NotificationsSheet", () => {
    it("🟢 opening the sheet marks nothing read", async () => {
        await renderSheet()
        expect(api.markAsRead).not.toHaveBeenCalled()
        expect(api.markAllAsRead).not.toHaveBeenCalled()
        expect(api.markNotificationsRead).not.toHaveBeenCalled()
    })

    it("🟢 clicking an unread notification marks just that one read, optimistically", async () => {
        const sheet = await renderSheet()
        expect(unreadDots(sheet)).toBe(2)
        await userEvent.click(within(sheet).getByText("Message 1"))
        expect(api.markAsRead).toHaveBeenCalledTimes(1)
        expect(api.markAsRead).toHaveBeenCalledWith("1")
        expect(unreadDots(sheet)).toBe(1)
    })

    it("🔴 clicking a read notification sends nothing", async () => {
        const sheet = await renderSheet()
        await userEvent.click(within(sheet).getByText("Message 3"))
        expect(api.markAsRead).not.toHaveBeenCalled()
    })

    it("🟢 'Mark all read' is one request, not one per notification", async () => {
        const sheet = await renderSheet()
        await userEvent.click(within(sheet).getByRole("button", { name: /mark all read/i }))
        expect(api.markAllAsRead).toHaveBeenCalledTimes(1)
        expect(api.markAsRead).not.toHaveBeenCalled()
        expect(unreadDots(sheet)).toBe(0)
    })

    it("🔴 a failed mark-read rolls back and shows the error", async () => {
        api.markAsRead.mockRejectedValue(new Error("Server unavailable"))
        const sheet = await renderSheet()
        await userEvent.click(within(sheet).getByText("Message 1"))
        expect(unreadDots(sheet)).toBe(2)
        expect(toastError).toHaveBeenCalledWith("Server unavailable")
    })

    it("🟢 a notification pushed over the socket appears at the top without a refetch", async () => {
        const sheet = await renderSheet()
        const fetches = api.getNotifications.mock.calls.length
        act(() => api.push!(n("9")))
        expect(within(sheet).getAllByText(/^Message/)[0]).toHaveTextContent("Message 9")
        expect(unreadDots(sheet)).toBe(3)
        expect(api.getNotifications).toHaveBeenCalledTimes(fetches)
    })
})
