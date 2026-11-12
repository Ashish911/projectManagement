import { IconCircleCheck, IconHistory, IconUsersGroup } from "@tabler/icons-react"
import { Avatar } from "@/components/pm/avatar"
import { EmptyState } from "@/components/pm/empty-state"
import type { Task } from "@/types/taskTypes"
import { ago, type ActivityItem } from "./use-dashboard-data"

const WORKLOAD_COLORS = ["oklch(var(--chart-4))", "oklch(var(--chart-3))", "oklch(var(--chart-1))"]
const WORKLOAD_PRIORITIES = ["URGENT", "HIGH", "NORMAL"] as const
const SCALE = 7 // Bar is full at 7 open tasks

/** Open tasks per assignee as stacked bars by priority (urgent, high, normal). */
export function Workload({ tasks, limit = 5 }: { tasks: Task[]; limit?: number }) {
    const byPerson = new Map<string, { person: { id: string; name: string }; counts: number[] }>()
    tasks
        .filter((t) => t.currentStatus !== "RESOLVED" && t.assignedTo)
        .forEach((t) => {
            const row = byPerson.get(t.assignedTo!.id) ?? { person: t.assignedTo!, counts: [0, 0, 0] }
            const k = WORKLOAD_PRIORITIES.indexOf(t.priority as (typeof WORKLOAD_PRIORITIES)[number])
            row.counts[k < 0 ? 2 : k]++ // Backlog counts as normal
            byPerson.set(t.assignedTo!.id, row)
        })
    const rows = [...byPerson.values()].sort((a, b) => b.counts.reduce((x, y) => x + y) - a.counts.reduce((x, y) => x + y)).slice(0, limit)

    if (!rows.length) return <EmptyState icon={IconUsersGroup} title="No open assigned tasks" />
    return (
        <div className="grid gap-3.5">
            {rows.map(({ person, counts }, r) => {
                const total = counts.reduce((a, b) => a + b, 0)
                return (
                    <div key={person.id} className="grid grid-cols-[24px_76px_minmax(0,1fr)_20px] items-center gap-2.5">
                        <Avatar name={person.name} seed={person.id} size={24} />
                        <span className="truncate text-[13px]">{person.name.split(" ")[0]}</span>
                        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-3">
                            {counts.map((n, k) => n > 0 && (
                                <span key={k} className="origin-left animate-pm-grow" style={{ flex: n, background: WORKLOAD_COLORS[k], animationDelay: `${200 + r * 80}ms` }} />
                            ))}
                            <span style={{ flex: Math.max(0, SCALE - total) }} />
                        </div>
                        <span className="num text-right text-[12.5px]">{total}</span>
                    </div>
                )
            })}
            <div className="mt-0.5 flex gap-3.5">
                {["Urgent", "High", "Normal"].map((l, k) => (
                    <span key={l} className="flex items-center gap-1.5 text-xs text-subtle-foreground"><span className="size-2 rounded-sm" style={{ background: WORKLOAD_COLORS[k] }} />{l}</span>
                ))}
            </div>
        </div>
    )
}

/** Recent events: who did what to which task, and when. */
export function ActivityList({ items }: { items: ActivityItem[] }) {
    if (!items.length) return <EmptyState icon={IconHistory} title="No activity yet" hint="Task and role changes show up here." />
    return (
        <div className="grid gap-3.5">
            {items.map((e) => (
                <div key={e.id} className="flex items-start gap-2.5">
                    {e.actor ? (
                        <Avatar name={e.actor.name} seed={e.actor.id} size={26} />
                    ) : (
                        <span className="tone-green tone-bg tone-fg grid size-[26px] flex-none place-items-center rounded-full"><IconCircleCheck size={15} /></span>
                    )}
                    <div className="min-w-0 flex-1 text-[13px] leading-[1.4]">
                        <span className="text-muted-foreground">{e.actor ? `${e.actor.name.split(" ")[0]} ${e.verb}` : e.verb}</span>{" "}
                        <span className="font-medium">{e.object}</span>
                        {e.note && <div className="mt-0.5 text-xs text-subtle-foreground">“{e.note}”</div>}
                    </div>
                    <span className="whitespace-nowrap text-xs text-subtle-foreground">{ago(e.at)}</span>
                </div>
            ))}
        </div>
    )
}
