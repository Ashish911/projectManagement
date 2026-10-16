import { useCallback, useEffect, useState } from "react"
import { FormsContext, type FormKind, type FormProps } from "./forms-context"
import { TaskForm } from "./task-form"
import { TaskSheet } from "./task-sheet"
import { ProjectForm, TeamForm } from "./project-form"
import { UserForm } from "./user-form"
import { BulkRoleForm, BulkUnlockForm, ExportUsersForm } from "./user-bulk-forms"
import { ClientForm, DeclineRequestForm } from "./client-form"
import { DeleteClientForm, DeleteProjectForm, DeleteUsersForm } from "./danger-form"
import { AccountMenu, LogUpdateForm } from "./account-forms"
import { NotificationsSheet } from "./notifications-sheet"
import { CommandPalette } from "./command-palette"
import { Toaster } from "./toaster"

const FORMS: Record<FormKind, React.ComponentType<FormProps<any>>> = {
    task: TaskForm,
    "task-view": TaskSheet,
    "log-update": LogUpdateForm,
    project: ProjectForm,
    team: TeamForm,
    "delete-project": DeleteProjectForm,
    user: UserForm,
    "delete-user": DeleteUsersForm,
    "bulk-role": BulkRoleForm,
    "bulk-unlock": BulkUnlockForm,
    "bulk-remove": DeleteUsersForm,
    "export-users": ExportUsersForm,
    client: ClientForm,
    "delete-client": DeleteClientForm,
    "decline-request": DeclineRequestForm,
    account: AccountMenu,
    notifications: NotificationsSheet,
    search: CommandPalette,
}

const EXIT_MS = 170 // Matches the fm-pop-out / sh-out animations

/**
 * Provides `openForm` to the app and renders the one open form (plus toasts).
 * ⌘K / Ctrl+K opens the search palette from anywhere.
 */
export function FormsProvider({ children }: { children: React.ReactNode }) {
    const [current, setCurrent] = useState<{ kind: FormKind; data: Record<string, any>; key: number } | null>(null)
    const [closing, setClosing] = useState(false)

    const openForm = useCallback((kind: FormKind, data: Record<string, any> = {}) => {
        setClosing(false)
        setCurrent({ kind, data, key: Date.now() })
    }, [])

    const close = useCallback(() => {
        setClosing(true)
        setTimeout(() => {
            setCurrent(null)
            setClosing(false)
        }, EXIT_MS)
    }, [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                openForm("search")
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [openForm])

    // Keep the page behind an open dialog from scrolling
    useEffect(() => {
        document.documentElement.style.overflow = current && !closing ? "hidden" : ""
    }, [current, closing])

    const Form = current ? FORMS[current.kind] : null
    return (
        <FormsContext.Provider value={openForm}>
            {children}
            {Form && current && <Form key={current.key} data={current.data} onClose={close} closing={closing} />}
            <Toaster />
        </FormsContext.Provider>
    )
}
