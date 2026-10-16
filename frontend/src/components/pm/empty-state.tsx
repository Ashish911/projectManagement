import type { Icon } from "@tabler/icons-react"
import { IconHourglassEmpty } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

/** Centred icon + message for panels with nothing to show (or data not available yet). */
export function EmptyState({ icon: I = IconHourglassEmpty, title, hint, className }: {
    icon?: Icon
    title: string
    hint?: string
    className?: string
}) {
    return (
        <div className={cn("flex animate-pm-in flex-col items-center justify-center gap-1.5 py-8 text-center", className)}>
            <span className="mb-1 grid size-9 place-items-center rounded-lg border bg-surface-2 text-subtle-foreground"><I size={18} /></span>
            <div className="text-[13.5px] font-medium text-muted-foreground">{title}</div>
            {hint && <div className="max-w-[260px] text-xs text-subtle-foreground">{hint}</div>}
        </div>
    )
}
