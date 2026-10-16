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

/** Days until the coming weekday (1 = Monday … 5 = Friday); a full week if that's today. */
const untilWeekday = (wd: number) => ((wd - new Date().getDay() + 7) % 7) || 7

const sameDay = (a?: Date | null, b?: Date | null) => !!a && !!b && a.toDateString() === b.toDateString()
export const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })

/**
 * Date field with quick picks (Today, Tomorrow, Friday, Next Mon, In 2 weeks)
 * and a Monday-first month calendar. The × clears it.
 */
export function DatePicker({ value, onChange, placeholder = "No deadline" }: { value: Date | null; onChange: (d: Date | null) => void; placeholder?: string }) {
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
    const quick: [string, number][] = [["Today", 0], ["Tomorrow", 1], ["Friday", untilWeekday(5)], ["Next Mon", untilWeekday(1)], ["In 2 weeks", 14]]

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
                    <div className="mb-2 flex flex-wrap gap-1.5 border-b px-1 pb-2.5 pt-1">
                        {quick.map(([label, n]) => {
                            const d = daysFromToday(n)
                            return <Chip key={label} on={sameDay(d, value)} onClick={() => pick(d)}>{label}</Chip>
                        })}
                    </div>
                    <div className="flex items-center pb-1.5 pl-1.5 pr-0.5">
                        <b className="flex-1 text-[13.5px] font-semibold">{MONTHS[month.getMonth()]} {month.getFullYear()}</b>
                        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><IconChevronLeft /></Button>
                        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><IconChevronRight /></Button>
                    </div>
                    <div key={month.getMonth()} className="grid animate-pm-in grid-cols-7 gap-0.5">
                        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="py-1 text-center font-mono text-[11px] font-medium text-subtle-foreground">{d}</span>)}
                        {cells.map((d) => {
                            const on = sameDay(d, value)
                            return (
                                <button
                                    type="button"
                                    key={d.toDateString()}
                                    onClick={() => pick(d)}
                                    className={cn(
                                        "h-[34px] rounded-lg font-mono text-[13px] transition-colors duration-fast hover:bg-surface-2",
                                        (d < today || d.getMonth() !== month.getMonth()) && "text-subtle-foreground",
                                        d.getMonth() !== month.getMonth() && "opacity-55",
                                        sameDay(d, today) && "font-semibold shadow-[inset_0_0_0_1px_oklch(var(--border-strong))]",
                                        on && "bg-primary text-primary-foreground hover:bg-primary",
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
