import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { IconBell, IconTrash } from "@tabler/icons-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    type Notification,
} from "@/api/notificationApi"

const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/users":     "Users",
    "/clients":   "Clients",
    "/projects":  "Projects",
    "/tasks":     "Tasks",
    "/kanban":    "Kanban",
    "/analytics": "Analytics",
    "/account":   "Account",
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export function SiteHeader() {
    const location = useLocation()
    const title = PAGE_TITLES[location.pathname] ?? "ProjoMan"
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(false)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const unreadCount = notifications.filter((n) => n.status === "UNREAD").length

    const load = async () => {
        try {
            const data = await getNotifications()
            setNotifications(data)
        } catch {
            // silently fail — user may not have notifications
        }
    }

    // initial load + poll every 30s
    useEffect(() => {
        load()
        pollRef.current = setInterval(load, 30000)
        return () => {
            if (pollRef.current) clearInterval(pollRef.current)
        }
    }, [])

    // reload when popover opens
    useEffect(() => {
        if (open) load()
    }, [open])

    const handleClickNotification = async (n: Notification) => {
        if (n.status === "UNREAD") {
            await markAsRead(n.id)
            setNotifications((prev) =>
                prev.map((x) => (x.id === n.id ? { ...x, status: "READ" } : x))
            )
        }
    }

    const handleMarkAllRead = async () => {
        await markAllAsRead()
        setNotifications((prev) => prev.map((x) => ({ ...x, status: "READ" })))
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        await deleteNotification(id)
        setNotifications((prev) => prev.filter((x) => x.id !== id))
    }

    const handleDeleteAll = async () => {
        await deleteAllNotifications()
        setNotifications([])
    }

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                />
                <h1 className="text-base font-medium">{title}</h1>

                <div className="ml-auto flex items-center gap-2">
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative h-8 w-8">
                                <IconBell className="size-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 p-0">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <span className="text-sm font-semibold">
                                    Notifications
                                    {unreadCount > 0 && (
                                        <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                                            {unreadCount}
                                        </span>
                                    )}
                                </span>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button
                                            className="text-xs text-muted-foreground hover:text-foreground"
                                            onClick={handleMarkAllRead}
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            className="text-xs text-muted-foreground hover:text-destructive"
                                            onClick={handleDeleteAll}
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="max-h-80 overflow-y-auto divide-y">
                                {loading && notifications.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                        Loading…
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`group flex items-start gap-2 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${n.status === "UNREAD" ? "bg-primary/5" : ""}`}
                                            onClick={() => handleClickNotification(n)}
                                        >
                                            {n.status === "UNREAD" && (
                                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                            )}
                                            <div className={`flex-1 min-w-0 ${n.status === "READ" ? "pl-3.5" : ""}`}>
                                                <p className={`text-sm leading-snug ${n.status === "UNREAD" ? "font-medium" : "text-muted-foreground"}`}>
                                                    {n.content}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {timeAgo(n.createdAt)}
                                                </p>
                                            </div>
                                            <button
                                                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive"
                                                onClick={(e) => handleDelete(e, n.id)}
                                            >
                                                <IconTrash className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </header>
    )
}
