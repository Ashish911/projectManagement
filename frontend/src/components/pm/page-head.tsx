/** Page title block with optional eyebrow and subtitle; children render as the action buttons on the right. */
export function PageHead({ title, sub, eyebrow, children }: {
    title: React.ReactNode
    sub?: React.ReactNode
    eyebrow?: React.ReactNode
    children?: React.ReactNode
}) {
    return (
        <div className="mb-1.5 flex flex-wrap items-end justify-between gap-4">
            <div>
                {eyebrow && <div className="mb-0.5 text-[13px] text-subtle-foreground">{eyebrow}</div>}
                <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.025em]">{title}</h1>
                {sub && <div className="mt-1 text-muted-foreground">{sub}</div>}
            </div>
            {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        </div>
    )
}
