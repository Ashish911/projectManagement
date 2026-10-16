import { createContext, useContext } from "react"

/** Every form, sheet and overlay the app can open. */
export type FormKind =
    | "task" | "task-view" | "log-update"
    | "project" | "team" | "delete-project"
    | "user" | "delete-user" | "bulk-role" | "bulk-unlock" | "bulk-remove" | "export-users"
    | "client" | "delete-client" | "decline-request"
    | "account" | "notifications" | "search"

export type OpenForm = (kind: FormKind, data?: Record<string, any>) => void

export const FormsContext = createContext<OpenForm>(() => {})

/** Returns `openForm(kind, data)`, which shows that form over the current page. */
export const useForms = () => useContext(FormsContext)

/** Props every form component receives from the host. */
export type FormProps<D = Record<string, any>> = {
    data: D
    onClose: () => void
    /** True during the short exit animation */
    closing: boolean
}
