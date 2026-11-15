import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchUsers } from "@/redux/actions/usersListActions"
import { fetchClients } from "@/redux/actions/clientsActions"
import { fetchProjects } from "@/redux/actions/projectsActions"
import { fetchAllTasks } from "@/redux/actions/tasksActions"
import type { User, Role } from "@/types/userTypes"
import type { Client } from "@/types/clientTypes"
import type { Project } from "@/types/projectTypes"
import type { Task } from "@/types/taskTypes"

/**
 * Everything the forms and screens draw from, loaded once per session.
 * Lists the role can't read stay empty (users and clients for USER); a client admin's
 * clients list is their own client, or empty if they have none.
 */
export function useAppData() {
    const dispatch = useDispatch()
    const profile: User | null = useSelector((s: any) => s.profile.profile)
    const users: User[] = useSelector((s: any) => s.usersList.users)
    const clients: Client[] = useSelector((s: any) => s.clients.clients)
    const projects: Project[] = useSelector((s: any) => s.projects.projects)
    const tasks: Task[] = useSelector((s: any) => s.tasks.tasks)
    const tasksLoaded: boolean = useSelector((s: any) => s.tasks.loaded)
    const usersLoaded: boolean = useSelector((s: any) => s.usersList.loaded)
    const clientsLoaded: boolean = useSelector((s: any) => s.clients.loaded)
    const projectsLoaded: boolean = useSelector((s: any) => s.projects.loaded)
    const role = profile?.role as Role | undefined

    useEffect(() => {
        if (!role) return
        dispatch(fetchProjects() as any)
        dispatch(fetchAllTasks() as any)
        if (role !== "USER") dispatch(fetchUsers() as any)
        // A client admin's list holds just their own client (empty if they have none)
        if (role !== "USER") dispatch(fetchClients() as any)
    }, [dispatch, role])

    // Which lists have arrived; screens show skeletons, not zeros, until then
    const loaded = { users: usersLoaded, clients: clientsLoaded, projects: projectsLoaded, tasks: tasksLoaded }
    return { profile, role, users, clients, projects, tasks, tasksLoaded, loaded }
}

/** True while a list that's already on screen refetches (first loads show skeletons instead). */
export const listsRefreshing = (s: any) =>
    (s.usersList.loading && s.usersList.users.length > 0) ||
    (s.clients.loading && s.clients.clients.length > 0) ||
    (s.projects.loading && s.projects.projects.length > 0) ||
    (s.tasks.loading && s.tasks.loaded)

/**
 * True if the viewer runs the project: a super admin always does; a client admin only for
 * their own client's projects (`canManage` from the server). On other projects they are a team member.
 */
export const canManageProject = (role: Role | undefined, project: Pick<Project, "canManage"> | null | undefined) =>
    role === "SUPER_ADMIN" || !!project?.canManage

/** The projects the viewer runs: where they can add tasks. */
export const managedProjects = <P extends Pick<Project, "canManage">>(role: Role | undefined, projects: P[]) =>
    projects.filter((p) => canManageProject(role, p))

/** Open (unresolved) tasks assigned to a person; drives the workload bars in pickers. */
export const openTaskCount = (tasks: Task[], userId: string) =>
    tasks.filter((t) => t.assignedTo?.id === userId && t.currentStatus !== "RESOLVED").length
