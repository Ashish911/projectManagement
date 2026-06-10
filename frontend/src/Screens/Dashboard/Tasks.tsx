import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppLayout } from "@/Screens/Components/AppLayout";
import { createTask, updateTask, updateTaskStatus, deleteTask } from "@/api/taskApi";
import { createSubTask, updateSubTask, updateSubTaskStatus, deleteSubTask } from "@/api/subTaskApi";
import { fetchTasks, addTaskToStore, updateTaskInStore, removeTaskFromStore } from "@/redux/actions/tasksActions";
import { fetchSubTasks, addSubTaskToStore, updateSubTaskInStore, removeSubTaskFromStore } from "@/redux/actions/subTasksActions";
import { fetchProjects } from "@/redux/actions/projectsActions";
import { fetchUsers } from "@/redux/actions/usersListActions";
import type { Task } from "@/types/taskTypes";
import type { SubTask } from "@/types/subTaskTypes";
import type { Project } from "@/types/projectTypes";
import type { User } from "@/types/userTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";

// ── constants ─────────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<string, string> = {
    URGENT: "Urgent",
    HIGH: "High",
    NORMAL: "Normal",
    BACKLOG: "Backlog",
};

const PRIORITY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
    URGENT: "destructive",
    HIGH: "default",
    NORMAL: "secondary",
    BACKLOG: "outline",
};

const STATUS_LABELS: Record<string, string> = {
    NEW: "New",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
    REOPENED: "Reopened",
};

const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
    NEW: "secondary",
    IN_PROGRESS: "default",
    RESOLVED: "outline",
    REOPENED: "destructive",
};

const PRIORITY_OPTIONS = ["URGENT", "HIGH", "NORMAL", "BACKLOG"];
const STATUS_OPTIONS = ["NEW", "IN_PROGRESS", "RESOLVED", "REOPENED"];

// ── reusable form fields ──────────────────────────────────────────────────────

