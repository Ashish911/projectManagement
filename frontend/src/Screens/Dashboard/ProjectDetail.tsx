import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
    IconAlertTriangle,
    IconBuilding,
    IconCalendar,
    IconChartLine,
    IconCircleCheck,
    IconDots,
    IconFolderOff,
    IconListDetails,
    IconPencil,
    IconPlus,
    IconTrash,
    IconUserPlus,
    IconUsersGroup,
} from "@tabler/icons-react";
import type { Task } from "@/types/taskTypes";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/pm/status-badge";
import { StatCard } from "@/components/pm/stat-card";
import { Panel } from "@/components/pm/panel";
import { Progress } from "@/components/pm/progress";
import { AnimatedTabs } from "@/components/pm/animated-tabs";
import { Avatar, AvatarGroup } from "@/components/pm/avatar";
import { EmptyState } from "@/components/pm/empty-state";
import { TaskRow, isOpen, isOverdue } from "@/components/pm/task-row";
import { daysFrom, parseDate } from "@/components/pm/dates";
import { AreaChart, LegendLine } from "@/components/pm/charts/area-chart";
import { tokenColor } from "@/components/pm/charts/smooth";
import { useForms } from "@/components/forms/forms-context";
import { useAppData } from "@/components/forms/use-app-data";
import { useTaskActions } from "@/components/forms/task-actions";
import { cn } from "@/lib/utils";

type Tab = "overview" | "tasks" | "team";

const STATUS_BARS: { value: Task["currentStatus"]; color: string }[] = [
    { value: "NEW", color: tokenColor("border-strong") },
    { value: "IN_PROGRESS", color: tokenColor("chart-1") },
    { value: "REOPENED", color: tokenColor("chart-3") },
    { value: "RESOLVED", color: tokenColor("chart-2") },
];

const DAY = 86_400_000;
const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Open tasks soonest deadline first; no deadline last. */
const byDeadline = (a: Task, b: Task) =>
    (parseDate(a.deadline)?.getTime() ?? Infinity) - (parseDate(b.deadline)?.getTime() ?? Infinity);

/**
 * Burn-down: open tasks remaining on each of ~10 dates from the first task to
 * the target date (or today), against an ideal straight line to zero.
 */
function burndown(tasks: Task[], dueDate: Date | null) {
    const created = tasks.map((t) => parseDate(t.createdAt)?.getTime()).filter((n): n is number => !!n);
    if (!created.length) return null;
    const start = Math.min(...created);
    const end = Math.max(dueDate?.getTime() ?? 0, Date.now(), start + DAY);
    const points = 10;
    const dates = Array.from({ length: points }, (_, i) => new Date(start + ((end - start) * i) / (points - 1)));
    const remaining = dates.map((d) =>
        d.getTime() > Date.now() ? null
            : tasks.filter((t) => {
                const c = parseDate(t.createdAt)?.getTime() ?? start;
                const r = parseDate(t.resolvedAt)?.getTime();
                return c <= d.getTime() && !(t.currentStatus === "RESOLVED" && r != null && r <= d.getTime());
            }).length,
    );
    const total = tasks.length;
    // Future points have no "remaining" yet; carry the last known value so the line ends at today
    let last = total;
    const actual = remaining.map((n) => (n == null ? last : (last = n)));
    return {
        labels: dates.map(shortDate),
        ideal: dates.map((_, i) => Math.round(total - (i * total) / (points - 1))),
        actual,
    };
}

