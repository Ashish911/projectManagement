import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IconDownload, IconEye, IconPencil, IconUserPlus, IconUsers, IconX } from "@tabler/icons-react";
import { setUsersRoleFilter } from "@/redux/actions/usersListActions";
import type { Role, User } from "@/types/userTypes";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/pm/page-head";
import { SearchBox } from "@/components/pm/search-box";
import { AnimatedTabs } from "@/components/pm/animated-tabs";
import { TableCard, tableCls } from "@/components/pm/table";
import { Check } from "@/components/pm/check";
import { Avatar } from "@/components/pm/avatar";
import { StatusBadge, Tag } from "@/components/pm/status-badge";
import { EmptyState } from "@/components/pm/empty-state";
import { useForms } from "@/components/forms/forms-context";
import { openTaskCount, useAppData } from "@/components/forms/use-app-data";
import { STATUS_LABEL, STATUS_TONE } from "@/components/forms/user-form";
import { cn } from "@/lib/utils";
import { useSelection } from "@/hooks/use-selection";

type RoleTab = "all" | Role;

/** "5m ago", "3h ago", "4d ago", or a date for anything older than a month. */
const lastSeen = (iso?: string | null) => {
    if (!iso) return "Never";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "Now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    if (mins < 43200) return `${Math.floor(mins / 1440)}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const Users: React.FC = () => {
    const dispatch = useDispatch();
    const openForm = useForms();
    const { loading, error, roleFilter } = useSelector((state: any) => state.usersList);
    const { profile, users, clients, projects, tasks } = useAppData();

    // A dashboard drill-down may arrive with a role filter; adopt it as the active tab once
    const [tab, setTab] = useState<RoleTab>(roleFilter ?? "all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (roleFilter) dispatch(setUsersRoleFilter(null));
    }, [dispatch]);

    // Projects each user is on, and the client each client admin runs
    const projectCount = useMemo(() => {
        const m = new Map<string, number>();
        projects.forEach((p) => p.user?.forEach((u) => m.set(u.id, (m.get(u.id) ?? 0) + 1)));
        return m;
    }, [projects]);
    const clientOf = useMemo(() => new Map(clients.filter((c) => c.assignedAdmin).map((c) => [c.assignedAdmin!.id, c.name])), [clients]);

    const count = (t: RoleTab) => users.filter((u) => t === "all" || u.role === t).length;
    const rows = users.filter(
        (u) => (tab === "all" || u.role === tab) && (!search || `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())),
    );
    const locked = users.filter((u) => u.status === "LOCKED").length;
    const invited = users.filter((u) => u.status === "INVITED").length;

    // You can act on anyone except yourself and other super admins (view only, also enforced by the server)
    const isProtected = (u: { id: string; role: string }) => u.id === profile?.id || u.role === "SUPER_ADMIN";
    const selectable = rows.filter((u) => !isProtected(u));
    const selection = useSelection(selectable.map((u) => u.id));
    const bulk = (kind: "bulk-role" | "bulk-unlock" | "bulk-remove") => () => openForm(kind, { userIds: selection.selected });

    return (
        <>
            <PageHead
                title="Users"
                sub={`${users.length} people${locked ? ` · ${locked} locked` : ""}${invited ? ` · ${invited} pending invite${invited === 1 ? "" : "s"}` : ""}`}
            >
                <Button variant="outline" onClick={() => openForm("export-users", { role: tab })} disabled={!users.length}><IconDownload />Export</Button>
                <Button onClick={() => openForm("user")}><IconUserPlus />Invite user</Button>
            </PageHead>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <SearchBox value={search} onChange={setSearch} placeholder="Search name or email" />
                <div className="[&_[role=tablist]]:border-b-0">
                    <AnimatedTabs
                        value={tab}
                        onChange={(t) => { setTab(t); selection.clear(); }}
                        tabs={[
                            { value: "all", label: "All", count: count("all") },
                            { value: "SUPER_ADMIN", label: "Super admins", count: count("SUPER_ADMIN") },
                            { value: "CLIENT_ADMIN", label: "Client admins", count: count("CLIENT_ADMIN") },
                            { value: "USER", label: "Users", count: count("USER") },
                        ]}
                    />
                </div>
            </div>

            <TableCard>
                {loading && users.length === 0 ? (
                    <div className="py-16 text-center text-sm text-muted-foreground">Loading users…</div>
                ) : error ? (
                    <div className="tone-red tone-fg py-16 text-center text-sm">Failed to load users.</div>
                ) : rows.length === 0 ? (
                    <EmptyState icon={IconUsers} title="No users found" hint={search ? "Try a different name or email." : undefined} />
                ) : (
                    <table className={tableCls.table}>
                        <thead>
                            <tr>
                                <th className={cn(tableCls.th, "w-9")}>
                                    <Check
                                        label="Select all"
                                        checked={selection.allSelected}
                                        mixed={selection.mixed}
                                        onChange={selection.toggleAll}
                                    />
                                </th>
                                <th className={tableCls.th}>Name</th>
                                <th className={tableCls.th}>Role</th>
                                <th className={tableCls.th}>Projects</th>
                                <th className={tableCls.th}>Open tasks</th>
                                <th className={tableCls.th}>Last sign-in</th>
                                <th className={tableCls.th}>Status</th>
                                <th className={cn(tableCls.th, "w-10")} />
                            </tr>
                        </thead>
                        <tbody key={tab + search}>
                            {rows.map((u: User, k) => {
                                const isMe = u.id === profile?.id;
                                const open = openTaskCount(tasks, u.id);
                                const st = u.status ?? "ACTIVE";
                                return (
                                    <tr
                                        key={u.id}
                                        onClick={() => openForm("user", { userId: u.id })}
                                        className={cn(tableCls.tr, "cursor-pointer", selection.isSelected(u.id) && tableCls.trSelected)}
                                        style={{ animationDelay: `${k * 35}ms` }}
                                    >
                                        <td className={tableCls.td}>
                                            <Check label={`Select ${u.name}`} checked={selection.isSelected(u.id)} disabled={isProtected(u)} onChange={() => selection.toggle(u.id)} />
                                        </td>
                                        <td className={tableCls.td}>
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={u.name} seed={u.id} size={30} />
                                                <div className="min-w-0">
                                                    <div className="font-medium">{u.name}{isMe && <span className="ml-1.5 text-xs font-normal text-subtle-foreground">(you)</span>}</div>
                                                    <div className="text-xs text-subtle-foreground">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={tableCls.td}>
                                            <StatusBadge value={u.role} />
                                            {clientOf.get(u.id) ? (
                                                <div className="mt-[3px] text-xs text-subtle-foreground">{clientOf.get(u.id)}</div>
                                            ) : u.role === "CLIENT_ADMIN" && (
                                                // A client admin must have a client; assign one or change their role
                                                <div className="mt-[3px]"><Tag tone="amber" className="h-5 text-[11px]">No client</Tag></div>
                                            )}
                                        </td>
                                        <td className={cn(tableCls.td, "num")}>{projectCount.get(u.id) ?? 0}</td>
                                        <td className={tableCls.td}>
                                            <div className="flex items-center gap-2">
                                                <span className="num w-3.5">{open}</span>
                                                <span className="h-[5px] w-[70px] overflow-hidden rounded-full bg-surface-3">
                                                    <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (open / 6) * 100)}%`, background: `oklch(var(${open >= 5 ? "--chart-3" : "--primary"}))` }} />
                                                </span>
                                            </div>
                                        </td>
                                        <td className={cn(tableCls.td, "text-xs text-subtle-foreground")}>{lastSeen(u.lastLoginAt)}</td>
                                        <td className={tableCls.td}><Tag tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Tag></td>
                                        <td className={tableCls.td}>
                                            <Button variant="ghost" size="icon" className="size-7" aria-label={`${isProtected(u) ? "View" : "Edit"} ${u.name}`} onClick={(e) => { e.stopPropagation(); openForm("user", { userId: u.id }); }}>
                                                {isProtected(u) ? <IconEye /> : <IconPencil />}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </TableCard>

            {/* ── Floating bulk-action bar ─────────────────────────────────────── */}
            <div
                className={cn(
                    "fixed bottom-6 left-1/2 z-20 flex items-center gap-2.5 rounded-xl border bg-card py-2 pl-4 pr-2.5 shadow-lg transition-[transform,opacity] duration-[420ms] ease-spring",
                    selection.selected.length ? "-translate-x-1/2 translate-y-0 opacity-100" : "pointer-events-none -translate-x-1/2 translate-y-[140%] opacity-0",
                )}
            >
                <span className="num font-medium">{selection.selected.length}</span>
                <span className="text-muted-foreground">selected</span>
                <span className="h-[18px] w-px bg-border-strong" />
                <Button size="sm" variant="outline" onClick={bulk("bulk-role")}>Change role</Button>
                <Button size="sm" variant="outline" onClick={bulk("bulk-unlock")}>Unlock</Button>
                <Button size="sm" variant="outline" className="tone-red tone-fg" onClick={bulk("bulk-remove")}>Remove</Button>
                <Button size="icon" variant="ghost" className="size-7" aria-label="Clear selection" onClick={selection.clear}><IconX /></Button>
            </div>
        </>
    );
};
