import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { useSelector } from "react-redux"
import { IconBell, IconChevronRight, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconMoon, IconSearch, IconSun } from "@tabler/icons-react"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/hooks/use-theme"
import { useForms } from "@/components/forms/forms-context"
import { toast } from "@/components/forms/toaster"
import { onNewNotification, useNotifications } from "@/hooks/use-notifications"

const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/users":     "Users",
    "/clients":   "Clients",
    "/projects":  "Projects",
    "/tasks":     "Tasks",
    "/analytics": "Analytics",
    "/account":   "Account",
    "/guide":     "Guide",
}

/** Sticky top bar: sidebar toggle, breadcrumb, search (⌘K), theme and notifications. */
export function SiteHeader() {
    const location = useLocation()
    const openForm = useForms()
    const title = PAGE_TITLES[location.pathname] ?? "ProjoMan"
    // /projects/:id shows "Projects › <name>"
    const projectId = location.pathname.match(/^\/projects\/([^/]+)$/)?.[1]
    const projectName: string | undefined = useSelector((state: any) =>
        projectId ? state.projects.projects.find((p: any) => p.id === projectId)?.name : undefined)
    const { theme, toggle: toggleTheme } = useTheme()
    const { state: sidebarState, toggleSidebar } = useSidebar()
    const unreadCount = useNotifications().filter((n) => n.status === "UNREAD").length

    // Live notifications get a toast; loads and refreshes don't
    useEffect(() => onNewNotification((n) => {
        toast({ text: n.content, icon: IconBell, action: { label: "Open", run: () => openForm("notifications") } })
    }), [openForm])

    return (
        <header className="sticky top-0 z-sticky flex h-[--header-height] shrink-0 items-center gap-2.5 border-b bg-background/85 px-5 backdrop-blur-[10px]">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
                {sidebarState === "collapsed" ? <IconLayoutSidebarLeftExpand /> : <IconLayoutSidebarLeftCollapse />}
            </Button>
            <span className="h-[18px] w-px bg-border-strong" />
            {projectId ? (
                <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
                    <Link to="/projects" className="text-muted-foreground hover:text-foreground hover:no-underline">Projects</Link>
                    <IconChevronRight size={14} className="flex-none text-subtle-foreground" />
                    <h1 className="truncate font-medium">{projectName ?? "Project"}</h1>
                </nav>
            ) : (
                <h1 className="font-medium">{title}</h1>
            )}

            <div className="ml-auto flex items-center gap-2.5">
                {/* Looks like an input, opens the ⌘K palette */}
                <button
                    onClick={() => openForm("search")}
                    className="hidden h-[34px] w-[200px] cursor-text items-center gap-2 rounded-lg border border-border-strong bg-card px-3 text-[13.5px] text-subtle-foreground transition-shadow focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 lg:flex xl:w-[300px]"
                >
                    <IconSearch className="size-4" />
                    <span className="flex-1 truncate text-left">Search projects, tasks, people</span>
                    <kbd className="num rounded border bg-surface-2 px-[5px] py-0.5 text-[11px] font-medium">⌘K</kbd>
                </button>
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => openForm("search")} aria-label="Search"><IconSearch /></Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    aria-label={theme === "DARK" ? "Switch to light theme" : "Switch to dark theme"}
                >
                    {/* key remounts the icon so it spins in on every switch */}
                    {theme === "DARK" ? <IconSun key="sun" className="animate-spin-in" /> : <IconMoon key="moon" className="animate-spin-in" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => openForm("notifications")}
                    aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
                >
                    <IconBell />
                    {unreadCount > 0 && <span className="absolute right-2 top-2 size-[7px] rounded-full bg-[oklch(0.64_0.17_27)] ring-2 ring-background" />}
                </Button>
            </div>
        </header>
    )
}
