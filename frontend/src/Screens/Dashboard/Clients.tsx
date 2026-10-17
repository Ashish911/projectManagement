import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    IconBuilding,
    IconMail,
    IconPencil,
    IconPhone,
    IconPlus,
    IconSelector,
    IconTrash,
    IconUserPlus,
} from "@tabler/icons-react";
import { confirmDeleteClient, getClient } from "@/api/clientApi";
import { flagClientDeleteRequest, setClientsFilter } from "@/redux/actions/clientsActions";
import type { Client } from "@/types/clientTypes";
import type { Project } from "@/types/projectTypes";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/pm/page-head";
import { SearchBox } from "@/components/pm/search-box";
import { AnimatedTabs } from "@/components/pm/animated-tabs";
import { TableCard, tableCls } from "@/components/pm/table";
import { Avatar } from "@/components/pm/avatar";
import { StatusBadge, Tag } from "@/components/pm/status-badge";
import { EmptyState } from "@/components/pm/empty-state";
import { projectProgress } from "@/components/pm/project-card";
import { Progress } from "@/components/pm/progress";
import { FormFoot, FormModal, SubmitButton } from "@/components/forms/form-kit";
import { useForms } from "@/components/forms/forms-context";
import { useAppData } from "@/components/forms/use-app-data";
import { toast, toastError } from "@/components/forms/toaster";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/taskTypes";
import { useAsyncAction } from "@/hooks/use-async-action";

type Tab = "all" | "attn" | "del";

const needsAttention = (c: Client) => !c.assignedAdmin || c.deleteRequest;

/** First letter of the client on a neutral tile, standing in for a logo. */
const LogoChip = ({ name, large }: { name: string; large?: boolean }) => (
    <span className={cn("grid flex-none place-items-center rounded-lg bg-surface-3 font-semibold text-muted-foreground", large ? "size-11 text-lg" : "size-8")}>
        {name[0]?.toUpperCase()}
    </span>
);

const ClientFlags = ({ client }: { client: Client }) => (
    <div className="flex flex-wrap gap-1.5">
        {!client.assignedAdmin && <Tag tone="amber">No admin</Tag>}
        {client.deleteRequest && <Tag tone="red">Delete requested</Tag>}
        {!needsAttention(client) && <Tag tone="green">Healthy</Tag>}
    </div>
);

/** Resolved share of every task across the client's projects. */
const clientProgress = (tasks: Task[], ps: Project[]) => {
    const mine = tasks.filter((t) => ps.some((p) => p.id === t.project?.id));
    return {
        open: mine.filter((t) => t.currentStatus !== "RESOLVED").length,
        pct: mine.length ? Math.round((mine.filter((t) => t.currentStatus === "RESOLVED").length / mine.length) * 100) : 0,
    };
};

