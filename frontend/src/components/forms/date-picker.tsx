import { useRef, useState } from "react"
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { calendarDay, daysFrom, plainDate } from "@/components/pm/dates"
import { Chip, SelectField } from "./form-kit"
import { ChipX, Floating, triggerCls } from "./combo"
import { useOutside } from "@/hooks/use-outside"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const headerSelect = "h-8 rounded-md pl-2.5 pr-7 text-[13px] font-semibold"
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** A date `n` days from today, at local midnight. */
export const daysFromToday = (n: number) => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** "YYYY-MM-DD" (local) for date-only fields like date of birth, or "" for none. */
export const toYmd = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "")
/** A date-only value ("YYYY-MM-DD", or the API's stored date of birth) as a local date with no timezone shift, or null. */
export const fromYmd = (s?: string | null) => calendarDay(s)

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
    const pop = useRef<HTMLDivElement>(null)
    const [month, setMonth] = useState(() => { const d = value ?? new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
    useOutside([ref, pop], () => setOpen(false), open)

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
                {value && birthdate ? (
                    // A fixed day: plain date with the year, never "1999d ago" (PROF-09)
                    <span className="min-w-0 flex-1 truncate">{plainDate(value)}</span>
                ) : value ? (
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
                <Floating ref={pop} anchor={ref} role="dialog" aria-label="Choose a date" className="w-[296px]">
                    {quick.length > 0 && (
                        <div className="mb-2 grid grid-cols-3 gap-1.5 border-b px-1 pb-2.5 pt-1 [&>*]:justify-center">
                            {quick.map(([label, d]) => <Chip key={label} on={sameDay(d, value)} onClick={() => pick(d)}>{label}</Chip>)}
                        </div>
                    )}
                    <div className="flex h-8 items-center gap-1 px-1 pb-1">
                        {birthdate ? (
                            <span className="flex flex-1 gap-1.5">
                                <SelectField label="Month" value={month.getMonth()} onChange={(m) => setMonth(new Date(month.getFullYear(), m, 1))}
                                    options={MONTHS.map((m, i) => [i, m] as const)} selectClassName={headerSelect} />
                                <SelectField label="Year" value={month.getFullYear()} onChange={(y) => setMonth(new Date(y, month.getMonth(), 1))}
                                    options={Array.from({ length: 101 }, (_, i) => [thisYear - i, String(thisYear - i)] as const)} selectClassName={cn(headerSelect, "num")} />
                            </span>
                        ) : (
                            <b className="flex-1 pl-1.5 text-[13.5px] font-semibold">{MONTHS[month.getMonth()]} {month.getFullYear()}</b>
                        )}
                        <Button type="button" variant="ghost" size="icon" className="size-8 [&_svg]:size-4" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><IconChevronLeft /></Button>
                        <Button type="button" variant="ghost" size="icon" className="size-8 [&_svg]:size-4" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><IconChevronRight /></Button>
                    </div>
                    <div key={month.getMonth()} className="grid animate-pm-in grid-cols-7 gap-0.5 px-0.5 pb-0.5">
                        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="pb-1 pt-1.5 text-center font-mono text-[11px] font-medium text-subtle-foreground">{d}</span>)}
                        {cells.map((d) => {
                            const on = sameDay(d, value)
                            const isToday = sameDay(d, today)
                            const outside = d.getMonth() !== month.getMonth()
                            // Past days are dimmed for due dates only; every date of birth is in the past
                            const past = !birthdate && d < today
                            const future = birthdate && d > today
                            return (
                                <button
                                    type="button"
                                    key={d.toDateString()}
                                    aria-label={d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                    aria-pressed={on}
                                    aria-current={isToday ? "date" : undefined}
                                    data-today={isToday || undefined}
                                    data-past={past || undefined}
                                    data-outside={outside || undefined}
                                    disabled={future}
                                    onClick={() => pick(d)}
                                    className={cn(
                                        "relative grid h-9 place-items-center rounded-lg font-mono text-[13px] text-foreground outline-none transition-colors duration-fast",
                                        "hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-ring/35",
                                        "data-[past]:text-muted-foreground data-[outside]:text-subtle-foreground data-[outside]:opacity-60",
                                        "data-[today]:font-semibold data-[today]:text-primary",
                                        // Today: a small dot under the number, kept when it's also the picked day
                                        "after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-current after:opacity-0 data-[today]:after:opacity-100",
                                        on && "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary data-[today]:text-primary-foreground",
                                        future && "cursor-not-allowed opacity-30 hover:bg-transparent",
                                    )}
                                >
                                    {d.getDate()}
                                </button>
                            )
                        })}
                    </div>
                </Floating>
            )}
        </div>
    )
}
