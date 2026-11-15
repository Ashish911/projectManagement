import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { IconAlertTriangle, IconCalendar, IconCircleCheck, IconFolder, IconListDetails, IconMessagePlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { PageHead } from "@/components/pm/page-head"
import { Panel } from "@/components/pm/panel"
import { EmptyState } from "@/components/pm/empty-state"
import { StatusBadge } from "@/components/pm/status-badge"
import { CountUp } from "@/components/pm/count-up"
import { Progress } from "@/components/pm/progress"
import { AnimatedTabs } from "@/components/pm/animated-tabs"
import { TaskRow, dueBucket, isMyWork, isOverdue } from "@/components/pm/task-row"
import { projectProgress } from "@/components/pm/project-card"
import { daysFrom, parseDate } from "@/components/pm/dates"
import { useForms } from "@/components/forms/forms-context"
import { useTaskActions } from "@/components/forms/task-actions"
import { cn } from "@/lib/utils"
import { resolvedWithin, mergeActivity, taskActivity, useServerActivity, todayLabel, useDashboardData } from "./use-dashboard-data"
import { ActivityList } from "./widgets"
import { Bone, Loading } from "@/components/pm/loading"

const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

type Tab = "overdue" | "today" | "week"
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

/** Dashboard for USER: their own work first. */
export function MemberDashboard() {
    const navigate = useNavigate()
    const openForm = useForms()
    const { toggleResolved } = useTaskActions()
    const { profile, projects, tasks, tasksLoaded } = useDashboardData()
    const serverActivity = useServerActivity()
    const firstName = profile?.name?.split(" ")[0] ?? ""

    // My work: tasks assigned to me, or with a subtask assigned to me (same rule as the Tasks list)
    const mine = tasks.filter((t) => isMyWork(t, profile?.id))
    const open = mine.filter((t) => t.currentStatus !== "RESOLVED")
    const groups: { value: Tab; label: string; alert?: boolean }[] = [
        { value: "overdue", label: "Overdue", alert: true },
        { value: "today", label: "Today" },
        { value: "week", label: "This week" },
    ]
    const inGroup = (g: Tab) => open.filter((t) => dueBucket(t) === g)
    const overdue = mine.filter(isOverdue).length
    const dueSoon = inGroup("today").length + inGroup("week").length
    const [tab, setTab] = useState<Tab>(overdue ? "overdue" : "today")

    // Tasks due on each day of the current week (Monday first)
    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const week = WEEKDAYS.map((d, i) => {
        const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
        return { d, today: daysFrom(day) === 0, n: open.filter((t) => { const due = parseDate(t.deadline); return !!due && due.toDateString() === day.toDateString() }).length }
    })
    const weekMax = Math.max(3, ...week.map((w) => w.n))

    const mini = [
        { label: "Open", value: open.length, icon: IconListDetails },
        { label: "Overdue", value: overdue, icon: IconAlertTriangle, bad: true },
        { label: "Due this week", value: dueSoon, icon: IconCalendar },
        { label: "Resolved / wk", value: resolvedWithin(mine, 7), icon: IconCircleCheck },
    ]
    const shown = inGroup(tab)

    return (
        <>
            <PageHead
                eyebrow={todayLabel()}
                title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
                sub={
                    <span className="text-[15px]">
                        {overdue > 0 && <><b className="tone-red tone-fg font-semibold">{overdue} overdue</b> and </>}
                        <b className="font-semibold text-foreground">{dueSoon} due this week</b>. {open.length ? (overdue ? "Start with the red one." : "") : "All clear."}
                    </span>
                }
            >
                <Button onClick={() => openForm("log-update")} disabled={!open.length}><IconMessagePlus />Log update</Button>
            </PageHead>

            <div className="grid grid-cols-1 gap-4 min-[920px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <div className="grid min-w-0 content-start gap-4">
                    <Panel index={0} title="Needs attention" sub="Your tasks, soonest first" bodyClassName="px-2.5 pb-3 pt-1">
                        <div className="px-2">
                            <AnimatedTabs value={tab} onChange={setTab} tabs={groups.map((g) => ({ ...g, count: inGroup(g.value).length }))} />
                        </div>
                        <div key={tab} className="min-h-[150px] animate-pm-tab pt-1.5">
                            {!tasksLoaded ? (
                                <Loading kind="lines" label="Loading tasks" />
                            ) : shown.length ? (
                                shown.map((t, k) => (
                                    <div key={t.id} className="animate-pm-in" style={{ animationDelay: `${k * 50}ms` }}>
                                        <TaskRow task={t} onOpen={() => openForm("task-view", { id: t.id })} onToggle={t.assignedTo?.id === profile?.id ? () => toggleResolved(t) : undefined} />
                                    </div>
                                ))
                            ) : (
                                <div className="flex animate-pm-in items-center justify-center gap-2.5 py-10 text-muted-foreground">
                                    <IconCircleCheck size={22} className="text-primary" />Nothing here. Nice.
                                </div>
                            )}
                        </div>
                    </Panel>
                    <Panel index={1} title="My projects">
                        {projects.length === 0 ? (
                            <EmptyState icon={IconFolder} title="You're not on any project yet" />
                        ) : (
                            <div className="grid gap-3">
                                {projects.map((p) => {
                                    const { pct } = projectProgress(tasks, p.id)
                                    const due = parseDate(p.dueDate)
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => navigate(`/projects/${p.id}`)}
                                            className="grid cursor-pointer grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-4 rounded-xl border bg-card p-3.5 transition duration-base ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate font-medium">{p.name}</div>
                                                <div className="truncate text-xs text-subtle-foreground">{p.client?.name ?? "No client"}{due ? ` · due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</div>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <Progress value={pct} className="flex-1" />
                                                <span className="num w-[34px] text-right text-[12.5px]">{pct}%</span>
                                            </div>
                                            <StatusBadge value={p.status} />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </Panel>
                </div>

                <div className="grid min-w-0 content-start gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        {mini.map(({ label, value, icon: I, bad }, i) => (
                            <div key={label} className="animate-pm-in rounded-xl border bg-card p-3.5 shadow-sm transition duration-base ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md" style={{ animationDelay: `${i * 60}ms` }}>
                                <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"><I size={15} className="text-subtle-foreground" />{label}</div>
                                {tasksLoaded ? (
                                    <div className={cn("num mt-1.5 text-[28px] font-medium", bad && value > 0 && "tone-red tone-fg")}><CountUp value={value} /></div>
                                ) : (
                                    <div role="status" aria-label={`Loading ${label}`} aria-busy="true" className="mt-1.5"><Bone className="h-[30px] w-12" /></div>
                                )}
                            </div>
                        ))}
                    </div>
                    <Panel index={4} title="My week" sub="Tasks due per day">
                        <div className="flex h-[90px] items-end gap-2">
                            {week.map((w, k) => (
                                <div key={k} className="grid h-full flex-1 content-end justify-items-center gap-1.5">
                                    <span
                                        title={`${w.n} due`}
                                        className={cn("w-full origin-bottom animate-grow-y rounded-[5px]", w.today ? "bg-primary" : "bg-surface-3")}
                                        style={{ height: w.n ? (w.n / weekMax) * 72 : 3, animationDelay: `${k * 50}ms` }}
                                    />
                                    <span className={cn("text-xs", w.today ? "font-semibold text-foreground" : "text-subtle-foreground")}>{w.d}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                    <Panel index={5} title="Activity">
                        <ActivityList items={mergeActivity(serverActivity, taskActivity(tasks, 4), 4)} />
                    </Panel>
                </div>
            </div>
        </>
    )
}
