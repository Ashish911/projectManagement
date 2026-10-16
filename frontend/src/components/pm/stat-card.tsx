import type { Icon } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { CountUp } from "./count-up"
import { Sparkline } from "./charts/sparkline"
import { tokenColor } from "./charts/smooth"

type Props = {
    label: string
    icon: Icon
    /** null shows a dash, for metrics whose data isn't available yet */
    value: number | null
    suffix?: string
    delta?: number
    sub?: React.ReactNode
    spark?: number[]
    /** "Bad" metrics (e.g. overdue) render red and invert the delta colour */
    bad?: boolean
    index?: number
    onClick?: () => void
}

/** KPI card: icon chip + label, large count-up number, optional sparkline and change indicator. */
export function StatCard({ label, icon: I, value, suffix, delta, sub, spark, bad, index = 0, onClick }: Props) {
    const good = delta == null || delta === 0 ? null : (delta > 0) !== !!bad
    return (
        <div
            onClick={onClick}
            className={cn(
                "grid min-w-0 animate-pm-in gap-2.5 rounded-xl border bg-card px-[18px] py-4 shadow-sm",
                "transition duration-base ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
                onClick && "cursor-pointer",
            )}
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <div className="flex items-center gap-2">
                <span className="grid size-[26px] place-items-center rounded-[7px] border bg-surface-2 text-muted-foreground"><I size={15} /></span>
                <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-end justify-between gap-2">
                <div className={cn("num text-[34px] font-medium leading-none", bad && value && "tone-red tone-fg")}>
                    {value == null ? <span className="text-subtle-foreground">—</span> : <CountUp value={value} />}
                    {suffix && value != null && <span className="text-base text-subtle-foreground">{suffix}</span>}
                </div>
                {spark && <Sparkline points={spark} color={tokenColor(bad ? "chart-4" : "chart-1")} />}
            </div>
            <div className="flex items-center gap-2 text-[12.5px] text-subtle-foreground">
                {delta != null && (
                    <span className={cn("num text-xs font-medium", good === true && "tone-green tone-fg", good === false && "tone-red tone-fg")}>
                        {delta === 0 ? "±0" : `${delta > 0 ? "↑" : "↓"}${Math.abs(delta)}`}
                    </span>
                )}
                <span>{sub}</span>
            </div>
        </div>
    )
}
