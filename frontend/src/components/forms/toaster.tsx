import { useSyncExternalStore } from "react"
import type { Icon } from "@tabler/icons-react"
import { IconAlertCircle, IconCircleCheck, IconTrash, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Toast = {
    id: number
    text: React.ReactNode
    tone?: "success" | "danger" | "error"
    icon?: Icon
    action?: { label: string; run: () => void }
}

// A tiny external store, so any code (forms, delete timers) can raise toasts
let toasts: Toast[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
let nextId = 1

export function dismissToast(id: number) {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
}

/** Shows a toast for ~5 s; at most three are visible. Returns its id. */
export function toast(t: Omit<Toast, "id">, ms = 4800): number {
    const id = nextId++
    toasts = [...toasts.slice(-2), { ...t, id }]
    emit()
    setTimeout(() => dismissToast(id), ms)
    return id
}

export const toastError = (message: string) => toast({ text: message, tone: "error" })

// ── Delayed deletes ───────────────────────────────────────────────────────────

const UNDO_MS = 5000 // How long Undo is offered before the delete is sent
const pending = new Map<number, () => Promise<void>>()

/**
 * Hides an item now and deletes it on the server after a few seconds, unless Undo is pressed.
 * @param text    Toast message, e.g. "Bluebird Co. deleted".
 * @param hide    Removes the item from the UI immediately.
 * @param restore Puts it back (on Undo, or if the server delete fails).
 * @param commit  The real delete request.
 */
export function scheduleDelete({ text, hide, restore, commit }: {
    text: React.ReactNode
    hide: () => void
    restore: () => void
    commit: () => Promise<unknown>
}) {
    hide()
    let done = false
    const run = async () => {
        if (done) return
        done = true
        pending.delete(toastId)
        try {
            await commit()
        } catch (e: any) {
            restore()
            toastError(`Couldn't delete: ${e?.message ?? "unknown error"}`)
        }
    }
    const toastId = toast({
        text,
        tone: "danger",
        icon: IconTrash,
        action: {
            label: "Undo",
            run: () => {
                if (done) return
                done = true
                clearTimeout(timer)
                pending.delete(toastId)
                restore()
            },
        },
    }, UNDO_MS)
    const timer = setTimeout(run, UNDO_MS)
    pending.set(toastId, run)
}

// Leaving the page sends any deletes still waiting out their Undo window (best effort)
window.addEventListener("beforeunload", () => pending.forEach((run) => run()))

// ── View ──────────────────────────────────────────────────────────────────────

const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
}

/** Bottom-right stack of toasts; mount once. */
export function Toaster() {
    const list = useSyncExternalStore(subscribe, () => toasts)
    return (
        <div aria-live="polite" className="fixed bottom-5 right-5 z-[70] grid justify-items-end gap-2">
            {list.map((t) => {
                const I = t.icon ?? (t.tone === "error" ? IconAlertCircle : IconCircleCheck)
                return (
                    <div key={t.id} className="flex min-w-[300px] max-w-[440px] animate-fm-toast items-center gap-2.5 rounded-xl border bg-card py-2 pl-3.5 pr-2 text-[13.5px] shadow-lg">
                        <I size={18} className={cn("flex-none", t.tone === "success" || !t.tone ? "tone-green tone-fg" : "tone-red tone-fg")} />
                        <span className="flex-1">{t.text}</span>
                        {t.action && (
                            <Button size="sm" variant="ghost" onClick={() => { t.action!.run(); dismissToast(t.id) }}>{t.action.label}</Button>
                        )}
                        <Button size="icon" variant="ghost" className="size-7" aria-label="Dismiss" onClick={() => dismissToast(t.id)}><IconX /></Button>
                    </div>
                )
            })}
        </div>
    )
}
