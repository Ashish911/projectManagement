import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppLayout } from "@/Screens/Components/AppLayout";
import { addProject, updateProject, deleteProject, addUserToProject, removeUserFromProject } from "@/api/projectApi";
import { fetchProjects, addProjectToStore, updateProjectInStore, removeProjectFromStore, setProjectsStatusFilter } from "@/redux/actions/projectsActions";
import { fetchClients } from "@/redux/actions/clientsActions";
import { fetchUsers } from "@/redux/actions/usersListActions";
import type { Project } from "@/types/projectTypes";
import type { Client } from "@/types/clientTypes";
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
import { Pencil, Trash2, Users, Plus } from "lucide-react";

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
};

const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
    NOT_STARTED: "secondary",
    IN_PROGRESS: "default",
    COMPLETED: "outline",
};

const STATUS_OPTIONS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

const EMPTY_FORM = { name: "", description: "", clientId: "", status: "NOT_STARTED" };

type ProjectForm = typeof EMPTY_FORM;

// ── page ──────────────────────────────────────────────────────────────────────

export const Projects: React.FC = () => {
    const dispatch = useDispatch();
    const { projects, loading, error, statusFilter } = useSelector((state: any) => state.projects);
    const { clients } = useSelector((state: any) => state.clients);
    const { users } = useSelector((state: any) => state.usersList);

    const STATUS_FILTER_LABEL: Record<string, string> = {
        NOT_STARTED: "Not Started",
        IN_PROGRESS: "In Progress",
        COMPLETED: "Completed",
    };

    const visibleProjects: Project[] = statusFilter
        ? projects.filter((p: Project) => p.status === statusFilter)
        : projects;

    useEffect(() => {
        dispatch(fetchProjects() as any);
        dispatch(fetchClients() as any);
        dispatch(fetchUsers() as any);
    }, [dispatch]);

    // ── dialog state ──────────────────────────────────────────────────────────
    const [viewProject, setViewProject] = useState<Project | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Project | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
    const [teamTarget, setTeamTarget] = useState<Project | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [createForm, setCreateForm] = useState<ProjectForm>(EMPTY_FORM);
    const [editForm, setEditForm] = useState({ name: "", description: "", status: "NOT_STARTED" });
    const [addUserId, setAddUserId] = useState("");

    // ── loading flags ─────────────────────────────────────────────────────────
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [teamLoading, setTeamLoading] = useState(false);

    // ── handlers ──────────────────────────────────────────────────────────────
    const handleCreate = async () => {
        setCreating(true);
        setActionError(null);
        try {
            const project = await addProject({
                name: createForm.name,
                description: createForm.description || undefined,
                clientId: createForm.clientId,
                status: createForm.status || undefined,
            });
            dispatch(addProjectToStore(project));
            setCreateOpen(false);
            setCreateForm(EMPTY_FORM);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdate = async () => {
        if (!editTarget) return;
        setUpdating(true);
        setActionError(null);
        try {
            const updated = await updateProject({
                id: editTarget.id,
                name: editForm.name,
                description: editForm.description,
                status: editForm.status,
            });
            dispatch(updateProjectInStore(updated));
            setEditTarget(null);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        setActionError(null);
        try {
            await deleteProject(deleteTarget.id);
            dispatch(removeProjectFromStore(deleteTarget.id));
            setDeleteTarget(null);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setDeleting(false);
        }
    };

    const handleAddUser = async () => {
        if (!teamTarget || !addUserId) return;
        setTeamLoading(true);
        setActionError(null);
        try {
            const updated = await addUserToProject({ id: teamTarget.id, users: [addUserId] });
            dispatch(updateProjectInStore(updated));
            setTeamTarget(updated);
            setAddUserId("");
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setTeamLoading(false);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!teamTarget) return;
        setTeamLoading(true);
        setActionError(null);
        try {
            const updated = await removeUserFromProject({ id: teamTarget.id, users: [userId] });
            dispatch(updateProjectInStore(updated));
            setTeamTarget(updated);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setTeamLoading(false);
        }
    };

    const openEdit = (project: Project) => {
        setEditForm({ name: project.name, description: project.description, status: project.status });
        setActionError(null);
        setEditTarget(project);
    };

    const availableUsers = (project: Project | null): User[] =>
        users.filter((u: User) => !project?.user.some((m) => m.id === u.id));

    return (
        <AppLayout>
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
                    <p className="text-muted-foreground text-sm">Manage projects and their teams.</p>
                </div>
                <Button onClick={() => { setCreateForm(EMPTY_FORM); setActionError(null); setCreateOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                </Button>
            </div>

            {statusFilter && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                    <span>Filtered by: <strong>{STATUS_FILTER_LABEL[statusFilter] ?? statusFilter}</strong></span>
                    <button
                        className="ml-auto rounded px-2 py-0.5 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                        onClick={() => dispatch(setProjectsStatusFilter(null))}
                    >
                        Clear filter ×
                    </button>
                </div>
            )}

            <div className="rounded-lg border bg-card">
                {loading ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        Loading projects…
                    </div>
                ) : error ? (
                    <div className="flex h-48 items-center justify-center text-sm text-destructive">
                        Failed to load projects.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-muted-foreground">
                                    <th className="px-4 py-3 text-center font-medium">Name</th>
                                    <th className="px-4 py-3 text-center font-medium">Status</th>
                                    <th className="px-4 py-3 text-center font-medium">Client</th>
                                    <th className="px-4 py-3 text-center font-medium">Team</th>
                                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                            {statusFilter ? `No ${STATUS_FILTER_LABEL[statusFilter] ?? statusFilter} projects found.` : "No projects found."}
                                        </td>
                                    </tr>
                                ) : (
                                    visibleProjects.map((project: Project) => (
                                        <tr
                                            key={project.id}
                                            className="cursor-pointer border-b last:border-0 transition-colors duration-150 hover:bg-muted/50"
                                            onClick={() => setViewProject(project)}
                                        >
                                            <td className="px-4 py-3 font-medium">{project.name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={STATUS_VARIANT[project.status] ?? "secondary"}>
                                                    {STATUS_LABELS[project.status] ?? project.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">
                                                {project.client?.name ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">
                                                {project.user.length} member{project.user.length !== 1 ? "s" : ""}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Manage team"
                                                        onClick={(e) => { e.stopPropagation(); setTeamTarget(project); setAddUserId(""); setActionError(null); }}
                                                    >
                                                        <Users className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Delete project"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); setActionError(null); }}
                                                    >
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

            {/* ── View Details Sheet ─────────────────────────────────────────── */}
            <Sheet open={!!viewProject} onOpenChange={(open) => !open && setViewProject(null)}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Project Details</SheetTitle>
                        <SheetDescription>Full information for this project.</SheetDescription>
                    </SheetHeader>
                    {viewProject && (
                        <div className="mt-6 space-y-4">
                            {([
                                ["Name", viewProject.name],
                                ["Description", viewProject.description],
                                ["Status", STATUS_LABELS[viewProject.status] ?? viewProject.status],
                                ["Client", viewProject.client?.name ?? "—"],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">{label}</Label>
                                    <Input value={value} readOnly disabled />
                                </div>
                            ))}
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs">Team Members</Label>
                                {viewProject.user.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No members assigned.</p>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {viewProject.user.map((u) => (
                                            <div key={u.id} className="rounded-md border px-3 py-2 text-sm">
                                                {u.name} <span className="text-muted-foreground">({u.email})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="pt-2">
                                <Button className="w-full" onClick={() => { setViewProject(null); openEdit(viewProject); }}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Project
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Create Dialog ──────────────────────────────────────────────── */}
            <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Project</DialogTitle>
                        <DialogDescription>Fill in the details for the new project.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Name</Label>
                            <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Client</Label>
                            <Select value={createForm.clientId} onValueChange={(v) => setCreateForm({ ...createForm, clientId: v })}>
                                <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                                <SelectContent>
                                    {clients.map((c: Client) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Status</Label>
                            <Select value={createForm.status} onValueChange={(v) => setCreateForm({ ...createForm, status: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setCreateOpen(false); setActionError(null); }}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating || !createForm.name || !createForm.clientId}>
                            {creating ? "Creating…" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Dialog ────────────────────────────────────────────────── */}
            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>Update details for <strong>{editTarget?.name}</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Name</Label>
                            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Status</Label>
                            <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditTarget(null); setActionError(null); }}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={updating || !editForm.name}>
                            {updating ? "Saving…" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Manage Team Dialog ─────────────────────────────────────────── */}
            <Dialog open={!!teamTarget} onOpenChange={(open) => { if (!open) { setTeamTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Team</DialogTitle>
                        <DialogDescription>Add or remove members for <strong>{teamTarget?.name}</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Current Members</Label>
                            {teamTarget?.user.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No members yet.</p>
                            ) : (
                                teamTarget?.user.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                        <span>{u.name} <span className="text-muted-foreground">({u.email})</span></span>
                                        <Button variant="ghost" size="icon" disabled={teamLoading} onClick={() => handleRemoveUser(u.id)}>
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Add Member</Label>
                            <div className="flex gap-2">
                                <Select value={addUserId} onValueChange={setAddUserId}>
                                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select a user" /></SelectTrigger>
                                    <SelectContent>
                                        {availableUsers(teamTarget).map((u: User) => (
                                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleAddUser} disabled={teamLoading || !addUserId}>Add</Button>
                            </div>
                        </div>
                    </div>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setTeamTarget(null); setActionError(null); }}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Dialog ──────────────────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            Permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDeleteTarget(null); setActionError(null); }}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? "Deleting…" : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
};
