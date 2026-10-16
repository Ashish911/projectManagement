import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import type { Icon } from "@tabler/icons-react"
import {
    IconBuildingPlus,
    IconCircleCheck,
    IconCircleDashed,
    IconCornerDownLeft,
    IconFolder,
    IconFolderPlus,
    IconMessagePlus,
    IconMoodEmpty,
    IconMoon,
    IconSearch,
    IconSquareCheck,
    IconSun,
    IconUserCircle,
    IconUserPlus,
} from "@tabler/icons-react"
import { Avatar } from "@/components/pm/avatar"
import { StatusBadge } from "@/components/pm/status-badge"
import { dueLabel, parseDate } from "@/components/pm/dates"
import { useTheme } from "@/components/hooks/use-theme"
import { NAV_BY_ROLE } from "@/Screens/Components/app-sidebar"
import { cn } from "@/lib/utils"
import { Kbd } from "./form-kit"
import { useAppData } from "./use-app-data"
import { useForms, type FormProps } from "./forms-context"

type Item = {
    group: string
    label: string
    sub?: string
    icon?: Icon
    person?: { id: string; name: string }
    trail?: React.ReactNode
    run: () => void
}

/** ⌘K palette: actions, pages, projects, tasks and (super admins) people, all keyboard-driven. */
export function CommandPalette({ onClose, closing }: FormProps) {
    const navigate = useNavigate()
    const openForm = useForms()
    const { theme, toggle } = useTheme()
    const { profile, role, users, projects, tasks } = useAppData()
    const [q, setQ] = useState("")
    const [hi, setHi] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)

    // Let the palette close before opening a form, so the two dialogs don't overlap
    const later = (fn: () => void) => () => { onClose(); setTimeout(fn, 200) }
    const go = (url: string) => () => { onClose(); navigate(url) }

    const isAdmin = role === "SUPER_ADMIN" || role === "CLIENT_ADMIN"
    const actions: Item[] = [
        ...(isAdmin ? [
            { group: "Actions", label: "New task", icon: IconSquareCheck, run: later(() => openForm("task")) },
            { group: "Actions", label: "New project", icon: IconFolderPlus, run: later(() => openForm("project")) },
        ] : []),
        ...(role === "SUPER_ADMIN" ? [
            { group: "Actions", label: "Invite user", icon: IconUserPlus, run: later(() => openForm("user")) },
            { group: "Actions", label: "New client", icon: IconBuildingPlus, run: later(() => openForm("client")) },
        ] : []),
        ...(role === "USER" ? [{ group: "Actions", label: "Log an update", icon: IconMessagePlus, run: later(() => openForm("log-update")) }] : []),
        { group: "Actions", label: theme === "DARK" ? "Switch to light mode" : "Switch to dark mode", icon: theme === "DARK" ? IconSun : IconMoon, run: () => { onClose(); toggle() } },
    ]
    const pages: Item[] = [
        ...(NAV_BY_ROLE[(role ?? "USER") as keyof typeof NAV_BY_ROLE] ?? []).map((n) => ({ group: "Go to", label: n.title, icon: n.icon, run: go(n.url) })),
        { group: "Go to", label: "Account", icon: IconUserCircle, run: later(() => openForm("account")) },
    ]
    const projectItems: Item[] = projects.map((p) => ({ group: "Projects", label: p.name, sub: p.client?.name, icon: IconFolder, trail: <StatusBadge value={p.status} />, run: go(`/projects/${p.id}`) }))
    const visibleTasks = role === "USER" ? tasks.filter((t) => t.assignedTo?.id === profile?.id) : tasks
    const taskItems: Item[] = visibleTasks.map((t) => ({
        group: "Tasks",
        label: t.title,
        sub: `${t.project?.name ?? ""} · ${dueLabel(parseDate(t.deadline))}`,
        icon: t.currentStatus === "RESOLVED" ? IconCircleCheck : IconCircleDashed,
        run: later(() => openForm("task-view", { id: t.id })),
    }))
    const people: Item[] = role === "SUPER_ADMIN" ? users.map((u) => ({ group: "People", label: u.name, sub: u.email, person: u, run: later(() => openForm("user", { userId: u.id })) })) : []

    // With a query: up to five matches per group. Without: actions, pages and your open tasks
    const s = q.trim().toLowerCase()
    const items = s
        ? [...actions, ...pages, ...projectItems, ...taskItems, ...people]
            .filter((x) => `${x.label} ${x.sub ?? ""}`.toLowerCase().includes(s))
            .reduce<Item[]>((acc, x) => (acc.filter((y) => y.group === x.group).length < 5 ? [...acc, x] : acc), [])
        : [...actions, ...pages, ...taskItems.filter((_, i) => visibleTasks[i].currentStatus !== "RESOLVED").slice(0, 4).map((t) => ({ ...t, group: "Open tasks" }))]

    useEffect(() => {
        listRef.current?.querySelector("[data-hi=true]")?.scrollIntoView({ block: "nearest" })
    }, [hi])

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(items.length - 1, h + 1)) }
        else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
        else if (e.key === "Enter") { e.preventDefault(); items[hi]?.run() }
        else if (e.key === "Escape") { e.preventDefault(); onClose() }
    }

    return createPortal(
        <div
            className={cn("fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[oklch(0.22_0.01_65/.34)] px-5 pb-12 pt-[12vh] backdrop-blur-[4px] dark:bg-[oklch(0.05_0_0/.6)]", closing ? "animate-fm-fade-out" : "animate-fm-fade")}
            onMouseDown={onClose}
        >
            <div
                role="dialog"
                aria-label="Search"
                onMouseDown={(e) => e.stopPropagation()}
                className={cn("w-[640px] max-w-full overflow-hidden rounded-[14px] border bg-card shadow-lg", closing ? "animate-fm-pop-out" : "animate-fm-pop")}
            >
                <div className="flex h-14 items-center gap-3 border-b px-4 text-subtle-foreground">
                    <IconSearch size={18} />
                    <input
                        autoFocus
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setHi(0) }}
                        onKeyDown={onKey}
                        placeholder="Search or type a command…"
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-foreground outline-none focus:ring-0"
                    />
                    <Kbd>esc</Kbd>
                </div>
                <div ref={listRef} className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
                    {items.map((x, i) => (
                        <React.Fragment key={`${x.group}-${x.label}-${i}`}>
                            {(i === 0 || items[i - 1].group !== x.group) && (
                                <div className="px-2 pb-1 pt-2 font-mono text-[10.5px] font-medium uppercase tracking-[.06em] text-subtle-foreground">{x.group}</div>
                            )}
                            <div
                                data-hi={i === hi}
                                onMouseEnter={() => setHi(i)}
                                onClick={x.run}
                                className={cn("group/cp flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px]", i === hi && "bg-surface-2")}
                            >
                                {x.person ? (
                                    <Avatar name={x.person.name} seed={x.person.id} size={24} />
                                ) : x.icon && (
                                    <span className={cn("grid size-7 flex-none place-items-center rounded-[7px] border bg-surface-2 text-muted-foreground", i === hi && "bg-card text-accent-foreground")}>
                                        <x.icon size={15} />
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="truncate">{x.label}</div>
                                    {x.sub && <div className="truncate text-xs text-subtle-foreground">{x.sub}</div>}
                                </div>
                                {x.trail}
                                {i === hi && <IconCornerDownLeft size={16} className="text-subtle-foreground" />}
                            </div>
                        </React.Fragment>
                    ))}
                    {!items.length && (
                        <div className="flex items-center justify-center gap-2.5 py-9 text-muted-foreground"><IconMoodEmpty size={20} />No results for “{q}”</div>
                    )}
                </div>
                <div className="flex items-center gap-3.5 border-t bg-surface-2 px-4 py-[9px] text-xs text-subtle-foreground">
                    <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
                    <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
                    <span className="ml-auto">Tasks, projects{role === "SUPER_ADMIN" ? ", people" : ""} and actions</span>
                </div>
            </div>
        </div>,
        document.body,
    )
}
