import { useLocalStorage } from "@/hooks/use-local-storage"
import { useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { AnimatePresence, motion } from "motion/react"
import { setClientsFilter } from "@/redux/actions/clientsActions"
import {
    IconAlertTriangle,
    IconBellRinging,
    IconBuilding,
    IconCalendarDue,
    IconCircleCheck,
    IconFolder,
    IconPlus,
    IconTrash,
    IconUserPlus,
    IconUserQuestion,
    IconUsers,
    IconUsersGroup,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { PageHead } from "@/components/pm/page-head"
import { StatCard } from "@/components/pm/stat-card"
import { Panel } from "@/components/pm/panel"
import { EmptyState } from "@/components/pm/empty-state"
import { StatusBadge } from "@/components/pm/status-badge"
import { AvatarGroup } from "@/components/pm/avatar"
import { CountUp } from "@/components/pm/count-up"
import { Segmented } from "@/components/pm/segmented"
import { Progress } from "@/components/pm/progress"
import { Donut } from "@/components/pm/charts/donut"
import { AreaChart, LegendLine } from "@/components/pm/charts/area-chart"
import { tokenColor } from "@/components/pm/charts/smooth"
import { TaskRow, dueBucket, isOverdue } from "@/components/pm/task-row"
import { projectProgress } from "@/components/pm/project-card"
import { parseDate } from "@/components/pm/dates"
import { useForms } from "@/components/forms/forms-context"
import { useTaskActions } from "@/components/forms/task-actions"
import type { Client } from "@/types/clientTypes"
import type { Project } from "@/types/projectTypes"
import type { Task } from "@/types/taskTypes"
import { createdVsResolved, resolvedWithin, mergeActivity, taskActivity, useServerActivity, teamOf, todayLabel, useDashboardData, type Range } from "./use-dashboard-data"
import { managedProjects } from "@/components/forms/use-app-data"
import { ActivityList, Workload } from "./widgets"
import { Loading } from "@/components/pm/loading"

const RANGE_SUB: Record<Range, string> = { "7d": "Daily, last 7 days", "30d": "Every 3 days, last 30 days", "90d": "Weekly, last 90 days" }
const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 }
const RANGE_KEY = "pm-dash-range" // Remembered per browser

const isRange = (v: unknown): v is Range => typeof v === "string" && v in RANGE_DAYS

/** Soonest first; tasks without a deadline last. */
const byDeadline = (a: Task, b: Task) => (parseDate(a.deadline)?.getTime() ?? Infinity) - (parseDate(b.deadline)?.getTime() ?? Infinity)

/** Dashboard for SUPER_ADMIN (everything) and CLIENT_ADMIN (their client's projects). */
export function AdminDashboard() {
    const [range, setRange] = useLocalStorage<Range>(RANGE_KEY, "30d", { raw: true, isValid: isRange })
    const navigate = useNavigate()
    const openForm = useForms()
    const { toggleResolved } = useTaskActions()
    const { profile, users, clients, projects, tasks, tasksLoaded } = useDashboardData()
    const serverActivity = useServerActivity()
    const isSuper = profile?.role === "SUPER_ADMIN"
    // A client admin adds tasks only to projects they run, and projects only under a client they run
    const canAddTask = managedProjects(profile?.role, projects).length > 0
    const canAddProject = isSuper || clients.length > 0

    const count = (status: Project["status"]) => projects.filter((p) => p.status === status).length
    const inProgress = count("IN_PROGRESS")
    const completed = count("COMPLETED")
    const notStarted = count("NOT_STARTED")
    const team = teamOf(projects)
    const openTasks = tasks.filter((t) => t.currentStatus !== "RESOLVED")
    const overdue = tasks.filter(isOverdue).length
    const series = createdVsResolved(tasks, range)
    const upcoming = tasks.filter((t) => ["overdue", "today", "week"].includes(dueBucket(t))).sort(byDeadline).slice(0, 5)
    const loaded = (n: number) => (tasksLoaded ? n : null)

    const kpis = isSuper
        ? [
            { label: "Users", icon: IconUsers, value: users.length, sub: `${users.filter((u) => u.role === "SUPER_ADMIN").length} super · ${users.filter((u) => u.role === "CLIENT_ADMIN").length} client admins`, onClick: () => navigate("/users") },
            { label: "Clients", icon: IconBuilding, value: clients.length, sub: `${clients.filter((c) => !c.assignedAdmin).length} without an admin`, onClick: () => navigate("/clients") },
            { label: "Active projects", icon: IconFolder, value: inProgress, suffix: ` / ${projects.length}`, sub: `${completed} completed · ${notStarted} not started`, onClick: () => navigate("/projects") },
            { label: "Overdue tasks", icon: IconAlertTriangle, value: loaded(overdue), bad: true, sub: `of ${openTasks.length} open`, onClick: () => navigate("/tasks") },
        ]
        : [
            { label: "Projects", icon: IconFolder, value: projects.length, sub: `${inProgress} in progress`, onClick: () => navigate("/projects") },
            { label: "Team members", icon: IconUsersGroup, value: team.length, sub: `across ${projects.length} projects` },
            { label: "Resolved", icon: IconCircleCheck, value: loaded(resolvedWithin(tasks, RANGE_DAYS[range])), sub: "tasks this period", onClick: () => navigate("/tasks") },
            { label: "Overdue tasks", icon: IconAlertTriangle, value: loaded(overdue), bad: true, sub: `of ${openTasks.length} open`, onClick: () => navigate("/tasks") },
        ]

    return (
        <>
            <PageHead
                title="Dashboard"
                sub={`${isSuper ? "Everything across ProjoMan" : "Your projects and team"} · ${todayLabel()}`}
            >
                <Segmented value={range} onChange={setRange} options={[{ value: "7d", label: "7d" }, { value: "30d", label: "30d" }, { value: "90d", label: "90d" }]} />
                {isSuper
                    ? <Button variant="outline" onClick={() => openForm("user")}><IconUserPlus />Invite user</Button>
                    : canAddTask && <Button variant="outline" onClick={() => openForm("task")}><IconPlus />New task</Button>}
                {canAddProject && <Button onClick={() => openForm("project")}><IconPlus />New project</Button>}
            </PageHead>

            {isSuper && <AttentionStrip clients={clients} />}

            <div key={range} className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
                {kpis.map((k, i) => <StatCard key={k.label} index={i} {...k} />)}
            </div>

            <div className="grid grid-cols-1 gap-4 min-[920px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <Panel
                    index={4}
                    title="Tasks created vs resolved"
                    sub={RANGE_SUB[range]}
                    right={<div className="flex gap-3.5"><LegendLine label="Created" color={tokenColor("subtle-foreground")} /><LegendLine label="Resolved" color={tokenColor("primary")} /></div>}
                >
                    <AreaChart
                        key={range}
                        labels={series.labels}
                        series={[
                            { name: "Created", points: series.created, color: tokenColor("subtle-foreground") },
                            { name: "Resolved", points: series.resolved, color: tokenColor("primary"), area: true },
                        ]}
                    />
                </Panel>
                {isSuper ? <ProjectStatusPanel projects={projects} tasks={tasks} counts={{ inProgress, completed, notStarted }} /> : <ProjectListPanel projects={projects} tasks={tasks} client={clients[0]?.name} />}
            </div>

            <div className="grid grid-cols-1 gap-4 min-[920px]:grid-cols-2 min-[1180px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Panel
                    index={6}
                    title="Upcoming deadlines"
                    sub="Next 7 days and overdue"
                    right={<button className="text-xs text-accent-foreground hover:underline" onClick={() => navigate("/tasks")}>View all</button>}
                    className="min-[920px]:max-[1179px]:col-span-2"
                    bodyClassName="px-2.5 pb-2.5 pt-1.5"
                >
                    {upcoming.length ? (
                        upcoming.map((t) => <TaskRow key={t.id} task={t} onOpen={() => openForm("task-view", { id: t.id })} onToggle={() => toggleResolved(t)} />)
                    ) : tasksLoaded ? (
                        <EmptyState icon={IconCalendarDue} title="Nothing due this week" />
                    ) : (
                        <Loading kind="lines" label="Loading tasks" />
                    )}
                </Panel>
                <Panel index={7} title="Workload" sub="Open tasks by assignee">
                    <Workload tasks={tasks} />
                </Panel>
                <Panel index={8} title="Activity">
                    <ActivityList items={mergeActivity(serverActivity, taskActivity(tasks, 6), 6)} />
                </Panel>
            </div>
        </>
    )
}

const SHOWN = 2 // Items visible at once; the rest wait their turn
const age = (c: Client) => parseDate(c.createdAt)?.getTime() ?? 0

/**
 * "Needs a decision": a queue of clients waiting on a super admin. Shows the count and the
 * two most urgent (deletion requests first, then clients with no admin, oldest first);
 * when one is handled it animates out and the next slides up. Hidden when empty.
 */
function AttentionStrip({ clients }: { clients: Client[] }) {
    const openForm = useForms()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const byAge = (a: Client, b: Client) => age(a) - age(b)
    const queue = [
        ...clients.filter((c) => c.deleteRequest).sort(byAge).map((c) => ({ kind: "del" as const, c })),
        ...clients.filter((c) => !c.assignedAdmin && !c.deleteRequest).sort(byAge).map((c) => ({ kind: "adm" as const, c })),
    ]
    if (!queue.length) return null

    const viewAll = () => {
        dispatch(setClientsFilter("unassigned")) // Opens Clients on the "Needs attention" tab
        navigate("/clients")
    }

    return (
        <div className="tone-amber flex animate-pm-in flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl border bg-card px-4 py-3 shadow-sm [border-color:oklch(var(--st-bg-l)_calc(var(--st-bg-c)*3)_var(--h))]">
            <div className="flex items-center gap-2.5 pr-2">
                <span className="tone-fg grid size-8 place-items-center rounded-lg text-lg [background-color:oklch(var(--st-bg-l)_calc(var(--st-bg-c)*1.2)_var(--h))]"><IconBellRinging size={18} /></span>
                <div>
                    <div className="text-[15px] font-semibold">Needs decision: {queue.length}</div>
                    {queue.length > SHOWN && (
                        <button className="text-xs text-accent-foreground hover:underline" onClick={viewAll}>View all {queue.length}</button>
                    )}
                </div>
            </div>
            <ul className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-2.5 p-0">
                <AnimatePresence mode="popLayout" initial={false}>
                    {queue.slice(0, SHOWN).map(({ kind, c }) => (
                        <motion.li
                            key={`${kind}-${c.id}`}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="flex min-w-[300px] flex-1"
                        >
                            {kind === "del" ? (
                                <AttentionItem icon={<IconTrash size={18} />} title={`${c.name} requested deletion`} sub={c.assignedAdmin ? c.assignedAdmin.name : "Requested by the client admin"}>
                                    <Button size="sm" variant="outline" onClick={() => openForm("decline-request", { clientId: c.id })}>Decline</Button>
                                    <Button size="sm" onClick={() => openForm("delete-client", { clientId: c.id })}>Approve</Button>
                                </AttentionItem>
                            ) : (
                                <AttentionItem icon={<IconUserQuestion size={18} />} title={`${c.name} has no client admin`} sub="Projects can't be managed by the client">
                                    <Button size="sm" onClick={() => openForm("client", { clientId: c.id })}>Assign admin</Button>
                                </AttentionItem>
                            )}
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ul>
        </div>
    )
}

function AttentionItem({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
    return (
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
            <span className="text-subtle-foreground">{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">{title}</div>
                <div className="text-xs text-subtle-foreground">{sub}</div>
            </div>
            {children}
        </div>
    )
}

/** SUPER_ADMIN: status donut with legend, then progress for the active projects. */
function ProjectStatusPanel({ projects, tasks, counts }: { projects: Project[]; tasks: Task[]; counts: { inProgress: number; completed: number; notStarted: number } }) {
    const navigate = useNavigate()
    const legend = [
        { label: "In progress", value: counts.inProgress, color: tokenColor("chart-1") },
        { label: "Completed", value: counts.completed, color: tokenColor("chart-2") },
        { label: "Not started", value: counts.notStarted, color: tokenColor("border-strong") },
    ]
    const active = projects.filter((p) => p.status !== "COMPLETED").slice(0, 3)
    return (
        <Panel index={5} title="Project status" sub={`${projects.length} projects`}>
            <div className="flex flex-wrap items-center gap-[22px]">
                <Donut
                    key={projects.length}
                    parts={legend.map((l) => ({ value: l.value, color: l.color }))}
                    center={<div><div className="num text-[26px] font-medium"><CountUp value={projects.length} /></div><div className="text-xs text-subtle-foreground">projects</div></div>}
                />
                <div className="grid min-w-[130px] flex-1 gap-2.5">
                    {legend.map((l) => (
                        <div key={l.label} className="flex items-center gap-2 text-[13px]">
                            <span className="size-2 rounded-sm" style={{ background: l.color }} />
                            <span className="text-muted-foreground">{l.label}</span>
                            <span className="num ml-auto font-medium">{l.value}</span>
                        </div>
                    ))}
                </div>
            </div>
            {active.length > 0 && (
                <>
                    <div className="mb-3.5 mt-[18px] h-px bg-border" />
                    <div className="grid gap-3">
                        {active.map((p) => {
                            const { pct } = projectProgress(tasks, p.id)
                            return (
                                <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer">
                                    <div className="mb-1.5 flex justify-between text-[13px]"><span className="truncate hover:text-accent-foreground">{p.name}</span><span className="num text-muted-foreground">{pct}%</span></div>
                                    <Progress value={pct} />
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </Panel>
    )
}

/** CLIENT_ADMIN: their projects (their client's, and any they're on) with status, progress, team and open tasks. */
function ProjectListPanel({ projects, tasks, client }: { projects: Project[]; tasks: Task[]; client?: string }) {
    const navigate = useNavigate()
    return (
        <Panel index={5} title="Project progress" sub={client}>
            {projects.length === 0 ? (
                <EmptyState icon={IconFolder} title="No projects yet" />
            ) : (
                <div className="grid gap-4">
                    {projects.map((p) => {
                        const { open, pct } = projectProgress(tasks, p.id)
                        const due = parseDate(p.dueDate)
                        return (
                            <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="grid min-w-0 cursor-pointer gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                                    <StatusBadge value={p.status} />
                                    <span className="num ml-auto">{pct}%</span>
                                </div>
                                <Progress value={pct} />
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <AvatarGroup people={p.user ?? []} size={22} />
                                    <span className="text-xs text-subtle-foreground">{open} open{due ? ` · due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </Panel>
    )
}
