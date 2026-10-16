import { useId } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

type Tab<T extends string> = { value: T; label: string; count?: number; alert?: boolean }

/** Underline tabs. Pair with <AnimatePresence mode="wait"> around the panel for the content transition. */
export function AnimatedTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: Tab<T>[] }) {
  const id = useId()
  return (
    <div role="tablist" className="flex gap-0.5 border-b">
      {tabs.map((t) => {
        const on = t.value === value
        return (
          <button key={t.value} role="tab" aria-selected={on} onClick={() => onChange(t.value)}
            className={cn("relative flex items-center gap-1.5 px-2.5 py-2 text-[13px] font-medium",
              on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
            {t.count != null && (
              <span className={cn("num rounded-full px-1.5 py-px text-[11px]",
                t.alert && t.count ? "tone-red tone-bg tone-fg" : "bg-surface-3 text-muted-foreground")}>{t.count}</span>
            )}
            {on && <motion.span layoutId={id} transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-x-0 -bottom-px h-0.5 rounded bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}
