import { cn } from "@/lib/utils"

/** Card that holds a data table and scrolls it sideways on narrow screens. */
export function TableCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("animate-pm-in overflow-x-auto rounded-xl border bg-card shadow-sm", className)}>{children}</div>
}

/** Table styles from the design: quiet header, row dividers, hover and selected rows. */
export const tableCls = {
    table: "w-full border-collapse text-[13.5px]",
    th: "whitespace-nowrap border-b px-3.5 py-[11px] text-left text-xs font-medium text-subtle-foreground",
    td: "border-b px-3.5 py-[11px] align-middle [tr:last-child>&]:border-b-0",
    tr: "animate-pm-in transition-colors duration-fast hover:bg-surface-2",
    trSelected: "!bg-accent",
}
