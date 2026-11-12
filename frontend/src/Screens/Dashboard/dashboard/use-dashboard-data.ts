import { useEffect, useState } from "react"
import type { Project } from "@/types/projectTypes"
import type { Task } from "@/types/taskTypes"
import { parseDate } from "@/components/pm/dates"
import { getActivity, type ActivityEntry } from "@/api/activityApi"

export { useAppData as useDashboardData } from "@/components/forms/use-app-data"

/** Unique people across the given projects' teams. */
export const teamOf = (projects: Project[]) => {
    const byId = new Map<string, { id: string; name: string }>()
    projects.forEach((p) => p.user?.forEach((u) => byId.set(u.id, { id: u.id, name: u.name })))
    return [...byId.values()]
}

/** e.g. "Monday, 28 September" */
export const todayLabel = () =>
    new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })

export type Range = "7d" | "30d" | "90d"
const DAY = 86_400_000
const RANGE: Record<Range, { days: number; step: number }> = {
    "7d": { days: 7, step: 1 },   // daily
    "30d": { days: 30, step: 3 }, // every 3 days
    "90d": { days: 91, step: 7 }, // weekly
}

/** Tasks created vs resolved per bucket over the range, oldest first. */
export function createdVsResolved(tasks: Task[], range: Range) {
    const { days, step } = RANGE[range]
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const buckets = Math.ceil(days / step)
    const starts = Array.from({ length: buckets }, (_, i) => end.getTime() - (buckets - i) * step * DAY)
    const count = (field: "createdAt" | "resolvedAt") =>
        starts.map((s) => tasks.filter((t) => {
            const at = parseDate(t[field])?.getTime()
            return at != null && at > s && at <= s + step * DAY && (field === "createdAt" || t.currentStatus === "RESOLVED")
        }).length)
    const label = (s: number) => {
        const d = new Date(s + step * DAY)
        return step === 1 ? d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
    return { labels: starts.map(label), created: count("createdAt"), resolved: count("resolvedAt") }
}

/** Resolved within the last `days` days. */
export const resolvedWithin = (tasks: Task[], days: number) =>
    tasks.filter((t) => t.currentStatus === "RESOLVED" && (parseDate(t.resolvedAt)?.getTime() ?? 0) > Date.now() - days * DAY).length

export type ActivityItem = { id: string; actor?: { id: string; name: string } | null; verb: string; object: string; at: number; note?: string | null }

/** Server entries (role changes, reopens…) merged with derived task events, newest first. */
export function mergeActivity(server: ActivityEntry[], tasks: ActivityItem[], n = 5): ActivityItem[] {
    const fromServer: ActivityItem[] = server.map((e) => ({
        id: e.id, actor: e.actor ?? null, verb: e.summary, object: "", at: parseDate(e.createdAt)?.getTime() ?? 0, note: e.reason,
    }))
    return [...fromServer, ...tasks].sort((a, b) => b.at - a.at).slice(0, n)
}

/** The server's activity feed, loaded once per mount; empty if it can't be loaded. */
export function useServerActivity(limit = 20) {
    const [entries, setEntries] = useState<ActivityEntry[]>([])
    useEffect(() => {
        let live = true
        getActivity(limit).then((x) => live && setEntries(x)).catch(() => {})
        return () => { live = false }
    }, [limit])
    return entries
}

/** Recent task events derived from creation and resolution times, newest first. */
export function taskActivity(tasks: Task[], n = 5): ActivityItem[] {
    const events: ActivityItem[] = []
    tasks.forEach((t) => {
        const created = parseDate(t.createdAt)?.getTime()
        if (created) events.push({ id: `${t.id}-c`, actor: t.createdBy, verb: "created", object: t.title, at: created })
        const resolved = parseDate(t.resolvedAt)?.getTime()
        // Who resolved it isn't recorded, so resolutions aren't attributed to anyone
        if (resolved && t.currentStatus === "RESOLVED") events.push({ id: `${t.id}-r`, actor: null, verb: "Resolved", object: t.title, at: resolved })
    })
    return events.sort((a, b) => b.at - a.at).slice(0, n)
}

/** "now", "4m", "3h", "Yesterday", or a date. */
export const ago = (ms: number) => {
    const mins = Math.floor((Date.now() - ms) / 60000)
    if (mins < 1) return "now"
    if (mins < 60) return `${mins}m`
    if (mins < 1440) return `${Math.floor(mins / 60)}h`
    if (mins < 2880) return "Yesterday"
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
