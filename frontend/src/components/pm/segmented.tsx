import { useId } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

type Opt<T extends string> = { value: T; label: React.ReactNode }

export function Segmented<T extends string>({ value, onChange, options, size = "md" }: { value: T; onChange: (v: T) => void; options: Opt<T>[]; size?: "sm" | "md" }) {
  const id = useId()
  return (
    <div role="group" className="inline-flex rounded-lg border bg-surface-2 p-[3px]">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} aria-pressed={on} onClick={() => onChange(o.value)}
            className={cn("relative h-[26px] whitespace-nowrap rounded-md text-[12.5px] font-medium transition-colors",
              size === "sm" ? "px-2.5" : "px-3", on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {on && <motion.span layoutId={id} transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-border" />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
