import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchUsers } from "@/redux/actions/usersListActions";
import { setUsersRoleFilter } from "@/redux/actions/usersListActions";
import { fetchClients, setClientsFilter } from "@/redux/actions/clientsActions";
import { fetchProjects, setProjectsStatusFilter } from "@/redux/actions/projectsActions";
import type { User } from "@/types/userTypes";
import type { Client } from "@/types/clientTypes";
import type { Project } from "@/types/projectTypes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    IconUsers,
    IconBuilding,
    IconFolder,
    IconActivity,
    IconAlertTriangle,
    IconUserCheck,
    IconShieldCheck,
    IconUserStar,
} from "@tabler/icons-react";

// ── small helpers ─────────────────────────────────────────────────────────────

function pct(part: number, total: number) {
    return total === 0 ? 0 : Math.round((part / total) * 100);
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    accent,
    onClick,
}: {
    label: string;
    value: number | string;
    sub: string;
    icon: React.ElementType;
    accent: string;
    onClick?: () => void;
}) {
    return (
        <Card
            className={onClick ? "cursor-pointer transition-all duration-150 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5" : ""}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-3xl font-bold tabular-nums">{value}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                    <div className={`rounded-xl p-3 bg-muted ${accent}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Donut Chart (pure CSS conic-gradient) ─────────────────────────────────────

function DonutChart({
    segments,
}: {
    segments: { label: string; value: number; color: string; textColor: string; onClick?: () => void }[];
}) {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    let cursor = 0;
    const gradient = segments
        .map((seg) => {
            const start = cursor;
            const end = cursor + pct(seg.value, total);
            cursor = end;
            return `${seg.color} ${start}% ${end}%`;
        })
        .join(", ");

    return (
        <div className="flex items-center gap-6">
            <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
                <div
                    className="rounded-full w-full h-full"
                    style={{ background: total === 0 ? "#e5e7eb" : `conic-gradient(${gradient})` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="rounded-full bg-card flex items-center justify-center"
                        style={{ width: 72, height: 72 }}
                    >
                        <span className="text-lg font-bold tabular-nums">{total}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                {segments.map((seg) => (
                    <div
                        key={seg.label}
                        className={`flex items-center gap-2 text-sm rounded px-1 py-0.5 -mx-1 transition-colors duration-100 ${seg.onClick ? "cursor-pointer hover:bg-muted" : ""}`}
                        onClick={seg.onClick}
                    >
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                        <span className="text-muted-foreground">{seg.label}</span>
                        <span className={`ml-auto font-semibold tabular-nums ${seg.textColor}`}>{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Progress Row ──────────────────────────────────────────────────────────────

function ProgressRow({
    label,
    value,
    total,
    color,
    icon: Icon,
    onClick,
}: {
    label: string;
    value: number;
    total: number;
    color: string;
    icon: React.ElementType;
    onClick?: () => void;
}) {
    const width = pct(value, total);
    return (
        <div
            className={`space-y-1.5 rounded-md px-2 py-1 -mx-2 transition-colors duration-100 ${onClick ? "cursor-pointer hover:bg-muted" : ""}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                </div>
                <span className="font-semibold tabular-nums">{value}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${width}%`, background: color }}
                />
            </div>
        </div>
    );
}

// ── Horizontal Bar Item ───────────────────────────────────────────────────────

function BarRow({
    label,
    value,
    max,
    color,
    onClick,
}: {
    label: string;
    value: number;
    max: number;
    color: string;
    onClick?: () => void;
}) {
    const width = max === 0 ? 0 : Math.round((value / max) * 100);
    return (
        <div
            className={`space-y-1 rounded-md px-2 py-1 -mx-2 transition-colors duration-100 ${onClick ? "cursor-pointer hover:bg-muted" : ""}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[160px] text-muted-foreground">{label}</span>
                <span className="font-semibold tabular-nums shrink-0 ml-2">{value} member{value !== 1 ? "s" : ""}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${width}%`, background: color }}
                />
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { users } = useSelector((state: any) => state.usersList);
    const { clients } = useSelector((state: any) => state.clients);
    const { projects } = useSelector((state: any) => state.projects);

    const drillUsers = (role: string | null) => {
        dispatch(setUsersRoleFilter(role));
        navigate("/users");
    };

    const drillClients = (filter: "pending" | "unassigned" | null) => {
        dispatch(setClientsFilter(filter));
        navigate("/clients");
    };

    const drillProjects = (status: string | null) => {
        dispatch(setProjectsStatusFilter(status));
        navigate("/projects");
    };

    useEffect(() => {
        dispatch(fetchUsers() as any);
        dispatch(fetchClients() as any);
        dispatch(fetchProjects() as any);
    }, [dispatch]);

    // ── derived stats ─────────────────────────────────────────────────────────
    const totalUsers = users.length;
    const totalClients = clients.length;
    const totalProjects = projects.length;

    const inProgress = projects.filter((p: Project) => p.status === "IN_PROGRESS").length;
    const completed = projects.filter((p: Project) => p.status === "COMPLETED").length;
    const notStarted = projects.filter((p: Project) => p.status === "NOT_STARTED").length;

    const superAdmins = users.filter((u: User) => u.role === "SUPER_ADMIN").length;
    const clientAdmins = users.filter((u: User) => u.role === "CLIENT_ADMIN").length;
    const regularUsers = users.filter((u: User) => u.role === "USER").length;

    const pendingDeletions = clients.filter((c: Client) => c.deleteRequest).length;
    const assignedClients = clients.filter((c: Client) => c.assignedAdmin).length;
    const unassignedClients = totalClients - assignedClients;

    const topProjects = [...projects]
        .sort((a: Project, b: Project) => b.user.length - a.user.length)
        .slice(0, 5);
    const maxTeamSize = topProjects.length > 0 ? topProjects[0].user.length : 1;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground text-sm">Overview of your project management platform.</p>
            </div>

            {/* ── Row 1: Stat Cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total Users"
                    value={totalUsers}
                    sub={`${superAdmins} admin${superAdmins !== 1 ? "s" : ""} · ${clientAdmins} client admin${clientAdmins !== 1 ? "s" : ""}`}
                    icon={IconUsers}
                    accent="text-blue-500"
                    onClick={() => drillUsers(null)}
                />
                <StatCard
                    label="Total Clients"
                    value={totalClients}
                    sub={`${assignedClients} assigned · ${unassignedClients} unassigned`}
                    icon={IconBuilding}
                    accent="text-violet-500"
                    onClick={() => drillClients(null)}
                />
                <StatCard
                    label="Total Projects"
                    value={totalProjects}
                    sub={`${completed} completed · ${notStarted} not started`}
                    icon={IconFolder}
                    accent="text-emerald-500"
                    onClick={() => drillProjects(null)}
                />
                <StatCard
                    label="In Progress"
                    value={inProgress}
                    sub={`${pct(inProgress, totalProjects)}% of all projects active`}
                    icon={IconActivity}
                    accent="text-orange-500"
                    onClick={() => drillProjects("IN_PROGRESS")}
                />
            </div>

            {/* ── Row 2: Donuts ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Project Status</CardTitle>
                        <CardDescription>Breakdown of all projects by current status</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <DonutChart
                            segments={[
                                { label: "In Progress",  value: inProgress,  color: "#3b82f6", textColor: "text-blue-500",   onClick: () => drillProjects("IN_PROGRESS") },
                                { label: "Completed",    value: completed,   color: "#22c55e", textColor: "text-emerald-500", onClick: () => drillProjects("COMPLETED") },
                                { label: "Not Started",  value: notStarted,  color: "#94a3b8", textColor: "text-slate-400",  onClick: () => drillProjects("NOT_STARTED") },
                            ]}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">User Roles</CardTitle>
                        <CardDescription>Breakdown of all users by role</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <DonutChart
                            segments={[
                                { label: "Users",         value: regularUsers, color: "#3b82f6", textColor: "text-blue-500",   onClick: () => drillUsers("USER") },
                                { label: "Client Admins", value: clientAdmins, color: "#a855f7", textColor: "text-purple-500", onClick: () => drillUsers("CLIENT_ADMIN") },
                                { label: "Super Admins",  value: superAdmins,  color: "#ef4444", textColor: "text-red-500",    onClick: () => drillUsers("SUPER_ADMIN") },
                            ]}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* ── Row 3: Bars ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Client Health</CardTitle>
                        <CardDescription>Admin assignment and deletion request status</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-5">
                        <ProgressRow
                            label="Assigned to admin"
                            value={assignedClients}
                            total={totalClients}
                            color="#22c55e"
                            icon={IconUserCheck}
                            onClick={() => drillClients(null)}
                        />
                        <ProgressRow
                            label="Unassigned"
                            value={unassignedClients}
                            total={totalClients}
                            color="#94a3b8"
                            icon={IconUserStar}
                            onClick={() => drillClients("unassigned")}
                        />
                        <ProgressRow
                            label="Pending deletion"
                            value={pendingDeletions}
                            total={totalClients}
                            color="#ef4444"
                            icon={IconAlertTriangle}
                            onClick={() => drillClients("pending")}
                        />
                        <ProgressRow
                            label="Client admins"
                            value={clientAdmins}
                            total={totalUsers}
                            color="#a855f7"
                            icon={IconShieldCheck}
                            onClick={() => drillUsers("CLIENT_ADMIN")}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Largest Project Teams</CardTitle>
                        <CardDescription>Top {topProjects.length} projects ranked by team size</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        {topProjects.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No projects yet.</p>
                        ) : (
                            topProjects.map((p: Project, i: number) => (
                                <BarRow
                                    key={p.id}
                                    label={p.name}
                                    value={p.user.length}
                                    max={maxTeamSize}
                                    color={["#3b82f6", "#a855f7", "#22c55e", "#f59e0b", "#ef4444"][i % 5]}
                                    onClick={() => drillProjects(null)}
                                />
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
