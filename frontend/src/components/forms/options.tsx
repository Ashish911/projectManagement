import { IconUser } from "@tabler/icons-react"
import { Avatar } from "@/components/pm/avatar"
import { StatusBadge } from "@/components/pm/status-badge"
import type { User } from "@/types/userTypes"
import type { Project } from "@/types/projectTypes"
import type { Task } from "@/types/taskTypes"
import type { ComboOption } from "./combo"
import { openTaskCount } from "./use-app-data"

/** Tiny bar + number for how many open tasks someone has (amber from 5). */
export function LoadMeter({ n }: { n: number }) {
    return (
        <span className="flex flex-none items-center gap-1.5 text-xs text-subtle-foreground" title={`${n} open tasks`}>
            <span className="block h-1 w-9 overflow-hidden rounded bg-surface-3">
                <i className="block h-full rounded" style={{ width: `${Math.min(100, (n / 6) * 100)}%`, background: `oklch(var(${n >= 5 ? "--chart-3" : "--primary"}))` }} />
            </span>
            <span className="num">{n}</span>
        </span>
    )
}

/** Dashed empty circle standing in for "nobody". */
export const GhostAvatar = ({ size = 24 }: { size?: number }) => (
    <span className="grid flex-none place-items-center rounded-full border-[1.5px] border-dashed border-border-strong text-subtle-foreground" style={{ width: size, height: size }}>
        <IconUser size={size / 2} />
    </span>
)

/** First letter of a client on a neutral tile. */
export const LogoChip = ({ name, size = 24 }: { name?: string | null; size?: number }) => (
    <span className="grid flex-none place-items-center rounded-md bg-surface-3 font-semibold text-muted-foreground" style={{ width: size, height: size, fontSize: size * 0.46 }}>
        {(name || "?")[0].toUpperCase()}
    </span>
)

export const personOption = (u: Pick<User, "id" | "name" | "email">, tasks: Task[], group?: string): ComboOption => ({
    value: u.id,
    label: u.name,
    sub: u.email,
    group,
    lead: <Avatar name={u.name} seed={u.id} size={24} />,
    meta: <LoadMeter n={openTaskCount(tasks, u.id)} />,
})

/**
 * Assignee choices: Unassigned, then people on the project, then everyone else.
 * Super admins aren't offered as assignees.
 */
export function assigneeOptions(users: User[], tasks: Task[], project?: Project | null): ComboOption[] {
    const people = users.filter((u) => u.role !== "SUPER_ADMIN")
    const onTeam = (u: User) => !!project?.user?.some((m) => m.id === u.id)
    // Team members the user list doesn't include (e.g. a client admin's view) still need to be offered
    const extra = (project?.user ?? []).filter((m) => !people.some((u) => u.id === m.id))
    return [
        { value: "", label: "Unassigned", lead: <GhostAvatar /> },
        ...[...people.filter(onTeam), ...extra].map((u) => personOption(u, tasks, project ? `On ${project.name}` : "People")),
        ...people.filter((u) => !onTeam(u)).map((u) => personOption(u, tasks, project ? "Everyone else" : "People")),
    ]
}

const STATUS_DOT: Record<Project["status"], string> = {
    IN_PROGRESS: "oklch(var(--chart-1))",
    COMPLETED: "oklch(var(--chart-2))",
    NOT_STARTED: "oklch(var(--border-strong))",
}

/** Active projects first, completed last. */
export const projectOptions = (projects: Project[]): ComboOption[] =>
    [...projects.filter((p) => p.status !== "COMPLETED"), ...projects.filter((p) => p.status === "COMPLETED")].map((p) => ({
        value: p.id,
        label: p.name,
        sub: p.client?.name,
        lead: <span className="size-2 flex-none rounded-sm" style={{ background: STATUS_DOT[p.status] }} />,
        meta: <StatusBadge value={p.status} />,
    }))

// ── Text tokens in titles: !priority @person #project ^day ──────────────────

export const PRIORITY_TOKENS: Record<string, Task["priority"]> = {
    urgent: "URGENT", u: "URGENT", high: "HIGH", h: "HIGH", normal: "NORMAL", n: "NORMAL", backlog: "BACKLOG", b: "BACKLOG",
}

/** Days from today for words like "today", "tmr", "fri", "3d", "2w"; null if not a day. */
export function parseDayToken(w: string): number | null {
    if (w === "today" || w === "tod") return 0
    if (w === "tomorrow" || w === "tmr") return 1
    const wd = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(w.slice(0, 3))
    if (wd >= 0 && /^[a-z]+$/.test(w)) return ((wd - new Date().getDay() + 7) % 7) || 7
    const m = /^(\d+)([dw])$/.exec(w)
    return m ? +m[1] * (m[2] === "w" ? 7 : 1) : null
}
