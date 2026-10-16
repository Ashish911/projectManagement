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
 * Lists the role can't read stay empty (users for USER, clients for non-super admins).
 */
export function useAppData() {
    const dispatch = useDispatch()
    const profile: User | null = useSelector((s: any) => s.profile.profile)
    const users: User[] = useSelector((s: any) => s.usersList.users)
    const clients: Client[] = useSelector((s: any) => s.clients.clients)
    const projects: Project[] = useSelector((s: any) => s.projects.projects)
    const tasks: Task[] = useSelector((s: any) => s.tasks.tasks)
    const tasksLoaded: boolean = useSelector((s: any) => s.tasks.loaded)
    const role = profile?.role as Role | undefined

    useEffect(() => {
        if (!role) return
        dispatch(fetchProjects() as any)
        dispatch(fetchAllTasks() as any)
        if (role !== "USER") dispatch(fetchUsers() as any)
        if (role === "SUPER_ADMIN") dispatch(fetchClients() as any)
    }, [dispatch, role])

    return { profile, role, users, clients, projects, tasks, tasksLoaded }
}

/** Open (unresolved) tasks assigned to a person; drives the workload bars in pickers. */
export const openTaskCount = (tasks: Task[], userId: string) =>
    tasks.filter((t) => t.assignedTo?.id === userId && t.currentStatus !== "RESOLVED").length
