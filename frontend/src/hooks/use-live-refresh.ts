import { useEffect, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchAllTasks } from "@/redux/actions/tasksActions"
import { fetchProjects } from "@/redux/actions/projectsActions"
import { fetchUsers } from "@/redux/actions/usersListActions"
import { fetchClients } from "@/redux/actions/clientsActions"
import { fetchProfile } from "@/redux/actions/userActions"
import { onNewNotification } from "@/hooks/use-notifications"
import { onLocalChange, syncChannel } from "@/api/sync"

export type Scope = "tasks" | "projects" | "users" | "clients" | "profile" | "activity"
const EVERYTHING: Scope[] = ["tasks", "projects", "users", "clients", "profile", "activity"]
const DEBOUNCE_MS = 300 // Coalesce bursts (several notifications, several tabs) into one refetch
const FOCUS_STALE_MS = 30_000 // Coming back to a tab refreshes it if the last refresh is older than this

/** What a notification's text says changed, so only that data is refetched. */
export function scopesFor(content: string): Scope[] {
    const c = content.toLowerCase()
    if (/role|promoted|admin for client|no longer the admin/.test(c)) return ["profile", "users", "clients", "projects", "tasks", "activity"]
    if (/client|deletion/.test(c)) return ["clients", "activity"]
    if (/project/.test(c)) return ["projects", "tasks", "activity"]
    if (/task|subtask|comment/.test(c)) return ["tasks", "projects", "activity"]
    return ["tasks", "projects", "activity"]
}

/**
 * What a mutation made in this tab touched, from its operation name. Optimistic store updates
 * already show the edited row; this refetch brings the lists derived from it back in line.
 */
export function scopesForMutation(query: string): Scope[] {
    const name = query.match(/mutation\s+(\w+)/)?.[1] ?? ""
    if (/Comment|Notification|MarkA|Preference|Password/.test(name)) return []
    if (/Profile/.test(name)) return ["profile", "users"]
    // Deletes cascade: a client takes its projects and tasks, a user or project its assignments
    if (/^(Force)?Delete\w*Client/.test(name)) return ["clients", "users", "projects", "tasks", "activity"]
    if (/^DeleteUsers?$/.test(name)) return ["users", "clients", "projects", "tasks", "activity"]
    if (name === "DeleteProject") return ["projects", "users", "tasks", "activity"]
    if (/Client|AssignAdmin/.test(name)) return ["clients", "users", "activity"]
    if (/User|Invite|PromoteToAdmin/.test(name) && !/ToProject|FromProject/.test(name)) return ["users", "clients", "projects", "activity"]
    if (/Project/.test(name)) return ["projects", "users", "activity"]
    if (/Task/.test(name)) return ["tasks", "projects", "activity"]
    return []
}

// The dashboard's Activity feed loads itself; it listens here for refreshes
const activityListeners = new Set<() => void>()
export function onActivityRefresh(listener: () => void): () => void {
    activityListeners.add(listener)
    return () => { activityListeners.delete(listener) }
}

/**
 * Keeps this tab's data fresh without polling (GLB-04): a new notification refetches what it
 * touches, a change announced by another tab refetches everything, and coming back to the tab
 * refreshes it if it's been a while. Mount once, in the signed-in layout.
 */
export function useLiveRefresh() {
    const dispatch = useDispatch()
    const role: string | undefined = useSelector((s: any) => s.profile.profile?.role)
    const pending = useRef(new Set<Scope>())
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastRefresh = useRef(Date.now())

    useEffect(() => {
        if (!role) return

        const run = () => {
            timer.current = null
            lastRefresh.current = Date.now()
            const scopes = pending.current
            pending.current = new Set()
            if (scopes.has("tasks")) dispatch(fetchAllTasks(true) as any)
            if (scopes.has("projects")) dispatch(fetchProjects(true) as any)
            if (scopes.has("users") && role !== "USER") dispatch(fetchUsers(true) as any)
            if (scopes.has("clients") && role === "SUPER_ADMIN") dispatch(fetchClients(true) as any)
            if (scopes.has("profile")) dispatch(fetchProfile() as any)
            if (scopes.has("activity")) activityListeners.forEach((l) => l())
        }
        const refresh = (scopes: Scope[]) => {
            scopes.forEach((s) => pending.current.add(s))
            if (!timer.current) timer.current = setTimeout(run, DEBOUNCE_MS)
        }

        const offNotification = onNewNotification((n) => refresh(scopesFor(n.content)))
        const offLocal = onLocalChange((mutation) => {
            const scopes = scopesForMutation(mutation)
            if (scopes.length) refresh(scopes)
        })

        const channel = syncChannel()
        const onMessage = (e: MessageEvent) => e.data?.type === "changed" && refresh(EVERYTHING)
        if (channel) channel.onmessage = onMessage as any

        const onFocus = () => {
            if (document.visibilityState !== "hidden" && Date.now() - lastRefresh.current > FOCUS_STALE_MS) refresh(EVERYTHING)
        }
        window.addEventListener("focus", onFocus)
        document.addEventListener("visibilitychange", onFocus)

        return () => {
            offNotification()
            offLocal()
            if (channel && channel.onmessage === (onMessage as any)) channel.onmessage = null
            window.removeEventListener("focus", onFocus)
            document.removeEventListener("visibilitychange", onFocus)
            if (timer.current) clearTimeout(timer.current)
            timer.current = null
        }
    }, [dispatch, role])
}
