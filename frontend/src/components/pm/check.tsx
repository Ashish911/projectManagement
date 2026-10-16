import { IconCheck, IconMinus } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

/** Small square checkbox. `mixed` shows a dash (some rows selected). */
export function Check({ checked, mixed, onChange, disabled, label }: {
    checked: boolean
    mixed?: boolean
    onChange: (next: boolean) => void
    disabled?: boolean
    label: string
}) {
    const on = checked || mixed
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={mixed ? "mixed" : checked}
            aria-label={label}
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
            className={cn(
                "grid size-4 flex-none place-items-center rounded-[5px] border-[1.5px] border-border-strong transition-all duration-fast disabled:opacity-40",
                on && "border-primary bg-primary text-primary-foreground",
            )}
        >
            {mixed ? <IconMinus size={11} stroke={3} /> : checked && <IconCheck size={12} stroke={3} />}
        </button>
    )
}
