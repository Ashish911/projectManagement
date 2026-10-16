import { IconArrowUpRight, IconCalendar } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/projectTypes"
import type { Task } from "@/types/taskTypes"
import { StatusBadge } from "./status-badge"
import { AvatarGroup } from "./avatar"
import { Progress } from "./progress"
import { parseDate } from "./dates"

/** Share of a project's tasks that are resolved, 0–100. */
export const projectProgress = (tasks: Task[], projectId: string) => {
    const mine = tasks.filter((t) => t.project?.id === projectId)
    return { open: mine.filter((t) => t.currentStatus !== "RESOLVED").length, pct: mine.length ? Math.round((mine.filter((t) => t.currentStatus === "RESOLVED").length / mine.length) * 100) : 0 }
}

/** Project summary card used in the grid, the board and the project form's live preview. */
export function ProjectCard({ project, open, pct, index = 0, onClick, preview }: {
    project: Pick<Project, "name" | "status" | "description" | "client" | "user" | "dueDate">
    open: number
    pct: number
    index?: number
    onClick?: () => void
    /** No hover or entrance animation */
    preview?: boolean
}) {
    const due = parseDate(project.dueDate)
    const team = project.user ?? []
    return (
        <div
            onClick={onClick}
            className={cn(
                "group grid gap-3.5 rounded-xl border bg-card p-[18px] shadow-sm",
                !preview && "animate-pm-in cursor-pointer transition duration-base ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
            )}
            style={preview ? undefined : { animationDelay: `${index * 50}ms` }}
        >
            <div className="flex items-center justify-between gap-2">
                <StatusBadge value={project.status} />
                <span className={cn("num flex items-center gap-1 text-xs", project.status === "COMPLETED" ? "text-subtle-foreground" : "text-muted-foreground")}>
                    <IconCalendar size={13} />
                    {due ? due.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date"}
                </span>
            </div>
            <div>
                <div className="truncate text-base font-semibold tracking-[-0.01em]">{project.name}</div>
                <div className="mt-0.5 truncate text-xs text-subtle-foreground">{project.client?.name ?? "No client"}</div>
            </div>
            <div className="line-clamp-2 min-h-[38px] text-[13px] leading-[1.45] text-muted-foreground">
                {project.description || <span className="text-subtle-foreground">No description</span>}
            </div>
            <div>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                    <span className="text-muted-foreground">{open} open {open === 1 ? "task" : "tasks"}</span>
                    <span className="num">{pct}%</span>
                </div>
                <Progress key={pct} value={pct} />
            </div>
            <div className="flex items-center justify-between">
                {team.length ? <AvatarGroup people={team} size={26} /> : <span className="text-xs text-subtle-foreground">No team yet</span>}
                <IconArrowUpRight size={18} className="text-subtle-foreground transition duration-base ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
        </div>
    )
}