export const Clients: React.FC = () => {
    const dispatch = useDispatch();
    const openForm = useForms();
    const { loading, error, activeFilter } = useSelector((state: any) => state.clients);
    const { profile, clients, projects, tasks } = useAppData();
    const isSuperAdmin = profile?.role === "SUPER_ADMIN";

    // A dashboard drill-down may arrive with a filter; adopt it as the active tab once
    const [tab, setTab] = useState<Tab>(activeFilter === "pending" ? "del" : activeFilter === "unassigned" ? "attn" : "all");
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [requesting, setRequesting] = useState<Client | null>(null);

    // CLIENT_ADMINs can't list clients; they load their own one, found via their projects
    const [ownClient, setOwnClient] = useState<Client | null>(null);
    const ownClientId = !isSuperAdmin ? projects.find((p) => p.client)?.client?.id : undefined;

    useEffect(() => {
        if (activeFilter) dispatch(setClientsFilter(null));
    }, [dispatch]);

    useEffect(() => {
        if (ownClientId) getClient(ownClientId).then(setOwnClient).catch(() => setOwnClient(null));
    }, [ownClientId]);

    const allClients: Client[] = isSuperAdmin ? clients : ownClient ? [ownClient] : [];
    const projectsOf = (clientId: string) => projects.filter((p) => p.client?.id === clientId);

    const counts = {
        all: allClients.length,
        attn: allClients.filter(needsAttention).length,
        del: allClients.filter((c) => c.deleteRequest).length,
    };
    const rows = allClients.filter(
        (c) =>
            (tab === "all" || (tab === "attn" && needsAttention(c)) || (tab === "del" && c.deleteRequest)) &&
            (!search || `${c.name} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase())),
    );
    const selected = allClients.find((c) => c.id === selectedId) ?? rows[0] ?? null;

    const detail = selected && (
        <ClientDetail
            key={selected.id}
            client={selected}
            projects={projectsOf(selected.id)}
            tasks={tasks}
            isSuperAdmin={isSuperAdmin}
            onEdit={() => openForm("client", isSuperAdmin ? { clientId: selected.id } : { client: selected, onSaved: setOwnClient })}
            onAssign={() => openForm("client", { clientId: selected.id })}
            onRequestDeletion={() => setRequesting(selected)}
            onApproveDeletion={() => openForm("delete-client", { clientId: selected.id })}
            onDeclineDeletion={() => openForm("decline-request", { clientId: selected.id })}
            onDelete={() => openForm("delete-client", { clientId: selected.id })}
        />
    );

    return (
        <>
            <PageHead
                title={isSuperAdmin ? "Clients" : "Your client"}
                sub={isSuperAdmin ? `${counts.all} ${counts.all === 1 ? "client" : "clients"} · ${counts.attn} need${counts.attn === 1 ? "s" : ""} attention` : "Details and projects for the client you manage"}
            >
                {isSuperAdmin && <Button onClick={() => openForm("client")}><IconPlus />New client</Button>}
            </PageHead>

            {!isSuperAdmin ? (
                // CLIENT_ADMIN: just their client's card
                detail ? (
                    <div className="max-w-[640px]">{detail}</div>
                ) : (
                    <TableCard><EmptyState icon={IconBuilding} title="No client to show" hint="You'll see your client here once it has at least one project." /></TableCard>
                )
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                        <SearchBox value={search} onChange={setSearch} placeholder="Search name or email" />
                        <div className="[&_[role=tablist]]:border-b-0">
                            <AnimatedTabs
                                value={tab}
                                onChange={setTab}
                                tabs={[
                                    { value: "all", label: "All", count: counts.all },
                                    { value: "attn", label: "Needs attention", count: counts.attn, alert: true },
                                    { value: "del", label: "Delete requested", count: counts.del, alert: true },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
                        <TableCard>
                            {loading && allClients.length === 0 ? (
                                <div className="py-16 text-center text-sm text-muted-foreground">Loading clients…</div>
                            ) : error ? (
                                <div className="tone-red tone-fg py-16 text-center text-sm">Failed to load clients.</div>
                            ) : rows.length === 0 ? (
                                <EmptyState icon={IconBuilding} title="No clients found" />
                            ) : (
                                <table className={tableCls.table}>
                                    <thead>
                                        <tr>
                                            <th className={tableCls.th}>Client</th>
                                            <th className={tableCls.th}>Client admin</th>
                                            <th className={tableCls.th}>Projects</th>
                                            <th className={tableCls.th}>Open tasks</th>
                                            <th className={tableCls.th}>Progress</th>
                                            <th className={tableCls.th}>Flags</th>
                                        </tr>
                                    </thead>
                                    <tbody key={tab + search}>
                                        {rows.map((c, k) => {
                                            const ps = projectsOf(c.id);
                                            const prog = clientProgress(tasks, ps);
                                            return (
                                                <tr
                                                    key={c.id}
                                                    onClick={() => setSelectedId(c.id)}
                                                    className={cn(tableCls.tr, "cursor-pointer", selected?.id === c.id && tableCls.trSelected)}
                                                    style={{ animationDelay: `${k * 40}ms` }}
                                                >
                                                    <td className={tableCls.td}>
                                                        <div className="flex items-center gap-2.5">
                                                            <LogoChip name={c.name} />
                                                            <div className="min-w-0">
                                                                <div className="font-medium">{c.name}</div>
                                                                <div className="text-xs text-subtle-foreground">{c.email ?? "No email"}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={tableCls.td}>
                                                        {c.assignedAdmin ? (
                                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                                <Avatar name={c.assignedAdmin.name} seed={c.assignedAdmin.id} size={24} />
                                                                <span>{c.assignedAdmin.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-subtle-foreground">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className={cn(tableCls.td, "num")}>{ps.length}</td>
                                                    <td className={cn(tableCls.td, "num")}>{prog.open}</td>
                                                    <td className={tableCls.td}>
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={prog.pct} className="w-[70px]" />
                                                            <span className="num text-xs text-subtle-foreground">{prog.pct}%</span>
                                                        </div>
                                                    </td>
                                                    <td className={tableCls.td}><ClientFlags client={c} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </TableCard>
                        {detail}
                    </div>
                </>
            )}

            {requesting && (
                <RequestDeletionDialog
                    client={requesting}
                    onClose={() => setRequesting(null)}
                    onDone={() => setOwnClient((c) => (c ? { ...c, deleteRequest: true } : c))}
                />
            )}
        </>
    );
};

/** CLIENT_ADMIN asks a super admin to delete their client. */
export function RequestDeletionDialog({ client, onClose, onDone }: { client: Client; onClose: () => void; onDone: () => void }) {
    const dispatch = useDispatch();
    const { run, busy, error } = useAsyncAction();
    useEffect(() => { if (error) toastError(error); }, [error]);
    const submit = () => run(async () => {
        await confirmDeleteClient(client.id);
        dispatch(flagClientDeleteRequest(client.id));
        onDone();
        toast({ text: <span>Deletion of <b>{client.name}</b> requested</span> });
        onClose();
    });
    return (
        <FormModal
            title={`Request deletion of ${client.name}?`}
            desc="A super admin reviews the request. Nothing is deleted until they approve."
            icon={IconTrash}
            tone="red"
            width={480}
            onClose={onClose}
            onSubmit={submit}
            closing={false}
            footer={<FormFoot onClose={onClose}><SubmitButton busy={busy} danger onClick={submit}>Request deletion</SubmitButton></FormFoot>}
        >
            <div className="text-[13.5px] text-muted-foreground">You’ll get a notification when a super admin approves or declines.</div>
        </FormModal>
    );
}

// ── detail panel ──────────────────────────────────────────────────────────────

function ClientDetail({ client, projects, tasks, isSuperAdmin, onEdit, onAssign, onRequestDeletion, onApproveDeletion, onDeclineDeletion, onDelete }: {
    client: Client;
    projects: Project[];
    tasks: Task[];
    isSuperAdmin: boolean;
    onEdit: () => void;
    onAssign: () => void;
    onRequestDeletion: () => void;
    onApproveDeletion: () => void;
    onDeclineDeletion: () => void;
    onDelete: () => void;
}) {
    const navigate = useNavigate();
    const prog = clientProgress(tasks, projects);
    const stats = [["Projects", projects.length], ["Open tasks", prog.open], ["Resolved", `${prog.pct}%`]] as const;

    return (
        <aside className="sticky top-[76px] grid animate-slide-in gap-[18px] rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <LogoChip name={client.name} large />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-semibold tracking-[-0.02em]">{client.name}</h2>
                    <ClientFlags client={client} />
                </div>
                <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit client"><IconPencil /></Button>
            </div>

            <div className="flex flex-wrap gap-x-[18px] gap-y-2 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><IconMail size={15} className="text-subtle-foreground" />{client.email || "No email"}</span>
                <span className="flex items-center gap-1.5"><IconPhone size={15} className="text-subtle-foreground" />{client.phone || "No phone"}</span>
            </div>

            {client.deleteRequest && (
                <div className="tone-red tone-bg flex gap-3 rounded-lg px-3.5 py-3 text-[13.5px] text-foreground">
                    <IconTrash size={18} className="tone-fg mt-px flex-none" />
                    <div className="flex-1">
                        <div className="font-medium">Deletion requested</div>
                        <div className="text-xs text-muted-foreground">
                            {isSuperAdmin
                                ? `By ${client.assignedAdmin?.name ?? "the client admin"}. ${projects.length} ${projects.length === 1 ? "project" : "projects"} and ${prog.open} open tasks are affected.`
                                : "Waiting for a super admin to approve."}
                        </div>
                        {isSuperAdmin && (
                            <div className="mt-2.5 flex gap-2">
                                <Button size="sm" variant="outline" onClick={onDeclineDeletion}>Decline</Button>
                                <Button size="sm" onClick={onApproveDeletion}>Approve deletion</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div>
                <div className="mb-2 text-[13px] font-medium text-muted-foreground">Client admin</div>
                {client.assignedAdmin ? (
                    <button
                        disabled={!isSuperAdmin}
                        onClick={onAssign}
                        className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-border-strong px-3 text-left transition-colors duration-fast enabled:hover:border-primary disabled:cursor-default"
                    >
                        <Avatar name={client.assignedAdmin.name} seed={client.assignedAdmin.id} size={26} />
                        <span className="flex-1 truncate">{client.assignedAdmin.name}</span>
                        {isSuperAdmin && <IconSelector size={16} className="text-subtle-foreground" />}
                    </button>
                ) : isSuperAdmin ? (
                    <button
                        onClick={onAssign}
                        className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-dashed border-border-strong px-3 text-left text-muted-foreground transition-colors duration-fast hover:border-primary"
                    >
                        <IconUserPlus size={16} />
                        <span className="flex-1">Assign a client admin</span>
                        <IconSelector size={16} />
                    </button>
                ) : (
                    <span className="text-xs text-subtle-foreground">Unassigned</span>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2 border-y py-3.5">
                {stats.map(([label, value]) => (
                    <div key={label}>
                        <div className="num text-[22px] font-medium">{value}</div>
                        <div className="text-xs text-subtle-foreground">{label}</div>
                    </div>
                ))}
            </div>

            <div>
                <div className="mb-2 text-[13px] font-medium text-muted-foreground">Projects</div>
                {projects.length === 0 ? (
                    <div className="text-xs text-subtle-foreground">No projects yet.</div>
                ) : (
                    projects.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => navigate(`/projects/${p.id}`)}
                            className="flex w-full items-center gap-2.5 border-b py-2 text-left text-[13.5px] last:border-b-0 hover:text-accent-foreground"
                        >
                            <span className="flex-1 truncate font-medium">{p.name}</span>
                            <StatusBadge value={p.status} />
                            <span className="num w-9 text-right text-xs text-subtle-foreground">{projectProgress(tasks, p.id).pct}%</span>
                        </button>
                    ))
                )}
            </div>

            {isSuperAdmin ? (
                <Button variant="outline" className="tone-red tone-fg" onClick={onDelete}><IconTrash />Delete client</Button>
            ) : (
                !client.deleteRequest && <Button variant="outline" className="tone-red tone-fg" onClick={onRequestDeletion}><IconTrash />Request deletion</Button>
            )}
        </aside>
    );
}
