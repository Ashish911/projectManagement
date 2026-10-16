import React, { useRef, useState } from "react"
import { IconCheck, IconLock, IconSearch, IconSelector, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Check } from "@/components/pm/check"
import { useOutside } from "@/hooks/use-outside"

export type ComboOption = {
    value: string
    label: string
    sub?: string
    /** Heading this option is listed under; consecutive options share it */
    group?: string
    lead?: React.ReactNode
    meta?: React.ReactNode
}

/** Trigger styled like an input; shared by Combo and DatePicker. */
export const triggerCls =
    "flex w-full min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-card pl-3 pr-2.5 text-left text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-fast enabled:hover:border-subtle-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted-foreground group-data-[invalid=true]/field:border-[oklch(var(--st-dot-l)_var(--st-dot-c)_27)]"
export const popCls =
    "absolute left-0 right-0 top-[calc(100%+6px)] z-30 min-w-[240px] origin-top animate-fm-drop rounded-[11px] border bg-card p-1.5 shadow-lg"

/** Small round × used inside triggers and chips. */
export const ChipX = ({ onClick, label = "Remove" }: { onClick: (e: React.MouseEvent) => void; label?: string }) => (
    <span role="button" aria-label={label} onClick={onClick} className="grid size-[18px] flex-none cursor-pointer place-items-center rounded-full text-subtle-foreground hover:bg-surface-3 hover:text-foreground">
        <IconX size={12} />
    </span>
)

/**
 * Searchable select. Single mode closes on pick; `multi` keeps the list open
 * and shows picks as removable chips. Arrow keys move, Enter picks, Esc closes.
 */
export function Combo({ value, onChange, options, placeholder = "Select…", disabled, multi, searchPlaceholder = "Search…", onBlur }: {
    value: string | string[]
    onChange: (v: any) => void
    options: ComboOption[]
    placeholder?: string
    disabled?: boolean
    multi?: boolean
    searchPlaceholder?: string
    onBlur?: () => void
}) {
    const [open, setOpen] = useState(false)
    const [q, setQ] = useState("")
    const [hi, setHi] = useState(0)
    const ref = useRef<HTMLDivElement>(null)
    useOutside(ref, () => { setOpen(false); onBlur?.() }, open)

    const values = multi ? (value as string[]) : [value as string]
    const list = options.filter((o) => !q || `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    const isOn = (o: ComboOption) => values.includes(o.value)
    const pick = (o?: ComboOption) => {
        if (!o) return
        if (multi) onChange(isOn(o) ? values.filter((x) => x !== o.value) : [...values, o.value])
        else {
            onChange(o.value)
            setOpen(false)
        }
    }
    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)) }
        else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
        else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); e.stopPropagation(); pick(list[hi]) }
        else if (e.key === "Escape") { e.stopPropagation(); setOpen(false) }
    }
    const selected = options.filter(isOn)

    return (
        <div ref={ref} className="relative min-w-0">
            <button
                type="button"
                disabled={disabled}
                className={cn(triggerCls, open && "border-primary ring-[3px] ring-ring/35", multi && "flex-wrap py-1 pl-[5px]")}
                onClick={() => { setOpen(!open); setQ(""); setHi(0) }}
                onKeyDown={(e) => { if (!open && e.key === "ArrowDown") { e.preventDefault(); setOpen(true) } }}
            >
                {multi ? (
                    selected.length ? (
                        <span className="flex flex-1 flex-wrap gap-1">
                            {selected.map((o) => (
                                <span key={o.value} className="inline-flex h-[26px] animate-fm-chip items-center gap-1.5 rounded-full border bg-surface-2 pl-0.5 pr-[3px] text-[12.5px] font-medium [&_.avatar]:size-5">
                                    {o.lead}{o.label.split(" ")[0]}
                                    <ChipX onClick={(e) => { e.stopPropagation(); pick(o) }} />
                                </span>
                            ))}
                        </span>
                    ) : <span className="flex-1 pl-1.5 text-subtle-foreground">{placeholder}</span>
                ) : selected[0] ? (
                    <>{selected[0].lead}<span className="min-w-0 flex-1 truncate">{selected[0].label}</span></>
                ) : <span className="flex-1 text-subtle-foreground">{placeholder}</span>}
                {disabled ? <IconLock size={16} className="text-subtle-foreground" /> : <IconSelector size={16} className="text-subtle-foreground" />}
            </button>

            {open && (
                <div className={popCls} onKeyDown={onKey}>
                    <div className="mb-1 flex h-[34px] items-center gap-2 border-b px-2 text-subtle-foreground">
                        <IconSearch size={15} />
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => { setQ(e.target.value); setHi(0) }}
                            placeholder={searchPlaceholder}
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] text-foreground outline-none focus:ring-0"
                        />
                    </div>
                    <div className="grid max-h-[260px] gap-px overflow-y-auto">
                        {list.map((o, i) => (
                            <React.Fragment key={o.value || "_none"}>
                                {o.group && (i === 0 || list[i - 1].group !== o.group) && (
                                    <div className="px-2 pb-1 pt-2 font-mono text-[10.5px] font-medium uppercase tracking-[.06em] text-subtle-foreground">{o.group}</div>
                                )}
                                <div
                                    role="option"
                                    aria-selected={isOn(o)}
                                    className={cn("group/opt flex cursor-pointer items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-[13.5px]", i === hi && "bg-surface-2")}
                                    onMouseEnter={() => setHi(i)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => pick(o)}
                                >
                                    {multi && <Check checked={isOn(o)} onChange={() => pick(o)} label={o.label} />}
                                    {o.lead}
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate">{o.label}</div>
                                        {o.sub && <div className="truncate text-[11.5px] text-subtle-foreground">{o.sub}</div>}
                                    </div>
                                    {o.meta}
                                    {!multi && <IconCheck size={16} className={cn("text-primary", isOn(o) ? "opacity-100" : "opacity-0")} />}
                                </div>
                            </React.Fragment>
                        ))}
                        {!list.length && <div className="p-3 text-center text-xs text-subtle-foreground">No matches</div>}
                    </div>
                </div>
            )}
        </div>
    )
}
