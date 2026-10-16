import { useState } from "react"
import { IconBell, IconBellOff, IconChecks, IconTrash, IconX } from "@tabler/icons-react"
import {
    deleteAllNotifications,
    deleteNotification,
    markAllAsRead,
    markAsRead,
    type Notification,
} from "@/api/notificationApi"
import { currentNotifications, setNotifications, useNotifications } from "@/hooks/use-notifications"
import { Button } from "@/components/ui/button"
import { AnimatedTabs } from "@/components/pm/animated-tabs"
import { cn } from "@/lib/utils"
import type { FormProps } from "./forms-context"
import { SideSheet } from "./task-sheet"
import { toastError } from "./toaster"

const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(/^\d+$/.test(iso) ? Number(iso) : iso).getTime()) / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
}

/** Right-hand sheet listing notifications with All / Unread tabs. */
export function NotificationsSheet({ onClose, closing }: FormProps) {
    const list = useNotifications()
    const [tab, setTab] = useState<"all" | "unread">("all")
    const unread = list.filter((n) => n.status === "UNREAD")
    const shown = tab === "unread" ? unread : list

    /** Applies the change right away, then rolls it back if the server call fails. */
    const act = async (fn: () => Promise<void>, optimistic: Notification[]) => {
        const before = currentNotifications()
        setNotifications(optimistic)
        try { await fn() } catch (e: any) { setNotifications(before); toastError(e.message) }
    }

    return (
        <SideSheet onClose={onClose} closing={closing} width={440} label="Notifications">
            <header className="flex min-h-[50px] items-center gap-2.5 border-b py-2.5 pl-[18px] pr-3">
                <h2 className="flex-1 text-[15px] font-semibold tracking-[-0.01em]">Notifications</h2>
                {unread.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => act(markAllAsRead, list.map((n) => ({ ...n, status: "READ" })))}><IconChecks />Mark all read</Button>
                )}
                {list.length > 0 && (
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Clear all" title="Clear all" onClick={() => act(deleteAllNotifications, [])}><IconTrash /></Button>
                )}
                <Button size="icon" variant="ghost" className="size-7" aria-label="Close" onClick={onClose}><IconX /></Button>
            </header>
            <div className="px-3.5 pt-1">
                <AnimatedTabs value={tab} onChange={setTab} tabs={[{ value: "all", label: "All" }, { value: "unread", label: "Unread", count: unread.length }]} />
            </div>
            <div key={tab} className="grid flex-1 content-start gap-0.5 overflow-y-auto px-2 pb-4 pt-2">
                {shown.map((n, i) => {
                    const isUnread = n.status === "UNREAD"
                    return (
                        <div
                            key={n.id}
                            data-unread={isUnread}
                            onClick={() => isUnread && act(() => markAsRead(n.id), list.map((x) => (x.id === n.id ? { ...x, status: "READ" } : x)))}
                            className={cn("group flex animate-pm-in cursor-pointer items-start gap-3 rounded-[10px] p-2.5 transition-colors duration-fast hover:bg-surface-2", isUnread && "bg-accent/55")}
                            style={{ animationDelay: `${i * 40}ms` }}
                        >
                            <span className="grid size-[30px] flex-none place-items-center rounded-full bg-surface-3 text-muted-foreground"><IconBell size={15} /></span>
                            <div className="min-w-0 flex-1 text-[13.5px] leading-[1.4]">
                                <div className={isUnread ? "font-medium" : "text-muted-foreground"}>{n.content}</div>
                                <div className="mt-0.5 text-xs text-subtle-foreground">{timeAgo(n.createdAt)}</div>
                            </div>
                            {isUnread && <span className="mt-1.5 size-2 flex-none rounded-full bg-primary" />}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-6 opacity-0 group-hover:opacity-100"
                                aria-label="Delete notification"
                                onClick={(e) => { e.stopPropagation(); act(() => deleteNotification(n.id), list.filter((x) => x.id !== n.id)) }}
                            >
                                <IconX />
                            </Button>
                        </div>
                    )
                })}
                {!shown.length && (
                    <div className="flex animate-pm-in items-center justify-center gap-2.5 py-10 text-muted-foreground"><IconBellOff size={20} />You’re all caught up.</div>
                )}
            </div>
        </SideSheet>
    )
}
