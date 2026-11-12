import { useDispatch } from "react-redux"
import { updateTaskStatus } from "@/api/taskApi"
import { updateTaskInStore } from "@/redux/actions/tasksActions"
import type { Task, TaskStatus } from "@/types/taskTypes"
import { toastError } from "./toaster"

/**
 * Status changes that show immediately and roll back if the server refuses
 * (e.g. a member moving a task that isn't assigned to them).
 */
export function useTaskActions() {
    const dispatch = useDispatch()

    const setStatus = async (task: Task, requested: TaskStatus) => {
        // A resolved task can only be reopened (the server enforces this)
        const status = task.currentStatus === "RESOLVED" && requested !== "RESOLVED" ? "REOPENED" : requested
        if (task.currentStatus === status) return
        dispatch(updateTaskInStore({ ...task, currentStatus: status }))
        try {
            dispatch(updateTaskInStore(await updateTaskStatus(task.id, status)))
        } catch (e: any) {
            dispatch(updateTaskInStore(task))
            toastError(e.message)
        }
    }

    /** Check-off: resolves an open task, or reopens a resolved one. */
    const toggleResolved = (task: Task) => setStatus(task, task.currentStatus === "RESOLVED" ? "REOPENED" : "RESOLVED")

    return { setStatus, toggleResolved }
}