export const ProjectDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const openForm = useForms();
    const { loading } = useSelector((state: any) => state.projects);
    const { role, users, projects, tasks, tasksLoaded } = useAppData();
    const { toggleResolved } = useTaskActions();
    const canManage = role === "SUPER_ADMIN" || role === "CLIENT_ADMIN";
    const [tab, setTab] = useState<Tab>("overview");

    const project = projects.find((p) => p.id === id);

    if (!project) {
        return loading || !projects.length ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading project…</div>
        ) : (
            <div className="rounded-xl border bg-card">
                <EmptyState icon={IconFolderOff} title="Project not found" hint="It may have been deleted, or you're not on its team." />
                <div className="flex justify-center pb-8"><Button variant="outline" onClick={() => navigate("/projects")}>Back to projects</Button></div>
            </div>
        );
    }

    const all = tasks.filter((t) => t.project?.id === project.id);
    const open = all.filter(isOpen);
    const overdue = all.filter(isOverdue);
    const resolved = all.length - open.length;
    const resolvedThisWeek = all.filter((t) => t.currentStatus === "RESOLVED" && (parseDate(t.resolvedAt)?.getTime() ?? 0) > Date.now() - 7 * DAY).length;
    const pct = all.length ? Math.round((resolved / all.length) * 100) : 0;
    const team = project.user ?? [];
    const due = parseDate(project.dueDate);
    const daysLeft = due ? Math.max(0, daysFrom(due)) : null;
    const chart = burndown(all, due);
    const openTask = (t: Task) => openForm("task-view", { id: t.id });

    return (
        <>
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <div className="flex animate-pm-in flex-wrap items-end justify-between gap-5 rounded-xl border bg-card px-6 py-[22px] shadow-sm">
                <div className="min-w-[260px] flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.025em]">{project.name}</h1>
                        <StatusBadge value={project.status} />
                    </div>
                    {project.description && <div className="mt-1.5 text-muted-foreground">{project.description}</div>}
                    <div className="mt-3 flex flex-wrap gap-x-[18px] gap-y-2 text-[13px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><IconBuilding size={15} className="text-subtle-foreground" />{project.client?.name ?? "No client"}</span>
                        <span className="flex items-center gap-1.5"><IconCalendar size={15} className="text-subtle-foreground" />{due ? `Due ${shortDate(due)}` : "No target date"}</span>
                        <span className="flex items-center gap-1.5"><IconListDetails size={15} className="text-subtle-foreground" />{all.length} tasks</span>
                    </div>
                </div>
                <div className="grid justify-items-end gap-3">
                    <div className="flex gap-2">
                        {canManage && <Button variant="outline" onClick={() => openForm("team", { projectId: project.id })}><IconUserPlus />Add member</Button>}
                        {canManage && <Button onClick={() => openForm("task", { projectId: project.id })}><IconPlus />New task</Button>}
                        {canManage && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="More project actions"><IconDots /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openForm("project", { projectId: project.id })}><IconPencil className="mr-2 size-4" />Edit project</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openForm("team", { projectId: project.id })}><IconUsersGroup className="mr-2 size-4" />Manage team</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="tone-red tone-fg" onClick={() => openForm("delete-project", { projectId: project.id })}><IconTrash className="mr-2 size-4" />Delete project</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {team.length > 0 && <AvatarGroup people={team} size={30} />}
                        <div className="w-40">
                            <div className="mb-[5px] flex justify-between text-[12.5px]">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="num">{pct}%</span>
                            </div>
                            <Progress key={pct} value={pct} />
                        </div>
                    </div>
                </div>
            </div>

            <AnimatedTabs
                value={tab}
                onChange={setTab}
                tabs={[
                    { value: "overview", label: "Overview" },
                    { value: "tasks", label: "Tasks", count: all.length },
                    { value: "team", label: "Team", count: team.length },
                ]}
            />

            <div key={tab} className="grid animate-pm-tab gap-4">
                {tab === "overview" && (
                    <>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
                            <StatCard index={0} label="Open tasks" icon={IconListDetails} value={tasksLoaded ? open.length : null} sub={`of ${all.length}`} />
                            <StatCard index={1} label="Overdue" icon={IconAlertTriangle} value={tasksLoaded ? overdue.length : null} bad sub={overdue.length ? "needs attention" : "on track"} />
                            <StatCard index={2} label="Resolved this week" icon={IconCircleCheck} value={tasksLoaded ? resolvedThisWeek : null} sub="tasks" />
                            <StatCard index={3} label="Days left" icon={IconCalendar} value={daysLeft} sub={due ? `until ${shortDate(due)}` : "Set a target date"} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 min-[920px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                            <Panel
                                index={4}
                                title="Burn-down"
                                sub="Open tasks remaining vs ideal"
                                right={<div className="flex gap-3.5"><LegendLine label="Ideal" color={tokenColor("subtle-foreground")} /><LegendLine label="Remaining" color={tokenColor("primary")} /></div>}
                            >
                                {chart ? (
                                    <AreaChart
                                        height={200}
                                        labels={chart.labels}
                                        series={[
                                            { name: "Ideal", points: chart.ideal, color: tokenColor("subtle-foreground") },
                                            { name: "Remaining", points: chart.actual, color: tokenColor("primary"), area: true },
                                        ]}
                                    />
                                ) : (
                                    <EmptyState icon={IconChartLine} title="No tasks yet" hint="The burn-down starts once the project has tasks." className="min-h-[200px]" />
                                )}
                            </Panel>
                            <Panel index={5} title="By status">
                                <div className="grid gap-3.5">
                                    {STATUS_BARS.map((s, k) => {
                                        const n = all.filter((t) => t.currentStatus === s.value).length;
                                        return (
                                            <div key={s.value}>
                                                <div className="mb-1.5 flex items-center justify-between">
                                                    <StatusBadge value={s.value} />
                                                    <span className="num">{n}</span>
                                                </div>
                                                <Progress value={all.length ? (n / all.length) * 100 : 0} color={s.color} delay={k * 80} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </Panel>
                        </div>
                        <Panel
                            index={6}
                            title="Up next"
                            sub="Open tasks, soonest deadline first"
                            right={all.length > 0 && <button className="text-xs text-accent-foreground hover:underline" onClick={() => setTab("tasks")}>All tasks</button>}
                            bodyClassName="px-2.5 pb-2.5 pt-1.5"
                        >
                            {!tasksLoaded ? (
                                <div className="py-8 text-center text-sm text-muted-foreground">Loading tasks…</div>
                            ) : open.length === 0 ? (
                                <EmptyState icon={IconCircleCheck} title={all.length ? "Everything's resolved" : "No tasks yet"} />
                            ) : (
                                [...open].sort(byDeadline).slice(0, 5).map((t) => <TaskRow key={t.id} task={t} showProject={false} onOpen={() => openTask(t)} />)
                            )}
                        </Panel>
                    </>
                )}

                {tab === "tasks" && (
                    <div className="rounded-xl border bg-card px-2.5 py-1.5 shadow-sm">
                        {all.length === 0 ? (
                            <EmptyState icon={IconListDetails} title="No tasks yet" />
                        ) : (
                            [...open.sort(byDeadline), ...all.filter((t) => !isOpen(t))].map((t, k) => (
                                <div key={t.id} className="animate-pm-in" style={{ animationDelay: `${k * 35}ms` }}>
                                    <TaskRow task={t} showStatus showProject={false} onOpen={() => openTask(t)} onToggle={canManage ? () => toggleResolved(t) : undefined} />
                                </div>
                            ))
                        )}
                    </div>
                )}

                {tab === "team" && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                        {team.map((m, i) => {
                            const mine = all.filter((t) => t.assignedTo?.id === m.id);
                            const roleOf = users.find((u) => u.id === m.id)?.role ?? "USER";
                            const stats: [string, number, boolean][] = [
                                ["Open", mine.filter(isOpen).length, false],
                                ["Resolved", mine.filter((t) => !isOpen(t)).length, false],
                                ["Overdue", mine.filter(isOverdue).length, true],
                            ];
                            return (
                                <div key={m.id} className="grid animate-pm-in gap-3.5 rounded-xl border bg-card p-[18px] shadow-sm transition duration-base ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md" style={{ animationDelay: `${i * 50}ms` }}>
                                    <div className="flex items-center gap-3">
                                        <Avatar name={m.name} seed={m.id} size={40} />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-semibold">{m.name}</div>
                                            <div className="truncate text-xs text-subtle-foreground">{m.email}</div>
                                        </div>
                                        <StatusBadge value={roleOf} />
                                    </div>
                                    <div className="flex gap-6">
                                        {stats.map(([label, n, bad]) => (
                                            <div key={label}>
                                                <div className={cn("num text-[22px] font-medium", bad && n > 0 && "tone-red tone-fg")}>{n}</div>
                                                <div className="text-xs text-subtle-foreground">{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {canManage && (
                            <button
                                onClick={() => openForm("team", { projectId: project.id })}
                                className="flex min-h-[140px] animate-pm-in flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-border-strong text-[13.5px] font-medium text-muted-foreground transition-colors duration-fast hover:border-primary hover:bg-accent hover:text-accent-foreground"
                            >
                                <IconUserPlus size={20} />Add member
                            </button>
                        )}
                        {!canManage && team.length === 0 && <div className="col-span-full rounded-xl border bg-card"><EmptyState icon={IconUsersGroup} title="No team members yet" /></div>}
                    </div>
                )}
            </div>
        </>
    );
};
