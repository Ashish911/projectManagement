import { useState } from "react"
import { useDispatch } from "react-redux"
import { IconRotateClockwise } from "@tabler/icons-react"
import { updateTaskStatus } from "@/api/taskApi"
import { updateTaskInStore } from "@/redux/actions/tasksActions"
import { useAsyncAction } from "@/hooks/use-async-action"
import { Field, FormError, FormFoot, FormModal, SubmitButton, textareaCls } from "./form-kit"
import { useAppData } from "./use-app-data"
import { useForms, type FormProps } from "./forms-context"
import { toast } from "./toaster"

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
