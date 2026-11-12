import { useState } from "react"
import { useDispatch } from "react-redux"
import { IconAlertTriangle, IconRotateClockwise, IconTrash } from "@tabler/icons-react"
import { deleteTask, updateTaskStatus } from "@/api/taskApi"
import { addTaskToStore, removeTaskFromStore, updateTaskInStore } from "@/redux/actions/tasksActions"
import { Button } from "@/components/ui/button"
import { useAsyncAction } from "@/hooks/use-async-action"
import { Field, FormError, FormFoot, FormModal, Note, SubmitButton, textareaCls } from "./form-kit"
import { useAppData } from "./use-app-data"
import { useForms, type FormProps } from "./forms-context"
import { scheduleDelete, toast } from "./toaster"

/**
 * Confirms reopening a resolved task, with an optional reason that's saved in Activity.
 * `returnToSheet` reopens the task panel afterwards when it was opened from there.
 */
export function ReopenTaskForm({ data, onClose, closing }: FormProps<{ taskId: string; returnToSheet?: boolean }>) {
    const dispatch = useDispatch()
    const openForm = useForms()
    const { tasks } = useAppData()
    const task = tasks.find((t) => t.id === data.taskId)
    const [reason, setReason] = useState("")
    const { run, busy, error } = useAsyncAction()
    if (!task) return null

    const submit = () => run(async () => {
        dispatch(updateTaskInStore(await updateTaskStatus(task.id, "REOPENED", reason.trim())))
        toast({ text: <span><b>{task.title}</b> reopened</span>, icon: IconRotateClockwise })
        onClose()
        if (data.returnToSheet) setTimeout(() => openForm("task-view", { id: task.id }), 200)
    })

    return (
        <FormModal
            title={`Reopen “${task.title}”?`}
            desc="It moves to Reopened and can be edited again. The reopen is logged in Activity."
            icon={IconRotateClockwise}
            width={480}
            onClose={onClose}
            onSubmit={submit}
            closing={closing}
            footer={<FormFoot onClose={onClose}><SubmitButton busy={busy} onClick={submit}>Reopen task</SubmitButton></FormFoot>}
        >
            <Field label="Reason" hint="Optional, but it helps whoever picks it up.">
                <textarea className={textareaCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What still needs doing? e.g. The fix didn’t cover Safari" />
            </Field>
            <FormError message={error} />
        </FormModal>
    )
}

/** Confirms deleting a task, saying what goes with it. The delete still gets the Undo window. */
export function DeleteTaskForm({ data, onClose, closing }: FormProps<{ taskId: string; returnToSheet?: boolean }>) {
    const dispatch = useDispatch()
    const openForm = useForms()
    const { tasks } = useAppData()
    const task = tasks.find((t) => t.id === data.taskId)
    if (!task) return null
    const subs = task.subTaskStats?.total ?? 0

    const cancel = () => {
        onClose()
        if (data.returnToSheet) setTimeout(() => openForm("task-view", { id: task.id }), 200)
    }
    const confirm = () => {
        onClose()
        scheduleDelete({
            text: "Task deleted",
            hide: () => dispatch(removeTaskFromStore(task.id)),
            restore: () => dispatch(addTaskToStore(task)),
            commit: () => deleteTask(task.id),
        })
    }

    return (
        <FormModal
            title={`Delete “${task.title}”?`}
            desc="You’ll have a few seconds to undo."
            icon={IconAlertTriangle}
            tone="red"
            width={460}
            onClose={cancel}
            onSubmit={confirm}
            closing={closing}
            footer={<FormFoot onClose={cancel}><Button type="button" variant="destructive" onClick={confirm}><IconTrash />Delete task</Button></FormFoot>}
        >
            <Note tone="red" icon={IconTrash}>
                {subs ? `This also deletes its ${subs} sub-task${subs === 1 ? "" : "s"} and all comments.` : "This also deletes its comments."}
            </Note>
        </FormModal>
    )
}
