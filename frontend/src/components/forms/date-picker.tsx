import { useRef, useState } from "react"
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { daysFrom } from "@/components/pm/dates"
import { Chip } from "./form-kit"
import { ChipX, popCls, triggerCls } from "./combo"
import { useOutside } from "@/hooks/use-outside"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** A date `n` days from today, at local midnight. */
export const daysFromToday = (n: number) => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** "YYYY-MM-DD" (local) for date-only fields like date of birth, or "" for none. */
export const toYmd = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "")
/** A "YYYY-MM-DD" date-only string as a local date (no timezone shift), or null. */
export const fromYmd = (s?: string | null) => {
    const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/** The same day `n` months later, clamped to the end of shorter months (Jan 31 + 1 → Feb 28). */
export const addMonths = (d: Date, n: number) => {
    const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
    return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay))
}

/** Days until the coming weekday (1 = Monday … 5 = Friday); a full week if that's today. */
const untilWeekday = (wd: number) => ((wd - new Date().getDay() + 7) % 7) || 7

const sameDay = (a?: Date | null, b?: Date | null) => !!a && !!b && a.toDateString() === b.toDateString()
export const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

/**
 * The app's one date field: quick picks, a Monday-first month calendar, and × to clear.
 * `quick` picks the chips: "task" (Today … In 2 weeks), "project" (+1 week … +6 months) or "none".
 * `birthdate` adds month/year selectors and blocks future days.
 */
export function DatePicker({ value, onChange, placeholder = "No deadline", quick: quickKind = "task", birthdate = false }: {
    value: Date | null
    onChange: (d: Date | null) => void
    placeholder?: string
    quick?: "task" | "project" | "none"
    birthdate?: boolean
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const [month, setMonth] = useState(() => { const d = value ?? new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
    useOutside(ref, () => setOpen(false), open)

    // Six weeks starting on the Monday on/before the 1st
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - ((month.getDay() + 6) % 7))
    const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
    const today = daysFromToday(0)
    const rel = value ? daysFrom(value) : null
    const pick = (d: Date) => { onChange(d); setOpen(false) }
    const quick: [string, Date][] =
        quickKind === "project" ? [["+1 week", daysFromToday(7)], ["+2 weeks", daysFromToday(14)], ["+1 month", addMonths(today, 1)], ["+3 months", addMonths(today, 3)], ["+6 months", addMonths(today, 6)]]
            : quickKind === "task" ? [["Today", today], ["Tomorrow", daysFromToday(1)], ["Friday", daysFromToday(untilWeekday(5))], ["Next Mon", daysFromToday(untilWeekday(1))], ["In 2 weeks", daysFromToday(14)]]
                : []
    const thisYear = today.getFullYear()

    return (
        <div ref={ref} className="relative min-w-0">
            <button type="button" className={cn(triggerCls, open && "border-primary ring-[3px] ring-ring/35")} onClick={() => setOpen(!open)}>
                <IconCalendar size={16} className="text-subtle-foreground" />
                {value ? (
                    <span className="min-w-0 flex-1 truncate">
                        {WEEKDAYS[value.getDay()]}, {shortDate(value)}
                        <span className={cn("ml-2 text-xs text-subtle-foreground", rel! < 0 && "tone-red tone-fg")}>
                            {rel === 0 ? "today" : rel === 1 ? "tomorrow" : rel! < 0 ? `${-rel!}d ago` : `in ${rel}d`}
                        </span>
                    </span>
                ) : <span className="flex-1 text-subtle-foreground">{placeholder}</span>}
                {value && <ChipX label="Clear date" onClick={(e) => { e.stopPropagation(); onChange(null) }} />}
            </button>

            {open && (
                <div className={cn(popCls, "right-auto w-[296px]")}>
                    {quick.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5 border-b px-1 pb-2.5 pt-1">
                            {quick.map(([label, d]) => <Chip key={label} on={sameDay(d, value)} onClick={() => pick(d)}>{label}</Chip>)}
                        </div>
                    )}
                    <div className="flex items-center gap-1 pb-1.5 pl-1.5 pr-0.5">
                        {birthdate ? (
                            <span className="flex flex-1 gap-1">
                                <select aria-label="Month" value={month.getMonth()} onChange={(e) => setMonth(new Date(month.getFullYear(), Number(e.target.value), 1))} className="h-7 rounded-md border bg-card px-1.5 text-[13px] font-semibold">
                                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                </select>
                                <select aria-label="Year" value={month.getFullYear()} onChange={(e) => setMonth(new Date(Number(e.target.value), month.getMonth(), 1))} className="num h-7 rounded-md border bg-card px-1.5 text-[13px] font-semibold">
                                    {Array.from({ length: 101 }, (_, i) => thisYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </span>
                        ) : (
                            <b className="flex-1 text-[13.5px] font-semibold">{MONTHS[month.getMonth()]} {month.getFullYear()}</b>
                        )}
                        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><IconChevronLeft /></Button>
                        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><IconChevronRight /></Button>
                    </div>
                    <div key={month.getMonth()} className="grid animate-pm-in grid-cols-7 gap-0.5">
                        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="py-1 text-center font-mono text-[11px] font-medium text-subtle-foreground">{d}</span>)}
                        {cells.map((d) => {
                            const on = sameDay(d, value)
                            const future = birthdate && d > today
                            return (
                                <button
                                    type="button"
                                    key={d.toDateString()}
                                    aria-label={d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                    aria-pressed={on}
                                    disabled={future}
                                    onClick={() => pick(d)}
                                    className={cn(
                                        "h-[34px] rounded-lg font-mono text-[13px] transition-colors duration-fast hover:bg-surface-2",
                                        (d < today || d.getMonth() !== month.getMonth()) && "text-subtle-foreground",
                                        d.getMonth() !== month.getMonth() && "opacity-55",
                                        sameDay(d, today) && "font-semibold shadow-[inset_0_0_0_1px_oklch(var(--border-strong))]",
                                        on && "bg-primary text-primary-foreground hover:bg-primary",
                                        future && "cursor-not-allowed opacity-30 hover:bg-transparent",
                                    )}
                                >
                                    {d.getDate()}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
