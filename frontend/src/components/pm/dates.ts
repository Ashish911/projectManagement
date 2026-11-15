/**
 * Parses an API date. Dates come back as epoch-millisecond strings (GraphQL String
 * over a Mongo Date) or ISO strings, depending on the field.
 */
export function parseDate(value?: string | null): Date | null {
    if (!value) return null
    const d = /^\d+$/.test(value) ? new Date(Number(value)) : new Date(value)
    return isNaN(d.getTime()) ? null : d
}

/**
 * A calendar date the API stores as UTC midnight (date of birth), as its local Date.
 * Accepts "YYYY-MM-DD", epoch-ms or ISO strings; null if there's none.
 */
export function calendarDay(value?: string | null): Date | null {
    const ymd = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    const d = parseDate(value)
    return d ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : null
}

/** A plain date, "14 Mar 1998" (dates of birth and other fixed days; never relative). */
export const plainDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

/** A date of birth from the API as "14 Mar 1998", or "" if there's none (PROF-09). */
export const birthDate = (value?: string | null) => {
    const d = calendarDay(value)
    return d ? plainDate(d) : ""
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
