import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { IconFolder, IconPlus } from "@tabler/icons-react";
import { setProjectsStatusFilter } from "@/redux/actions/projectsActions";
import type { Project } from "@/types/projectTypes";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/pm/page-head";
import { Segmented } from "@/components/pm/segmented";
import { AnimatedTabs } from "@/components/pm/animated-tabs";
import { SearchBox } from "@/components/pm/search-box";
import { StatusBadge } from "@/components/pm/status-badge";
import { EmptyState } from "@/components/pm/empty-state";
import { ProjectCard, projectProgress } from "@/components/pm/project-card";
import { useForms } from "@/components/forms/forms-context";
import { useAppData } from "@/components/forms/use-app-data";

const STATUS_OPTIONS = [
    { value: "NOT_STARTED", label: "Not started" },
    { value: "IN_PROGRESS", label: "In progress" },
    { value: "COMPLETED", label: "Completed" },
] as const;

type View = "grid" | "board";
type StatusTab = "all" | Project["status"];

export const Projects: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const openForm = useForms();
    const { loading, error, statusFilter } = useSelector((state: any) => state.projects);
    const { role, projects, tasks } = useAppData();
    const canManage = role === "SUPER_ADMIN" || role === "CLIENT_ADMIN";

    const [view, setView] = useState<View>("grid");
    // A dashboard drill-down may arrive with a status filter; adopt it as the active tab once
    const [tab, setTab] = useState<StatusTab>(statusFilter ?? "all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (statusFilter) dispatch(setProjectsStatusFilter(null));
    }, [dispatch]);

    const all = projects as Project[];
    const searched = all.filter((p) => !search || `${p.name} ${p.client?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()));
    const list = searched.filter((p) => tab === "all" || p.status === tab);
    const count = (t: StatusTab) => searched.filter((p) => t === "all" || p.status === t).length;

    const card = (p: Project, i: number) => {
        const { open, pct } = projectProgress(tasks, p.id);
        return <ProjectCard key={p.id} project={p} open={open} pct={pct} index={i} onClick={() => navigate(`/projects/${p.id}`)} />;
    };

    return (
        <>
            <PageHead
                title="Projects"
                sub={`${all.length} projects · ${all.filter((p) => p.status === "IN_PROGRESS").length} in progress`}
            >
                <Segmented value={view} onChange={setView} options={[{ value: "grid", label: "Grid" }, { value: "board", label: "Board" }]} />
                {canManage && <Button onClick={() => openForm("project")}><IconPlus />New project</Button>}
            </PageHead>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <SearchBox value={search} onChange={setSearch} placeholder="Search projects or clients" />
                {view === "grid" && (
                    <div className="[&_[role=tablist]]:border-b-0">
                        <AnimatedTabs
                            value={tab}
                            onChange={setTab}
                            tabs={[{ value: "all" as StatusTab, label: "All", count: count("all") }, ...STATUS_OPTIONS.map((s) => ({ value: s.value as StatusTab, label: s.label, count: count(s.value) }))]}
                        />
                    </div>
                )}
            </div>

            {loading && all.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Loading projects…</div>
            ) : error ? (
                <div className="tone-red tone-fg py-16 text-center text-sm">Failed to load projects.</div>
            ) : view === "grid" ? (
                <div key={tab + search} className="grid animate-pm-tab grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                    {list.map(card)}
                    {canManage && tab === "all" && !search && (
                        <button
                            onClick={() => openForm("project")}
                            className="flex min-h-[200px] animate-pm-in flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-border-strong text-[13.5px] font-medium text-muted-foreground transition-colors duration-fast hover:border-primary hover:bg-accent hover:text-accent-foreground"
                            style={{ animationDelay: `${list.length * 50}ms` }}
                        >
                            <IconPlus size={20} />New project
                        </button>
                    )}
                    {list.length === 0 && !(canManage && tab === "all" && !search) && (
                        <div className="col-span-full rounded-xl border bg-card"><EmptyState icon={IconFolder} title="No projects found" /></div>
                    )}
                </div>
            ) : (
                <div key="board" className="grid animate-pm-tab grid-cols-[repeat(3,minmax(240px,1fr))] items-start gap-3.5 overflow-x-auto pb-1.5">
                    {STATUS_OPTIONS.map((s) => {
                        const col = searched.filter((p) => p.status === s.value);
                        return (
                            <div key={s.value} className="grid min-h-[320px] content-start gap-2.5 rounded-xl border bg-surface-2 p-2.5">
                                <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
                                    <StatusBadge value={s.value} />
                                    <span className="num rounded-full bg-surface-3 px-1.5 py-px text-[11px] text-muted-foreground">{col.length}</span>
                                </div>
                                {col.map(card)}
                            </div>
                        );
                    })}
                </div>
            )}

        </>
    );
};
