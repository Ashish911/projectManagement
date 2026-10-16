import { cn } from "@/lib/utils"

type Tone = "blue" | "green" | "amber" | "red" | "violet" | "teal" | "neutral" | "outline"

// One source of truth: Mongoose enums → label + tone
export const STATUS = {
  // Project.status
  NOT_STARTED: ["Not started", "outline"], IN_PROGRESS: ["In progress", "blue"], COMPLETED: ["Completed", "green"],
  // Task.currentStatus
  NEW: ["New", "neutral"], REOPENED: ["Reopened", "amber"], RESOLVED: ["Resolved", "green"],
  // Task.priority
  URGENT: ["Urgent", "red"], HIGH: ["High", "amber"], NORMAL: ["Normal", "neutral"], BACKLOG: ["Backlog", "outline"],
  // User.role
  SUPER_ADMIN: ["Super admin", "violet"], CLIENT_ADMIN: ["Client admin", "teal"], USER: ["User", "neutral"],
} as const satisfies Record<string, readonly [string, Tone]>

export type StatusKey = keyof typeof STATUS

export function StatusBadge({ value, dot = true, className }: { value: StatusKey; dot?: boolean; className?: string }) {
  const [label, tone] = STATUS[value]
  return <Tag tone={tone} dot={dot} className={className}>{label}</Tag>
}

export function Tag({ tone, dot = true, className, children }: { tone: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  const toned = tone !== "neutral" && tone !== "outline"
  return (
    <span className={cn(
      "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-sm px-2 text-xs font-medium",
      toned && `tone-${tone} tone-bg tone-fg`,
      tone === "neutral" && "bg-surface-3 text-muted-foreground",
      tone === "outline" && "text-subtle-foreground ring-1 ring-inset ring-border-strong",
      className,
    )}>
      {dot && <span className={cn("size-1.5 rounded-full",
        toned && "tone-dot", tone === "neutral" && "bg-subtle-foreground",
        tone === "outline" && "ring-[1.5px] ring-inset ring-subtle-foreground")} />}
      {children}
    </span>
  )
}
