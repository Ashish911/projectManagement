import { cn } from "@/lib/utils"

/** Card with a title row (title, optional subtitle and right-side slot) and a padded body. */
export function Panel({ title, sub, right, children, index = 0, className, bodyClassName }: {
    title: React.ReactNode
    sub?: React.ReactNode
    right?: React.ReactNode
    children: React.ReactNode
    /** Position in the page, used to stagger the entrance animation */
    index?: number
    className?: string
    bodyClassName?: string
}) {
    return (
        <section
            className={cn("flex min-w-0 animate-pm-in flex-col rounded-xl border bg-card shadow-sm", className)}
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <header className="flex items-start justify-between gap-3 px-[18px] pt-4">
                <div>
                    <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
                    {sub && <div className="mt-0.5 text-xs text-subtle-foreground">{sub}</div>}
                </div>
                {right}
            </header>
            <div className={cn("min-h-0 flex-1 px-[18px] pb-[18px] pt-3.5", bodyClassName)}>{children}</div>
        </section>
    )
}
