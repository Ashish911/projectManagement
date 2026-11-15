import { cn } from "@/lib/utils"

/** One grey placeholder block. */
export const Bone = ({ className }: { className?: string }) => <span data-skeleton className={cn("block animate-pulse rounded-md bg-surface-3", className)} />

/**
 * The app's one loading state: a skeleton shaped like what's coming (table rows, cards,
 * board columns, a panel or a few lines), announced to screen readers as a busy status.
 */
export function Loading({ kind, label, rows = 6, className }: {
    kind: "table" | "cards" | "board" | "panel" | "lines"
    label: string
    rows?: number
    className?: string
}) {
    return (
        <div role="status" aria-label={label} aria-busy="true" className={cn("animate-pm-in", className)}>
            {kind === "table" && (
                <div className="grid rounded-xl border bg-card shadow-sm [&>*+*]:border-t">
                    {Array.from({ length: rows }, (_, i) => (
                        <div key={i} data-row className="flex items-center gap-3 px-4 py-3">
                            <Bone className="size-7 rounded-full" />
                            <div className="grid flex-1 gap-1.5"><Bone className="h-3 w-1/3" /><Bone className="h-2.5 w-1/4" /></div>
                            <Bone className="h-5 w-20" />
                            <Bone className="hidden h-3 w-16 sm:block" />
                        </div>
                    ))}
                </div>
            )}
            {kind === "cards" && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                    {Array.from({ length: Math.min(rows, 6) }, (_, i) => (
                        <div key={i} className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
                            <Bone className="h-4 w-1/2" /><Bone className="h-5 w-24" /><Bone className="h-1.5 w-full" />
                            <div className="flex gap-1">{[0, 1, 2].map((j) => <Bone key={j} className="size-6 rounded-full" />)}</div>
                        </div>
                    ))}
                </div>
            )}
            {kind === "board" && (
                <div className="grid grid-cols-[repeat(4,minmax(200px,1fr))] gap-3.5 overflow-hidden">
                    {[3, 2, 1, 2].map((n, i) => (
                        <div key={i} className="grid content-start gap-2.5 rounded-xl border bg-surface-2 p-2.5">
                            <Bone className="h-5 w-20" />
                            {Array.from({ length: n }, (_, j) => <div key={j} className="grid gap-2 rounded-lg border bg-card p-3"><Bone className="h-4 w-12" /><Bone className="h-3 w-4/5" /></div>)}
                        </div>
                    ))}
                </div>
            )}
            {kind === "panel" && (
                <div className="grid gap-4">
                    <Bone className="h-7 w-1/3" />
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">{[0, 1, 2].map((i) => <Bone key={i} className="h-20 rounded-xl" />)}</div>
                    <Bone className="h-48 rounded-xl" />
                </div>
            )}
            {kind === "lines" && (
                <div className="grid gap-2 py-1">{Array.from({ length: Math.min(rows, 4) }, (_, i) => <Bone key={i} className={cn("h-3", i % 2 ? "w-2/3" : "w-5/6")} />)}</div>
            )}
            <span className="sr-only">{label}…</span>
        </div>
    )
}

/**
 * A thin pulsing bar for a refetch of data that's already on screen (after a save, a live
 * refresh or a tab focus). First loads use the skeletons above instead.
 */
export function RefreshBar({ busy, className }: { busy: boolean; className?: string }) {
    if (!busy) return null
    return (
        <div role="status" aria-label="Refreshing" className={cn("pointer-events-none h-0.5 overflow-hidden", className)}>
            <span className="block h-full w-full animate-pulse bg-primary/70" />
        </div>
    )
}
