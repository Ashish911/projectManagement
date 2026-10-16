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

    const setStatus = async (task: Task, status: TaskStatus) => {
        if (task.currentStatus === status) return
        dispatch(updateTaskInStore({ ...task, currentStatus: status }))
        try {
            dispatch(updateTaskInStore(await updateTaskStatus(task.id, status)))
        } catch (e: any) {
            dispatch(updateTaskInStore(task))
            toastError(e.message)
        }
    }

    /** Check-off: resolves an open task, or moves a resolved one back to in progress. */
    const toggleResolved = (task: Task) => setStatus(task, task.currentStatus === "RESOLVED" ? "IN_PROGRESS" : "RESOLVED")

    return { setStatus, toggleResolved }
}
