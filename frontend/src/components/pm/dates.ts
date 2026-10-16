/**
 * Parses an API date. Dates come back as epoch-millisecond strings (GraphQL String
 * over a Mongo Date) or ISO strings, depending on the field.
 */
export function parseDate(value?: string | null): Date | null {
    if (!value) return null
    const d = /^\d+$/.test(value) ? new Date(Number(value)) : new Date(value)
    return isNaN(d.getTime()) ? null : d
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const DAY_MS = 86_400_000

/** Whole days from today to the date (negative = past). */
export const daysFrom = (d: Date) => Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / DAY_MS)

/** Short due label: "Today", "Tomorrow", weekday within a week, else "Oct 14". */
export function dueLabel(d: Date | null): string {
    if (!d) return "—"
    const days = daysFrom(d)
    if (days === 0) return "Today"
    if (days === 1) return "Tomorrow"
    if (days > 1 && days < 7) return d.toLocaleDateString("en-US", { weekday: "short" })
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