function TaskFormFields({
    form,
    onChange,
    users,
}: {
    form: { title: string; assignedTo: string; deadline: string; priority: string };
    onChange: (f: any) => void;
    users: User[];
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <Label>Assign To (optional)</Label>
                <Select value={form.assignedTo} onValueChange={(v) => onChange({ ...form, assignedTo: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label>Deadline (optional)</Label>
                <Input type="date" value={form.deadline} onChange={(e) => onChange({ ...form, deadline: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => onChange({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {PRIORITY_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

const EMPTY_FORM = { title: "", assignedTo: "", deadline: "", priority: "NORMAL" };

// ── page ──────────────────────────────────────────────────────────────────────

export const Tasks: React.FC = () => {
    const dispatch = useDispatch();
    const { tasks, loading: tasksLoading, error: tasksError, selectedProjectId } = useSelector((state: any) => state.tasks);
    const { subTasks, loading: subTasksLoading, error: subTasksError, selectedTaskId } = useSelector((state: any) => state.subTasks);
    const { projects } = useSelector((state: any) => state.projects);
    const { users } = useSelector((state: any) => state.usersList);

    const [activeProjectId, setActiveProjectId] = useState<string>("");
    const [activeTaskId, setActiveTaskId] = useState<string>("");

    useEffect(() => {
        dispatch(fetchProjects() as any);
        dispatch(fetchUsers() as any);
    }, [dispatch]);

    useEffect(() => {
        if (activeProjectId) dispatch(fetchTasks(activeProjectId) as any);
        setActiveTaskId(""); // reset task selection on project change
    }, [activeProjectId, dispatch]);

    useEffect(() => {
        if (activeTaskId) dispatch(fetchSubTasks(activeTaskId) as any);
    }, [activeTaskId, dispatch]);

    // ── task dialog state ─────────────────────────────────────────────────────
    const [viewTask, setViewTask] = useState<Task | null>(null);
    const [taskCreateOpen, setTaskCreateOpen] = useState(false);
    const [taskEditTarget, setTaskEditTarget] = useState<Task | null>(null);
    const [taskDeleteTarget, setTaskDeleteTarget] = useState<Task | null>(null);
    const [taskStatusUpdate, setTaskStatusUpdate] = useState<{ task: Task; status: string } | null>(null);

    const [taskCreateForm, setTaskCreateForm] = useState(EMPTY_FORM);
    const [taskEditForm, setTaskEditForm] = useState(EMPTY_FORM);

    const [taskCreating, setTaskCreating] = useState(false);
    const [taskUpdating, setTaskUpdating] = useState(false);
    const [taskDeleting, setTaskDeleting] = useState(false);
    const [taskStatusUpdating, setTaskStatusUpdating] = useState(false);

    // ── subtask dialog state ──────────────────────────────────────────────────
    const [viewSubTask, setViewSubTask] = useState<SubTask | null>(null);
    const [subTaskCreateOpen, setSubTaskCreateOpen] = useState(false);
    const [subTaskEditTarget, setSubTaskEditTarget] = useState<SubTask | null>(null);
    const [subTaskDeleteTarget, setSubTaskDeleteTarget] = useState<SubTask | null>(null);
    const [subTaskStatusUpdate, setSubTaskStatusUpdate] = useState<{ subTask: SubTask; status: string } | null>(null);

    const [subTaskCreateForm, setSubTaskCreateForm] = useState(EMPTY_FORM);
    const [subTaskEditForm, setSubTaskEditForm] = useState(EMPTY_FORM);

    const [subTaskCreating, setSubTaskCreating] = useState(false);
    const [subTaskUpdating, setSubTaskUpdating] = useState(false);
    const [subTaskDeleting, setSubTaskDeleting] = useState(false);
    const [subTaskStatusUpdating, setSubTaskStatusUpdating] = useState(false);

    const [actionError, setActionError] = useState<string | null>(null);

    // ── task handlers ─────────────────────────────────────────────────────────
    const handleTaskCreate = async () => {
        setTaskCreating(true); setActionError(null);
        try {
            const task = await createTask({
                title: taskCreateForm.title,
                projectId: activeProjectId,
                assignedTo: taskCreateForm.assignedTo || undefined,
                deadline: taskCreateForm.deadline || undefined,
                priority: taskCreateForm.priority || undefined,
            });
            dispatch(addTaskToStore(task));
            setTaskCreateOpen(false);
            setTaskCreateForm(EMPTY_FORM);
        } catch (e: any) { setActionError(e.message); }
        finally { setTaskCreating(false); }
    };

    const handleTaskUpdate = async () => {
        if (!taskEditTarget) return;
        setTaskUpdating(true); setActionError(null);
        try {
            const updated = await updateTask({
                id: taskEditTarget.id,
                title: taskEditForm.title,
                assignedTo: taskEditForm.assignedTo || undefined,
                deadline: taskEditForm.deadline || undefined,
                priority: taskEditForm.priority || undefined,
            });
            dispatch(updateTaskInStore(updated));
            setTaskEditTarget(null);
        } catch (e: any) { setActionError(e.message); }
        finally { setTaskUpdating(false); }
    };

    const handleTaskStatusUpdate = async () => {
        if (!taskStatusUpdate) return;
        setTaskStatusUpdating(true); setActionError(null);
        try {
            const updated = await updateTaskStatus(taskStatusUpdate.task.id, taskStatusUpdate.status);
            dispatch(updateTaskInStore(updated));
            setTaskStatusUpdate(null);
        } catch (e: any) { setActionError(e.message); }
        finally { setTaskStatusUpdating(false); }
    };

    const handleTaskDelete = async () => {
        if (!taskDeleteTarget) return;
        setTaskDeleting(true); setActionError(null);
        try {
            await deleteTask(taskDeleteTarget.id);
            dispatch(removeTaskFromStore(taskDeleteTarget.id));
            if (activeTaskId === taskDeleteTarget.id) setActiveTaskId("");
            setTaskDeleteTarget(null);
        } catch (e: any) { setActionError(e.message); }
        finally { setTaskDeleting(false); }
    };

    const openTaskEdit = (task: Task) => {
        setTaskEditForm({ title: task.title, assignedTo: task.assignedTo?.id ?? "", deadline: task.deadline ?? "", priority: task.priority });
        setActionError(null);
        setTaskEditTarget(task);
    };

    // ── subtask handlers ──────────────────────────────────────────────────────
    const handleSubTaskCreate = async () => {
        setSubTaskCreating(true); setActionError(null);
        try {
            const subTask = await createSubTask({
                title: subTaskCreateForm.title,
                taskId: activeTaskId,
                assignedTo: subTaskCreateForm.assignedTo || undefined,
                deadline: subTaskCreateForm.deadline || undefined,
                priority: subTaskCreateForm.priority || undefined,
            });
            dispatch(addSubTaskToStore(subTask));
            setSubTaskCreateOpen(false);
            setSubTaskCreateForm(EMPTY_FORM);
        } catch (e: any) { setActionError(e.message); }
        finally { setSubTaskCreating(false); }
    };

    const handleSubTaskUpdate = async () => {
        if (!subTaskEditTarget) return;
        setSubTaskUpdating(true); setActionError(null);
        try {
            const updated = await updateSubTask({
                id: subTaskEditTarget.id,
                title: subTaskEditForm.title,
                assignedTo: subTaskEditForm.assignedTo || undefined,
                deadline: subTaskEditForm.deadline || undefined,
                priority: subTaskEditForm.priority || undefined,
            });
            dispatch(updateSubTaskInStore(updated));
            setSubTaskEditTarget(null);
        } catch (e: any) { setActionError(e.message); }
        finally { setSubTaskUpdating(false); }
    };

    const handleSubTaskStatusUpdate = async () => {
        if (!subTaskStatusUpdate) return;
        setSubTaskStatusUpdating(true); setActionError(null);
        try {
            const updated = await updateSubTaskStatus(subTaskStatusUpdate.subTask.id, subTaskStatusUpdate.status);
            dispatch(updateSubTaskInStore(updated));
            setSubTaskStatusUpdate(null);
        } catch (e: any) { setActionError(e.message); }
        finally { setSubTaskStatusUpdating(false); }
    };

    const handleSubTaskDelete = async () => {
        if (!subTaskDeleteTarget) return;
        setSubTaskDeleting(true); setActionError(null);
        try {
            await deleteSubTask(subTaskDeleteTarget.id);
            dispatch(removeSubTaskFromStore(subTaskDeleteTarget.id));
            setSubTaskDeleteTarget(null);
        } catch (e: any) { setActionError(e.message); }
        finally { setSubTaskDeleting(false); }
    };

    const openSubTaskEdit = (subTask: SubTask) => {
        setSubTaskEditForm({ title: subTask.title, assignedTo: subTask.assignedTo?.id ?? "", deadline: subTask.deadline ?? "", priority: subTask.priority });
        setActionError(null);
        setSubTaskEditTarget(subTask);
    };

    const visibleTasks = selectedProjectId === activeProjectId ? tasks : [];
    const visibleSubTasks = selectedTaskId === activeTaskId ? subTasks : [];
    const activeTask = visibleTasks.find((t: Task) => t.id === activeTaskId) ?? null;

    return (
        <AppLayout>

            {/* ══ TASKS SECTION ════════════════════════════════════════════════ */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
                    <p className="text-muted-foreground text-sm">View and manage tasks by project.</p>
                </div>
                <Button onClick={() => { setTaskCreateForm(EMPTY_FORM); setActionError(null); setTaskCreateOpen(true); }} disabled={!activeProjectId}>
                    <Plus className="mr-2 h-4 w-4" /> Create Task
                </Button>
            </div>

            <div className="flex items-center gap-3">
                <Label className="shrink-0 text-sm font-medium">Project</Label>
                <Select value={activeProjectId} onValueChange={setActiveProjectId}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Select a project…" /></SelectTrigger>
                    <SelectContent>
                        {projects.map((p: Project) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-lg border bg-card">
                {!activeProjectId ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Select a project to view its tasks.</div>
                ) : tasksLoading ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading tasks…</div>
                ) : tasksError ? (
                    <div className="flex h-48 items-center justify-center text-sm text-destructive">Failed to load tasks.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-muted-foreground">
                                    <th className="px-4 py-3 text-center font-medium">Title</th>
                                    <th className="px-4 py-3 text-center font-medium">Priority</th>
                                    <th className="px-4 py-3 text-center font-medium">Status</th>
                                    <th className="px-4 py-3 text-center font-medium">Deadline</th>
                                    <th className="px-4 py-3 text-center font-medium">Assigned To</th>
                                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleTasks.length === 0 ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No tasks found for this project.</td></tr>
                                ) : (
                                    visibleTasks.map((task: Task) => (
                                        <tr
                                            key={task.id}
                                            className={`cursor-pointer border-b last:border-0 transition-colors duration-150 hover:bg-muted/50 ${activeTaskId === task.id ? "bg-muted/30" : ""}`}
                                            onClick={() => { setViewTask(task); }}
                                        >
                                            <td className="px-4 py-3 font-medium">{task.title}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={PRIORITY_VARIANT[task.priority] ?? "secondary"}>{PRIORITY_LABELS[task.priority] ?? task.priority}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={STATUS_VARIANT[task.currentStatus] ?? "secondary"}>{STATUS_LABELS[task.currentStatus] ?? task.currentStatus}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">{task.deadline ?? "—"}</td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">{task.assignedTo?.name ?? "—"}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" title="Update status"
                                                        onClick={(e) => { e.stopPropagation(); setTaskStatusUpdate({ task, status: task.currentStatus }); setActionError(null); }}>
                                                        <Pencil className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" title="Delete task"
                                                        onClick={(e) => { e.stopPropagation(); setTaskDeleteTarget(task); setActionError(null); }}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ══ SUBTASKS SECTION ═════════════════════════════════════════════ */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Sub Tasks</h2>
                    <p className="text-muted-foreground text-sm">View and manage sub tasks by task.</p>
                </div>
                <Button onClick={() => { setSubTaskCreateForm(EMPTY_FORM); setActionError(null); setSubTaskCreateOpen(true); }} disabled={!activeTaskId}>
                    <Plus className="mr-2 h-4 w-4" /> Create Sub Task
                </Button>
            </div>

            <div className="flex items-center gap-3">
                <Label className="shrink-0 text-sm font-medium">Task</Label>
                <Select value={activeTaskId} onValueChange={setActiveTaskId} disabled={!activeProjectId || visibleTasks.length === 0}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Select a task…" /></SelectTrigger>
                    <SelectContent>
                        {visibleTasks.map((t: Task) => (
                            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {activeTask && (
                    <Badge variant={STATUS_VARIANT[activeTask.currentStatus] ?? "secondary"}>
                        {STATUS_LABELS[activeTask.currentStatus] ?? activeTask.currentStatus}
                    </Badge>
                )}
            </div>

            <div className="rounded-lg border bg-card">
                {!activeTaskId ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Select a task to view its sub tasks.</div>
                ) : subTasksLoading ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading sub tasks…</div>
                ) : subTasksError ? (
                    <div className="flex h-48 items-center justify-center text-sm text-destructive">Failed to load sub tasks.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-muted-foreground">
                                    <th className="px-4 py-3 text-center font-medium">Title</th>
                                    <th className="px-4 py-3 text-center font-medium">Priority</th>
                                    <th className="px-4 py-3 text-center font-medium">Status</th>
                                    <th className="px-4 py-3 text-center font-medium">Deadline</th>
                                    <th className="px-4 py-3 text-center font-medium">Assigned To</th>
                                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleSubTasks.length === 0 ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No sub tasks found for this task.</td></tr>
                                ) : (
                                    visibleSubTasks.map((subTask: SubTask) => (
                                        <tr
                                            key={subTask.id}
                                            className="cursor-pointer border-b last:border-0 transition-colors duration-150 hover:bg-muted/50"
                                            onClick={() => setViewSubTask(subTask)}
                                        >
                                            <td className="px-4 py-3 font-medium">{subTask.title}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={PRIORITY_VARIANT[subTask.priority] ?? "secondary"}>{PRIORITY_LABELS[subTask.priority] ?? subTask.priority}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={STATUS_VARIANT[subTask.currentStatus] ?? "secondary"}>{STATUS_LABELS[subTask.currentStatus] ?? subTask.currentStatus}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">{subTask.deadline ?? "—"}</td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">{subTask.assignedTo?.name ?? "—"}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="ghost" size="icon" title="Update status"
                                                        onClick={(e) => { e.stopPropagation(); setSubTaskStatusUpdate({ subTask, status: subTask.currentStatus }); setActionError(null); }}>
                                                        <Pencil className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" title="Delete sub task"
                                                        onClick={(e) => { e.stopPropagation(); setSubTaskDeleteTarget(subTask); setActionError(null); }}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ══ TASK DIALOGS ═════════════════════════════════════════════════ */}

            <Sheet open={!!viewTask} onOpenChange={(open) => !open && setViewTask(null)}>
                <SheetContent>
                    <SheetHeader><SheetTitle>Task Details</SheetTitle><SheetDescription>Full information for this task.</SheetDescription></SheetHeader>
                    {viewTask && (
                        <div className="mt-6 space-y-4">
                            {([
                                ["Title", viewTask.title],
                                ["Priority", PRIORITY_LABELS[viewTask.priority] ?? viewTask.priority],
                                ["Status", STATUS_LABELS[viewTask.currentStatus] ?? viewTask.currentStatus],
                                ["Deadline", viewTask.deadline ?? "—"],
                                ["Assigned To", viewTask.assignedTo?.name ?? "—"],
                                ["Created By", viewTask.createdBy?.name ?? "—"],
                                ["Project", viewTask.project?.name ?? "—"],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">{label}</Label>
                                    <Input value={value} readOnly disabled />
                                </div>
                            ))}
                            <div className="pt-2 space-y-2">
                                <Button className="w-full" onClick={() => { setViewTask(null); openTaskEdit(viewTask); }}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Task
                                </Button>
                                <Button className="w-full" variant="outline" onClick={() => { setActiveTaskId(viewTask.id); setViewTask(null); }}>
                                    View Sub Tasks
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <Dialog open={taskCreateOpen} onOpenChange={(open) => { if (!open) { setTaskCreateOpen(false); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create Task</DialogTitle><DialogDescription>Add a new task to this project.</DialogDescription></DialogHeader>
                    <TaskFormFields form={taskCreateForm} onChange={setTaskCreateForm} users={users} />
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setTaskCreateOpen(false); setActionError(null); }}>Cancel</Button>
                        <Button onClick={handleTaskCreate} disabled={taskCreating || !taskCreateForm.title}>{taskCreating ? "Creating…" : "Create"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!taskEditTarget} onOpenChange={(open) => { if (!open) { setTaskEditTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Task</DialogTitle><DialogDescription>Update details for <strong>{taskEditTarget?.title}</strong>.</DialogDescription></DialogHeader>
                    <TaskFormFields form={taskEditForm} onChange={setTaskEditForm} users={users} />
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setTaskEditTarget(null); setActionError(null); }}>Cancel</Button>
                        <Button onClick={handleTaskUpdate} disabled={taskUpdating || !taskEditForm.title}>{taskUpdating ? "Saving…" : "Save Changes"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!taskStatusUpdate} onOpenChange={(open) => { if (!open) { setTaskStatusUpdate(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Update Task Status</DialogTitle><DialogDescription>Change the status of <strong>{taskStatusUpdate?.task.title}</strong>.</DialogDescription></DialogHeader>
                    <div className="space-y-1.5">
                        <Label>Status</Label>
                        <Select value={taskStatusUpdate?.status ?? ""} onValueChange={(v) => setTaskStatusUpdate((prev) => prev ? { ...prev, status: v } : null)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setTaskStatusUpdate(null); setActionError(null); }}>Cancel</Button>
                        <Button onClick={handleTaskStatusUpdate} disabled={taskStatusUpdating}>{taskStatusUpdating ? "Updating…" : "Update"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!taskDeleteTarget} onOpenChange={(open) => { if (!open) { setTaskDeleteTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Delete Task</DialogTitle><DialogDescription>Permanently delete <strong>{taskDeleteTarget?.title}</strong>? This cannot be undone.</DialogDescription></DialogHeader>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setTaskDeleteTarget(null); setActionError(null); }}>Cancel</Button>
                        <Button variant="destructive" onClick={handleTaskDelete} disabled={taskDeleting}>{taskDeleting ? "Deleting…" : "Delete"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══ SUBTASK DIALOGS ══════════════════════════════════════════════ */}

            <Sheet open={!!viewSubTask} onOpenChange={(open) => !open && setViewSubTask(null)}>
                <SheetContent>
                    <SheetHeader><SheetTitle>Sub Task Details</SheetTitle><SheetDescription>Full information for this sub task.</SheetDescription></SheetHeader>
                    {viewSubTask && (
                        <div className="mt-6 space-y-4">
                            {([
                                ["Title", viewSubTask.title],
                                ["Priority", PRIORITY_LABELS[viewSubTask.priority] ?? viewSubTask.priority],
                                ["Status", STATUS_LABELS[viewSubTask.currentStatus] ?? viewSubTask.currentStatus],
                                ["Deadline", viewSubTask.deadline ?? "—"],
                                ["Assigned To", viewSubTask.assignedTo?.name ?? "—"],
                                ["Created By", viewSubTask.createdBy?.name ?? "—"],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">{label}</Label>
                                    <Input value={value} readOnly disabled />
                                </div>
                            ))}
                            <div className="pt-2">
                                <Button className="w-full" onClick={() => { setViewSubTask(null); openSubTaskEdit(viewSubTask); }}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Sub Task
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <Dialog open={subTaskCreateOpen} onOpenChange={(open) => { if (!open) { setSubTaskCreateOpen(false); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create Sub Task</DialogTitle><DialogDescription>Add a new sub task to this task.</DialogDescription></DialogHeader>
                    <TaskFormFields form={subTaskCreateForm} onChange={setSubTaskCreateForm} users={users} />
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setSubTaskCreateOpen(false); setActionError(null); }}>Cancel</Button>
                        <Button onClick={handleSubTaskCreate} disabled={subTaskCreating || !subTaskCreateForm.title}>{subTaskCreating ? "Creating…" : "Create"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!subTaskEditTarget} onOpenChange={(open) => { if (!open) { setSubTaskEditTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Sub Task</DialogTitle><DialogDescription>Update details for <strong>{subTaskEditTarget?.title}</strong>.</DialogDescription></DialogHeader>
                    <TaskFormFields form={subTaskEditForm} onChange={setSubTaskEditForm} users={users} />
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setSubTaskEditTarget(null); setActionError(null); }}>Cancel</Button>
                        <Button onClick={handleSubTaskUpdate} disabled={subTaskUpdating || !subTaskEditForm.title}>{subTaskUpdating ? "Saving…" : "Save Changes"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!subTaskStatusUpdate} onOpenChange={(open) => { if (!open) { setSubTaskStatusUpdate(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Update Sub Task Status</DialogTitle><DialogDescription>Change the status of <strong>{subTaskStatusUpdate?.subTask.title}</strong>.</DialogDescription></DialogHeader>
                    <div className="space-y-1.5">
                        <Label>Status</Label>
                        <Select value={subTaskStatusUpdate?.status ?? ""} onValueChange={(v) => setSubTaskStatusUpdate((prev) => prev ? { ...prev, status: v } : null)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setSubTaskStatusUpdate(null); setActionError(null); }}>Cancel</Button>
                        <Button onClick={handleSubTaskStatusUpdate} disabled={subTaskStatusUpdating}>{subTaskStatusUpdating ? "Updating…" : "Update"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!subTaskDeleteTarget} onOpenChange={(open) => { if (!open) { setSubTaskDeleteTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Delete Sub Task</DialogTitle><DialogDescription>Permanently delete <strong>{subTaskDeleteTarget?.title}</strong>? This cannot be undone.</DialogDescription></DialogHeader>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setSubTaskDeleteTarget(null); setActionError(null); }}>Cancel</Button>
                        <Button variant="destructive" onClick={handleSubTaskDelete} disabled={subTaskDeleting}>{subTaskDeleting ? "Deleting…" : "Delete"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </AppLayout>
    );
};
