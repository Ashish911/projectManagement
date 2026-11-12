import { act, renderHook } from "@testing-library/react"

const state = vi.hoisted(() => ({ profile: { profile: { id: "me", role: "SUPER_ADMIN" } as null | { id: string; role: string } } }))
const dispatch = vi.hoisted(() => vi.fn())
vi.mock("react-redux", () => ({ useDispatch: () => dispatch, useSelector: (sel: (s: any) => unknown) => sel(state) }))
vi.mock("@/redux/actions/tasksActions", () => ({ fetchAllTasks: (force: boolean) => ({ type: "tasks", force }) }))
vi.mock("@/redux/actions/projectsActions", () => ({ fetchProjects: (force: boolean) => ({ type: "projects", force }) }))
vi.mock("@/redux/actions/usersListActions", () => ({ fetchUsers: (force: boolean) => ({ type: "users", force }) }))
vi.mock("@/redux/actions/clientsActions", () => ({ fetchClients: (force: boolean) => ({ type: "clients", force }) }))
vi.mock("@/redux/actions/userActions", () => ({ fetchProfile: () => ({ type: "profile" }) }))
const notif = vi.hoisted(() => ({ push: null as null | ((n: { content: string }) => void) }))
vi.mock("@/hooks/use-notifications", () => ({ onNewNotification: (l: (n: { content: string }) => void) => { notif.push = l; return () => {} } }))

// A stand-in BroadcastChannel that delivers to the other instances, like separate tabs
class FakeChannel {
    static all: FakeChannel[] = []
    onmessage: ((e: { data: unknown }) => void) | null = null
    constructor() { FakeChannel.all.push(this) }
    postMessage(data: unknown) { FakeChannel.all.filter((c) => c !== this).forEach((c) => c.onmessage?.({ data })) }
    close() { FakeChannel.all = FakeChannel.all.filter((c) => c !== this) }
}
vi.stubGlobal("BroadcastChannel", FakeChannel)

const { useLiveRefresh, onActivityRefresh, scopesFor } = await import("./use-live-refresh")
const types = () => dispatch.mock.calls.map(([a]) => a.type).sort()

describe("useLiveRefresh (GLB-04)", () => {
    beforeEach(() => { vi.useFakeTimers(); dispatch.mockReset(); state.profile.profile = { id: "me", role: "SUPER_ADMIN" } })
    afterEach(() => { vi.useRealTimers() })

    it("🟢 a task notification refetches only what it touches, forced", () => {
        renderHook(() => useLiveRefresh())
        act(() => notif.push!({ content: 'Task "Fix login" has been reopened' }))
        act(() => { vi.advanceTimersByTime(400) })
        expect(types()).toEqual(["projects", "tasks"])
        expect(dispatch.mock.calls.every(([a]) => a.force !== false)).toBe(true)
    })

    it("🟢 a role change also refreshes your profile", () => {
        expect(scopesFor("Your role was changed to client admin.")).toEqual(expect.arrayContaining(["profile", "users"]))
    })

    it("🟢 Activity listeners hear about refreshes", () => {
        const heard = vi.fn()
        const off = onActivityRefresh(heard)
        renderHook(() => useLiveRefresh())
        act(() => notif.push!({ content: "Ravi commented on your task" }))
        act(() => { vi.advanceTimersByTime(400) })
        expect(heard).toHaveBeenCalledTimes(1)
        off()
    })

    it("🟢 a change announced by another tab refreshes everything once", () => {
        renderHook(() => useLiveRefresh())
        const otherTab = new FakeChannel()
        act(() => { otherTab.postMessage({ type: "changed" }); otherTab.postMessage({ type: "changed" }) })
        act(() => { vi.advanceTimersByTime(400) })
        expect(types()).toEqual(["clients", "profile", "projects", "tasks", "users"])
        otherTab.close()
    })

    it("🟢 coming back to the tab refreshes, but not twice within 30 s", () => {
        renderHook(() => useLiveRefresh())
        act(() => { vi.advanceTimersByTime(31_000); window.dispatchEvent(new Event("focus")) })
        act(() => { vi.advanceTimersByTime(400) })
        const first = dispatch.mock.calls.length
        expect(first).toBeGreaterThan(0)
        act(() => { window.dispatchEvent(new Event("focus")) })
        act(() => { vi.advanceTimersByTime(400) })
        expect(dispatch.mock.calls.length).toBe(first)
    })

    it("🔴 a USER doesn't fetch lists they can't read", () => {
        state.profile.profile = { id: "me", role: "USER" }
        renderHook(() => useLiveRefresh())
        const otherTab = new FakeChannel()
        act(() => otherTab.postMessage({ type: "changed" }))
        act(() => { vi.advanceTimersByTime(400) })
        expect(types()).toEqual(["profile", "projects", "tasks"])
        otherTab.close()
    })

    it("🔴 does nothing while signed out", () => {
        state.profile.profile = null
        renderHook(() => useLiveRefresh())
        act(() => { vi.advanceTimersByTime(31_000); window.dispatchEvent(new Event("focus")); vi.advanceTimersByTime(400) })
        expect(dispatch).not.toHaveBeenCalled()
    })
})
