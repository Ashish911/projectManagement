import { cn } from "@/lib/utils"

/** Thin rounded progress bar that grows in from the left. */
export function Progress({ value, color, className, delay = 0 }: { value: number; color?: string; className?: string; delay?: number }) {
    return (
        <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}>
            <i
                className="block h-full origin-left animate-pm-grow rounded-[inherit] bg-primary"
                style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color, animationDelay: `${delay}ms` }}
            />
        </div>
    )
}
