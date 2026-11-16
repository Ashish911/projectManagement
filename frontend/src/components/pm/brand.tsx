import { cn } from "@/lib/utils"

/**
 * The ProjoMan lockup: the mascot mark as an app icon, then the wordmark in the UI font,
 * so it sits in the interface like the nav items around it. Hide the wordmark with
 * `wordmarkClassName` (collapsed sidebar); the lockup keeps its accessible name.
 * Original artwork lives in `frontend/brand-source/`.
 */
export function BrandLogo({ className, wordmarkClassName }: { className?: string; wordmarkClassName?: string }) {
    return (
        <span aria-label="ProjoMan" className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
            <img
                src="/brand/projoman-icon.png"
                alt=""
                draggable={false}
                className="size-8 flex-none select-none rounded-[9px] shadow-sm ring-1 ring-border"
            />
            <span aria-hidden className={cn("truncate text-base font-semibold tracking-[-0.02em] text-foreground", wordmarkClassName)}>ProjoMan</span>
        </span>
    )
}
