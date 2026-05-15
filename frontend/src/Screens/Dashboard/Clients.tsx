import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppLayout } from "@/Screens/Components/AppLayout";
import {
    addClient,
    updateClient,
    confirmDeleteClient,
    forceDeleteClient,
    assignAdmin,
} from "@/api/clientApi";
import {
    fetchClients,
    addClientToStore,
    updateClientInStore,
    removeClientFromStore,
    flagClientDeleteRequest,
    setClientsFilter,
} from "@/redux/actions/clientsActions";
import { fetchUsers } from "@/redux/actions/usersListActions";
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
import { Pencil, Trash2, UserPlus, Plus, ShieldOff } from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", email: "", phone: "", assignedAdmin: "" };

type ClientForm = typeof EMPTY_FORM;

function ClientFormFields({
    form,
    onChange,
    adminUsers,
}: {
    form: ClientForm;
    onChange: (f: ClientForm) => void;
    adminUsers: User[];
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <Label>Assigned Admin (optional)</Label>
                <Select
                    value={form.assignedAdmin}
                    onValueChange={(v) => onChange({ ...form, assignedAdmin: v === "none" ? "" : v })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {adminUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.email})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

// ── page ──────────────────────────────────────────────────────────────────────

export const Clients: React.FC = () => {
    const dispatch = useDispatch();
    const { clients, loading, error, activeFilter } = useSelector((state: any) => state.clients);
    const { users } = useSelector((state: any) => state.usersList);

    const FILTER_LABELS: Record<string, string> = {
        pending: "Pending Deletion",
        unassigned: "Unassigned",
    };

    const visibleClients: Client[] = activeFilter
        ? activeFilter === "pending"
            ? clients.filter((c: Client) => c.deleteRequest)
            : clients.filter((c: Client) => !c.assignedAdmin)
        : clients;

    useEffect(() => {
        dispatch(fetchClients() as any);
        dispatch(fetchUsers() as any);
    }, [dispatch]);

    // Only CLIENT_ADMIN users who are not already assigned to a client
    const assignedAdminIds = new Set(
        clients.map((c: Client) => c.assignedAdmin?.id).filter(Boolean)
    );
    const adminUsers: User[] = users.filter(
        (u: User) => u.role === "CLIENT_ADMIN" && !assignedAdminIds.has(u.id)
    );

    // ── dialogs state ─────────────────────────────────────────────────────────
    const [viewClient, setViewClient] = useState<Client | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Client | null>(null);
    const [assignTarget, setAssignTarget] = useState<Client | null>(null);
    const [deleteRequestTarget, setDeleteRequestTarget] = useState<Client | null>(null);
    const [forceDeleteTarget, setForceDeleteTarget] = useState<Client | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [createForm, setCreateForm] = useState<ClientForm>(EMPTY_FORM);
    const [editForm, setEditForm] = useState<ClientForm>(EMPTY_FORM);
    const [assignAdminId, setAssignAdminId] = useState("");

    // ── mutation loading flags ────────────────────────────────────────────────
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deletingRequest, setDeletingRequest] = useState(false);
    const [forceDeleting, setForceDeleting] = useState(false);
    const [assigning, setAssigning] = useState(false);

    // ── mutation handlers ─────────────────────────────────────────────────────
    const handleCreate = async () => {
        setCreating(true);
        setActionError(null);
        try {
            const newClient = await addClient({
                name: createForm.name,
                email: createForm.email,
                phone: createForm.phone,
                ...(createForm.assignedAdmin ? { assignedAdmin: createForm.assignedAdmin } : {}),
            });
            dispatch(addClientToStore(newClient));
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
            const updated = await updateClient({
                id: editTarget.id,
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
                ...(editForm.assignedAdmin ? { assignedAdmin: editForm.assignedAdmin } : {}),
            });
            dispatch(updateClientInStore(updated));
            setEditTarget(null);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteRequest = async () => {
        if (!deleteRequestTarget) return;
        setDeletingRequest(true);
        setActionError(null);
        try {
            await confirmDeleteClient(deleteRequestTarget.id);
            dispatch(flagClientDeleteRequest(deleteRequestTarget.id));
            setDeleteRequestTarget(null);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setDeletingRequest(false);
        }
    };

    const handleForceDelete = async () => {
        if (!forceDeleteTarget) return;
        setForceDeleting(true);
        setActionError(null);
        try {
            await forceDeleteClient(forceDeleteTarget.id);
            dispatch(removeClientFromStore(forceDeleteTarget.id));
            setForceDeleteTarget(null);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setForceDeleting(false);
        }
    };

    const handleAssignAdmin = async () => {
        if (!assignTarget) return;
        setAssigning(true);
        setActionError(null);
        try {
            const updated = await assignAdmin({ id: assignTarget.id, assignedAdmin: assignAdminId });
            dispatch(updateClientInStore(updated));
            setAssignTarget(null);
            setAssignAdminId("");
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setAssigning(false);
        }
    };

    // ── open edit dialog ──────────────────────────────────────────────────────
    const openEdit = (client: Client) => {
        setEditForm({
            name: client.name,
            email: client.email,
            phone: client.phone,
            assignedAdmin: client.assignedAdmin?.id ?? "",
        });
        setActionError(null);
        setEditTarget(client);
    };

    const openAssign = (client: Client) => {
        setAssignAdminId(client.assignedAdmin?.id ?? "");
        setActionError(null);
        setAssignTarget(client);
    };

    return (
        <AppLayout>
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Clients</h2>
                    <p className="text-muted-foreground text-sm">View and manage clients.</p>
                </div>
                <Button onClick={() => { setCreateForm(EMPTY_FORM); setActionError(null); setCreateOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Client
                </Button>
            </div>

            {activeFilter && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                    <span>Filtered by: <strong>{FILTER_LABELS[activeFilter] ?? activeFilter}</strong></span>
                    <button
                        className="ml-auto rounded px-2 py-0.5 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                        onClick={() => dispatch(setClientsFilter(null))}
                    >
                        Clear filter ×
                    </button>
                </div>
            )}

            <div className="rounded-lg border bg-card">
                {loading ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        Loading clients…
                    </div>
                ) : error ? (
                    <div className="flex h-48 items-center justify-center text-sm text-destructive">
                        Failed to load clients.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-muted-foreground">
                                    <th className="px-4 py-3 text-center font-medium">Name</th>
                                    <th className="px-4 py-3 text-center font-medium">Email</th>
                                    <th className="px-4 py-3 text-center font-medium">Phone</th>
                                    <th className="px-4 py-3 text-center font-medium">Delete Request</th>
                                    <th className="px-4 py-3 text-center font-medium">Assigned Admin</th>
                                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleClients.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                            {activeFilter ? `No ${FILTER_LABELS[activeFilter] ?? activeFilter} clients found.` : "No clients found."}
                                        </td>
                                    </tr>
                                ) : (
                                    visibleClients.map((client: Client) => (
                                        <tr
                                            key={client.id}
                                            className="cursor-pointer border-b last:border-0 transition-colors duration-150 hover:bg-muted/50"
                                            onClick={() => setViewClient(client)}
                                        >
                                            <td className="px-4 py-3 font-medium">{client.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{client.email}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{client.phone}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={client.deleteRequest ? "destructive" : "secondary"}>
                                                    {client.deleteRequest ? "Requested" : "None"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">
                                                {client.assignedAdmin ? client.assignedAdmin.name : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Assign admin"
                                                        onClick={(e) => { e.stopPropagation(); openAssign(client); }}
                                                    >
                                                        <UserPlus className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    {!client.deleteRequest && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Request deletion"
                                                            onClick={(e) => { e.stopPropagation(); setDeleteRequestTarget(client); setActionError(null); }}
                                                        >
                                                            <ShieldOff className="h-4 w-4 text-orange-500" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Force delete"
                                                        onClick={(e) => { e.stopPropagation(); setForceDeleteTarget(client); setActionError(null); }}
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
            <Sheet open={!!viewClient} onOpenChange={(open) => !open && setViewClient(null)}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Client Details</SheetTitle>
                        <SheetDescription>Full information for this client.</SheetDescription>
                    </SheetHeader>
                    {viewClient && (
                        <div className="mt-6 space-y-4">
                            {([
                                ["Name", viewClient.name],
                                ["Email", viewClient.email],
                                ["Phone", viewClient.phone],
                                ["Delete Request", viewClient.deleteRequest ? "Yes" : "No"],
                                ["Assigned Admin", viewClient.assignedAdmin?.name ?? "—"],
                                ["Admin Email", viewClient.assignedAdmin?.email ?? "—"],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">{label}</Label>
                                    <Input value={value} readOnly disabled />
                                </div>
                            ))}
                            <div className="pt-2">
                                <Button
                                    className="w-full"
                                    onClick={() => { setViewClient(null); openEdit(viewClient); }}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Client
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Create Client Dialog ───────────────────────────────────────── */}
            <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Client</DialogTitle>
                        <DialogDescription>Fill in the details for the new client.</DialogDescription>
                    </DialogHeader>
                    <ClientFormFields form={createForm} onChange={setCreateForm} adminUsers={adminUsers} />
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setCreateOpen(false); setActionError(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={creating || !createForm.name || !createForm.email || !createForm.phone}
                        >
                            {creating ? "Creating…" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Client Dialog ─────────────────────────────────────────── */}
            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Client</DialogTitle>
                        <DialogDescription>Update the details for <strong>{editTarget?.name}</strong>.</DialogDescription>
                    </DialogHeader>
                    <ClientFormFields form={editForm} onChange={setEditForm} adminUsers={adminUsers} />
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditTarget(null); setActionError(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={updating || !editForm.name || !editForm.email || !editForm.phone}
                        >
                            {updating ? "Saving…" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Assign Admin Dialog ────────────────────────────────────────── */}
            <Dialog open={!!assignTarget} onOpenChange={(open) => { if (!open) { setAssignTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Admin</DialogTitle>
                        <DialogDescription>
                            Select a Client Admin to assign to <strong>{assignTarget?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5">
                        <Label>Admin</Label>
                        <Select value={assignAdminId} onValueChange={setAssignAdminId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an admin" />
                            </SelectTrigger>
                            <SelectContent>
                                {adminUsers.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.name} ({u.email})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setAssignTarget(null); setActionError(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignAdmin}
                            disabled={assigning || !assignAdminId}
                        >
                            {assigning ? "Assigning…" : "Assign"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Request Dialog ──────────────────────────────────────── */}
            <Dialog open={!!deleteRequestTarget} onOpenChange={(open) => { if (!open) { setDeleteRequestTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Client Deletion</DialogTitle>
                        <DialogDescription>
                            Mark <strong>{deleteRequestTarget?.name}</strong> as pending deletion?
                            This flags the client for review before permanent removal.
                        </DialogDescription>
                    </DialogHeader>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDeleteRequestTarget(null); setActionError(null); }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteRequest}
                            disabled={deletingRequest}
                        >
                            {deletingRequest ? "Requesting…" : "Confirm Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Force Delete Dialog ────────────────────────────────────────── */}
            <Dialog open={!!forceDeleteTarget} onOpenChange={(open) => { if (!open) { setForceDeleteTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Force Delete Client</DialogTitle>
                        <DialogDescription>
                            Permanently delete <strong>{forceDeleteTarget?.name}</strong>? This cannot be undone and will remove all associated data.
                        </DialogDescription>
                    </DialogHeader>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setForceDeleteTarget(null); setActionError(null); }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleForceDelete}
                            disabled={forceDeleting}
                        >
                            {forceDeleting ? "Deleting…" : "Force Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
};
