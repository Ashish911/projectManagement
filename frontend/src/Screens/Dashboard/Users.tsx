import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppLayout } from "@/Screens/Components/AppLayout";
import { deleteUser, promoteToAdmin } from "@/api/userApi";
import { fetchUsers, removeUserFromStore, promoteUserInStore } from "@/redux/actions/usersListActions";
import type { User } from "@/types/userTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2, ShieldCheck } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    CLIENT_ADMIN: "Client Admin",
    USER: "User",
};

const ROLE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    SUPER_ADMIN: "destructive",
    CLIENT_ADMIN: "default",
    USER: "secondary",
};

const GENDER_LABELS: Record<string, string> = {
    MALE: "Male",
    FEMALE: "Female",
    OTHERS: "Others",
};

export const Users: React.FC = () => {
    const dispatch = useDispatch();
    const { users, loading, error } = useSelector((state: any) => state.usersList);

    useEffect(() => {
        dispatch(fetchUsers() as any);
    }, [dispatch]);

    const [viewUser, setViewUser] = useState<User | null>(null);
    const [promoteTarget, setPromoteTarget] = useState<User | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [promotingId, setPromotingId] = useState<string | null>(null);

    const handleDelete = async (userId: string) => {
        setDeletingId(userId);
        setActionError(null);
        try {
            await deleteUser(userId);
            dispatch(removeUserFromStore(userId));
            setDeleteTarget(null);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handlePromote = async (userId: string) => {
        setPromotingId(userId);
        setActionError(null);
        try {
            await promoteToAdmin(userId);
            dispatch(promoteUserInStore(userId));
            setViewUser(null);
            setPromoteTarget(null);
        } catch (e: any) {
            setActionError(e.message);
        } finally {
            setPromotingId(null);
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
                <p className="text-muted-foreground text-sm">Manage platform users and their roles.</p>
            </div>

            <div className="rounded-lg border bg-card">
                {loading ? (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        Loading users…
                    </div>
                ) : error ? (
                    <div className="flex h-48 items-center justify-center text-sm text-destructive">
                        Failed to load users.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 text-muted-foreground">
                                    <th className="px-4 py-3 text-center font-medium">Name</th>
                                    <th className="px-4 py-3 text-center font-medium">Email</th>
                                    <th className="px-4 py-3 text-center font-medium">Phone</th>
                                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user: User) => (
                                        <tr
                                            key={user.id}
                                            className="cursor-pointer border-b last:border-0 transition-colors duration-150 hover:bg-muted/50"
                                            onClick={() => setViewUser(user)}
                                        >
                                            <td className="px-4 py-3 font-medium">{user.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{user.number}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Delete user"
                                                        disabled={deletingId === user.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteTarget(user);
                                                            setActionError(null);
                                                        }}
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
            <Sheet open={!!viewUser} onOpenChange={(open) => { if (!open) { setViewUser(null); setActionError(null); } }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>User Details</SheetTitle>
                        <SheetDescription>Full profile information for this user.</SheetDescription>
                    </SheetHeader>
                    {viewUser && (
                        <div className="mt-6 space-y-4">
                            {([
                                ["Full Name", viewUser.name],
                                ["Email", viewUser.email],
                                ["Phone", viewUser.number],
                                ["Date of Birth", viewUser.dob],
                                ["Gender", GENDER_LABELS[viewUser.gender] ?? viewUser.gender],
                                ["Role", ROLE_LABELS[viewUser.role] ?? viewUser.role],
                            ] as [string, string][]).map(([label, value]) => (
                                <div key={label} className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">{label}</Label>
                                    <Input value={value} readOnly disabled />
                                </div>
                            ))}

                            {viewUser.role === "USER" && (
                                <div className="pt-2">
                                    {actionError && (
                                        <p className="mb-2 text-sm text-destructive">{actionError}</p>
                                    )}
                                    <Button
                                        className="w-full"
                                        disabled={promotingId === viewUser.id}
                                        onClick={() => setPromoteTarget(viewUser)}
                                    >
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Promote to Client Admin
                                    </Button>
                                </div>
                            )}

                            <div className="pt-1">
                                <Badge variant={ROLE_VARIANT[viewUser.role] ?? "outline"} className="w-full justify-center py-1">
                                    {ROLE_LABELS[viewUser.role] ?? viewUser.role}
                                </Badge>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Promote to Admin Dialog ────────────────────────────────────── */}
            <Dialog open={!!promoteTarget} onOpenChange={(open) => { if (!open) { setPromoteTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Promote to Client Admin</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to promote <strong>{promoteTarget?.name}</strong> to Client Admin?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setPromoteTarget(null); setActionError(null); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => promoteTarget && handlePromote(promoteTarget.id)}
                            disabled={promotingId === promoteTarget?.id}
                        >
                            {promotingId === promoteTarget?.id ? "Promoting…" : "Promote"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Dialog ──────────────────────────────────────────────── */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setActionError(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                            This action is permanent and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDeleteTarget(null); setActionError(null); }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
                            disabled={deletingId === deleteTarget?.id}
                        >
                            {deletingId === deleteTarget?.id ? "Deleting…" : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
};
