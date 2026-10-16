import { IconSearch } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

/** Text input with a leading search icon, styled like the design's inputs. */
export function SearchBox({ value, onChange, placeholder, className }: {
    value: string
    onChange: (v: string) => void
    placeholder: string
    className?: string
}) {
    return (
        <label className={cn("flex h-[34px] w-[260px] max-w-full items-center gap-2 rounded-lg border border-border-strong bg-card px-3 text-[13.5px] focus-within:ring-[3px] focus-within:ring-ring/35", className)}>
            <IconSearch size={16} className="flex-none text-subtle-foreground" />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 outline-none placeholder:text-subtle-foreground focus:ring-0"
            />
        </label>
    )
}
