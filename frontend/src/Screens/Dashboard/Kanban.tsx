import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppLayout } from "@/Screens/Components/AppLayout";
import { fetchProjects } from "@/redux/actions/projectsActions";
import { fetchTasks, updateTaskInStore } from "@/redux/actions/tasksActions";
import { updateTaskStatus } from "@/api/taskApi";
import type { Task } from "@/types/taskTypes";
import type { Project } from "@/types/projectTypes";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── constants ─────────────────────────────────────────────────────────────────

const COLUMNS: { status: string; label: string; color: string; badgeVariant: "secondary" | "default" | "outline" | "destructive" }[] = [
    { status: "NEW",         label: "New",         color: "bg-slate-100 dark:bg-slate-800",   badgeVariant: "secondary" },
    { status: "IN_PROGRESS", label: "In Progress", color: "bg-blue-50 dark:bg-blue-950/30",   badgeVariant: "default" },
    { status: "RESOLVED",    label: "Resolved",    color: "bg-green-50 dark:bg-green-950/30", badgeVariant: "outline" },
    { status: "REOPENED",    label: "Reopened",    color: "bg-red-50 dark:bg-red-950/30",     badgeVariant: "destructive" },
];

const PRIORITY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
    URGENT: "destructive",
    HIGH: "default",
    NORMAL: "secondary",
    BACKLOG: "outline",
};

const PRIORITY_LABELS: Record<string, string> = {
    URGENT: "Urgent",
    HIGH: "High",
    NORMAL: "Normal",
    BACKLOG: "Backlog",
};

const STATUS_OPTIONS = ["NEW", "IN_PROGRESS", "RESOLVED", "REOPENED"];
const STATUS_LABELS: Record<string, string> = {
    NEW: "New",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
    REOPENED: "Reopened",
};

// ── card ──────────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
    return (
        <div
            className="rounded-lg border bg-card p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/40 transition-all duration-150 space-y-2"
            onClick={onClick}
        >
            <p className="text-sm font-medium leading-snug">{task.title}</p>
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant={PRIORITY_VARIANT[task.priority] ?? "secondary"} className="text-xs">
                    {PRIORITY_LABELS[task.priority] ?? task.priority}
                </Badge>
                {task.assignedTo && (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {task.assignedTo.name}
                    </span>
                )}
            </div>
            {task.deadline && (
                <p className="text-xs text-muted-foreground">
                    Due: {new Date(task.deadline).toLocaleDateString()}
                </p>
            )}
        </div>
    );
}

// ── page ──────────────────────────────────────────────────────────────────────

export const Kanban: React.FC = () => {
    const dispatch = useDispatch();
    const { projects } = useSelector((state: any) => state.projects);
    const { tasks, loading: tasksLoading, selectedProjectId } = useSelector((state: any) => state.tasks);

    const [activeProjectId, setActiveProjectId] = useState("");
    const [viewTask, setViewTask] = useState<Task | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchProjects() as any);
    }, [dispatch]);

    useEffect(() => {
        if (activeProjectId) dispatch(fetchTasks(activeProjectId) as any);
    }, [activeProjectId, dispatch]);

    const boardTasks: Task[] = selectedProjectId === activeProjectId ? tasks : [];

    const tasksByStatus = (status: string) =>
        boardTasks.filter((t: Task) => t.currentStatus === status);

    const handleStatusChange = async (task: Task, newStatus: string) => {
        if (task.currentStatus === newStatus) return;
        setUpdatingId(task.id);
        setActionError(null);
        try {
            const updated = await updateTaskStatus(task.id, newStatus);
            dispatch(updateTaskInStore(updated));
            if (viewTask?.id === task.id) setViewTask(updated);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <AppLayout>
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Kanban Board</h2>
                    <p className="text-muted-foreground text-sm">Drag tasks across columns to update their status.</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Label className="shrink-0 text-sm font-medium">Project</Label>
                <Select value={activeProjectId} onValueChange={setActiveProjectId}>
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select a project…" />
                    </SelectTrigger>
                    <SelectContent>
                        {projects.map((p: Project) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {!activeProjectId ? (
                <div className="flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground">
                    Select a project to view its Kanban board.
                </div>
            ) : tasksLoading ? (
                <div className="flex h-64 items-center justify-center rounded-lg border text-sm text-muted-foreground">
                    Loading tasks…
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-start">
                    {COLUMNS.map((col) => {
                        const colTasks = tasksByStatus(col.status);
                        return (
                            <div key={col.status} className={`rounded-xl border ${col.color} p-3 space-y-3`}>
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-sm font-semibold">{col.label}</span>
                                    <Badge variant={col.badgeVariant} className="text-xs tabular-nums">
                                        {colTasks.length}
                                    </Badge>
                                </div>
                                <div className="space-y-2 min-h-[120px]">
                                    {colTasks.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-6">No tasks</p>
                                    ) : (
                                        colTasks.map((task: Task) => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => { setViewTask(task); setActionError(null); }}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Task Detail Sheet ──────────────────────────────────────────── */}
            <Sheet open={!!viewTask} onOpenChange={(open) => { if (!open) { setViewTask(null); setActionError(null); } }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Task Details</SheetTitle>
                        <SheetDescription>View and update the status of this task.</SheetDescription>
                    </SheetHeader>
                    {viewTask && (
                        <div className="mt-6 space-y-4">
                            {([
                                ["Title", viewTask.title],
                                ["Priority", PRIORITY_LABELS[viewTask.priority] ?? viewTask.priority],
                                ["Deadline", viewTask.deadline ? new Date(viewTask.deadline).toLocaleDateString() : "—"],
                                ["Assigned To", viewTask.assignedTo?.name ?? "—"],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">{label}</Label>
                                    <Input value={value} readOnly disabled />
                                </div>
                            ))}

                            <div className="space-y-1.5 pt-2">
                                <Label className="text-sm font-medium">Move to Status</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {STATUS_OPTIONS.map((s) => (
                                        <Button
                                            key={s}
                                            variant={viewTask.currentStatus === s ? "default" : "outline"}
                                            size="sm"
                                            disabled={updatingId === viewTask.id || viewTask.currentStatus === s}
                                            onClick={() => handleStatusChange(viewTask, s)}
                                        >
                                            {STATUS_LABELS[s]}
                                        </Button>
                                    ))}
                                </div>
                                {actionError && <p className="text-sm text-destructive mt-1">{actionError}</p>}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
};
