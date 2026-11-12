// Simplified pictures of each screen for the Guide, built from the design system so they follow the theme.
import {
    IconBell,
    IconBuilding,
    IconChartBar,
    IconChecks,
    IconFolder,
    IconFolderPlus,
    IconLayoutDashboard,
    IconListDetails,
    IconMessagePlus,
    IconMoon,
    IconSearch,
    IconSend,
    IconSquareCheck,
    IconTrash,
    IconUsers,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/pm/avatar"
import { StatusBadge, Tag } from "@/components/pm/status-badge"
import type { Art, Role } from "./guide-content"

const ALT: Record<Art, string> = {
    shell: "The app layout: sidebar on the left; search, theme and notifications in the top bar",
    dashboard: "The dashboard",
    projects: "Project cards with status and progress",
    tasks: "The Tasks board with four status columns",
    "task-sheet": "A task panel with sub-tasks and comments",
    notifications: "The notifications panel",
    clients: "A client's details",
    users: "The Users table",
    analytics: "Analytics charts",
    account: "The Account panel",
    palette: "The ⌘K search palette",
}

/** Window-like card the pictures sit in. Screen readers get the alt text, not the parts. */
function Frame({ art, children, className }: { art: Art; children: React.ReactNode; className?: string }) {
    return (
        <figure role="img" aria-label={ALT[art]} className="m-0 overflow-hidden rounded-xl border bg-surface-2 shadow-sm">
            <div aria-hidden className="flex items-center gap-1.5 border-b bg-card px-3 py-2">
                {[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full bg-surface-3" />)}
            </div>
            <div aria-hidden className={cn("pointer-events-none select-none p-3.5 text-[11.5px]", className)}>{children}</div>
        </figure>
    )
}

const Bar = ({ pct, className }: { pct: number; className?: string }) => (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}><i className="block h-full rounded-[inherit] bg-primary" style={{ width: `${pct}%` }} /></div>
)
const Card = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={cn("rounded-lg border bg-card p-2.5 shadow-sm", className)}>{children}</div>
)
const Line = ({ w, className }: { w: string; className?: string }) => <div className={cn("h-1.5 rounded-full bg-surface-3", className)} style={{ width: w }} />
/** Pulsing ring that points at the control a step talks about. */
const Spot = ({ className }: { className?: string }) => <span className={cn("absolute -inset-1 animate-pulse rounded-lg ring-2 ring-primary", className)} />

function Shell() {
    const items = [IconLayoutDashboard, IconFolder, IconListDetails, IconBuilding]
    return (
        <Frame art="shell" className="p-0">
            <div className="grid grid-cols-[92px_1fr]">
                <div className="grid content-start gap-1 border-r bg-card p-2">
                    <div className="mb-1 flex items-center gap-1.5 font-semibold"><span className="size-3 rounded-full border-[3px] border-primary" />ProjoMan</div>
                    {items.map((I, i) => (
                        <div key={i} className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1", i === 2 && "bg-surface-2 text-foreground ring-1 ring-border")}>
                            <I size={13} className={i === 2 ? "text-primary" : "text-subtle-foreground"} /><Line w="40px" />
                        </div>
                    ))}
                    <div className="relative mt-10 flex items-center gap-1.5 rounded-md p-1"><Spot /><Avatar name="You" size={18} /><Line w="36px" /></div>
                </div>
                <div className="grid content-start gap-3">
                    <div className="flex items-center gap-2 border-b bg-card px-2.5 py-2">
                        <Line w="44px" />
                        <div className="relative ml-auto flex items-center gap-1.5 rounded-md border px-2 py-1 text-subtle-foreground">
                            <Spot /><IconSearch size={12} />Search<kbd className="rounded border bg-surface-2 px-1 text-[10px]">⌘K</kbd>
                        </div>
                        <IconMoon size={14} className="text-muted-foreground" />
                        <span className="relative"><IconBell size={14} className="text-muted-foreground" /><span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[oklch(0.64_0.17_27)]" /></span>
                    </div>
                    <div className="grid gap-2 px-3 pb-3">
                        <Line w="90px" className="h-2.5" />
                        <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <Card key={i} className="h-10" />)}</div>
                        <Card className="h-16" />
                    </div>
                </div>
            </div>
        </Frame>
    )
}

function Dashboard({ role }: { role: Role }) {
    if (role === "USER") {
        return (
            <Frame art="dashboard" className="grid gap-2.5">
                <div className="font-semibold">Good morning, Sam</div>
                <Card className="grid gap-2">
                    <div className="flex gap-3 border-b pb-1.5 text-[11px]">
                        <span className="relative font-medium">Overdue <span className="tone-red tone-bg tone-fg rounded-full px-1">2</span><Spot className="-inset-x-1.5" /></span>
                        <span className="text-muted-foreground">Today</span><span className="text-muted-foreground">This week</span>
                    </div>
                    {["Fix login redirect", "Write release notes"].map((t, i) => (
                        <div key={t} className="flex items-center gap-2">
                            <span className={cn("size-3.5 rounded-full border-[1.5px]", i === 0 ? "border-primary bg-primary" : "border-border-strong")} />
                            <span className="flex-1">{t}</span><StatusBadge value={i ? "NORMAL" : "HIGH"} />
                        </div>
                    ))}
                </Card>
                <div className="grid grid-cols-2 gap-2">
                    <Card className="grid gap-1.5"><span className="font-medium">My projects</span><Bar pct={64} /><Bar pct={30} /></Card>
                    <Card className="grid gap-1"><span className="font-medium">My week</span>
                        <div className="flex h-7 items-end gap-1">{[3, 6, 2, 5, 4].map((h, i) => <i key={i} className="flex-1 rounded-sm bg-[oklch(var(--chart-1))]" style={{ height: h * 4 }} />)}</div>
                    </Card>
                </div>
            </Frame>
        )
    }
    return (
        <Frame art="dashboard" className="grid gap-2.5">
            <div className="flex items-center"><span className="font-semibold">Dashboard</span>
                <span className="ml-auto flex rounded-md border bg-card p-0.5 text-[10px]">{["7d", "30d", "90d"].map((r) => <span key={r} className={cn("rounded px-1.5", r === "30d" && "bg-surface-3 font-medium")}>{r}</span>)}</span>
            </div>
            {role === "SUPER_ADMIN" && (
                <div className="tone-amber tone-bg flex items-center gap-2 rounded-lg px-2.5 py-2"><IconTrash size={13} className="tone-fg" /><span className="flex-1 font-medium">Needs a decision</span><span className="rounded border bg-card px-1.5">Review</span></div>
            )}
            <div className="grid grid-cols-3 gap-2">
                {[["Projects", "12"], ["Open tasks", "48"], ["Overdue", "3"]].map(([l, v], i) => (
                    <Card key={l} className="relative">{i === 2 && <Spot />}<div className="text-[10px] text-subtle-foreground">{l}</div><div className="num text-base font-medium">{v}</div></Card>
                ))}
            </div>
            <Card><div className="mb-1 font-medium">Tasks created vs resolved</div>
                <svg viewBox="0 0 200 40" className="h-10 w-full"><path d="M0 30 C40 22 60 26 90 16 S150 10 200 6" fill="none" stroke="oklch(var(--chart-1))" strokeWidth="2" /><path d="M0 34 C40 30 70 28 100 24 S160 18 200 14" fill="none" stroke="oklch(var(--chart-2))" strokeWidth="2" /></svg>
            </Card>
        </Frame>
    )
}

function Projects() {
    return (
        <Frame art="projects" className="grid grid-cols-2 gap-2.5">
            {[["Website Revamp", "IN_PROGRESS", 62], ["Mobile App", "NOT_STARTED", 0], ["Brand Refresh", "COMPLETED", 100], ["Data Migration", "IN_PROGRESS", 35]].map(([n, s, p], i) => (
                <Card key={n as string} className="relative grid gap-2">
                    {i === 0 && <Spot />}
                    <div className="flex items-center gap-1.5"><span className="font-medium">{n}</span></div>
                    <StatusBadge value={s as "IN_PROGRESS"} className="w-fit" />
                    <Bar pct={p as number} />
                    <div className="flex -space-x-1.5">{["Ana", "Ben", "Cy"].slice(0, 3 - (i % 2)).map((a) => <Avatar key={a} name={a} size={18} />)}</div>
                </Card>
            ))}
        </Frame>
    )
}

function Tasks({ role }: { role: Role }) {
    const cols = [
        ["NEW", [["Draft homepage copy", "NORMAL"]]],
        ["IN_PROGRESS", [["Fix login redirect", "HIGH"], ["Set up CI", "NORMAL"]]],
        ["RESOLVED", [["Pick colour palette", "BACKLOG"]]],
        ["REOPENED", []],
    ] as const
    return (
        <Frame art="tasks" className="grid gap-2.5">
            <div className="flex items-center gap-2"><span className="font-semibold">Tasks</span>
                <span className="ml-auto rounded-md bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">{role === "USER" ? "Log update" : "+ New task"}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
                {cols.map(([s, cards]) => (
                    <div key={s} className="grid content-start gap-1.5 rounded-lg border bg-surface-3/40 p-1.5">
                        <StatusBadge value={s} className="h-[18px] px-1.5 text-[10px]" />
                        {cards.map(([t, p], i) => (
                            <Card key={t} className={cn("relative grid gap-1 p-1.5", s === "IN_PROGRESS" && i === 0 && "rotate-[-3deg] shadow-md")}>
                                {s === "IN_PROGRESS" && i === 0 && <Spot />}
                                <StatusBadge value={p} dot={false} className="h-4 w-fit px-1 text-[9.5px]" />
                                <span className="text-[10.5px] leading-tight">{t}</span>
                            </Card>
                        ))}
                    </div>
                ))}
            </div>
        </Frame>
    )
}

function TaskSheet() {
    return (
        <Frame art="task-sheet" className="grid grid-cols-[1fr_1.3fr] gap-2.5">
            <div className="grid content-start gap-1.5 opacity-60">{[0, 1, 2].map((i) => <Card key={i} className="h-9" />)}</div>
            <Card className="grid gap-2.5">
                <div className="font-semibold">Fix login redirect</div>
                <div className="flex gap-1.5"><StatusBadge value="IN_PROGRESS" /><StatusBadge value="HIGH" /></div>
                <div className="grid gap-1">
                    <div className="flex items-center justify-between text-[10.5px] font-medium text-muted-foreground">Sub-tasks <span className="num tone-green tone-fg">1/2</span></div>
                    <div className="flex items-center gap-1.5"><IconSquareCheck size={13} className="text-primary" /><s className="text-muted-foreground">Reproduce bug</s></div>
                    <div className="relative rounded-md border px-1.5 py-1 font-mono text-[10.5px]"><Spot />Add tests <b className="text-primary">!high @ravi ^fri</b></div>
                </div>
                <div className="grid gap-1.5 border-t pt-2">
                    <div className="flex gap-1.5"><Avatar name="Ravi" size={18} /><div className="rounded-md bg-surface-2 px-2 py-1">Pushed a fix, can you check?</div></div>
                    <div className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-subtle-foreground">Write a comment<IconSend size={12} className="ml-auto" /></div>
                </div>
            </Card>
        </Frame>
    )
}

function Notifications() {
    const list = [
        ["You have been assigned a new task: Set up CI.", true],
        ["Ravi commented on “Fix login redirect”.", true],
        ["You have been added to project “Website Revamp”.", false],
    ] as const
    return (
        <Frame art="notifications" className="grid gap-2">
            <div className="flex items-center gap-2"><span className="font-semibold">Notifications</span>
                <span className="relative ml-auto flex items-center gap-1 text-muted-foreground"><Spot /><IconChecks size={13} />Mark all read</span>
            </div>
            {list.map(([t, unread]) => (
                <Card key={t} className={cn("flex items-start gap-2", !unread && "opacity-60")}>
                    <span className={cn("mt-1 size-1.5 flex-none rounded-full", unread ? "bg-primary" : "bg-transparent")} /><span>{t}</span>
                </Card>
            ))}
            <div className="ml-auto flex w-fit items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 shadow-md"><IconBell size={13} className="tone-green tone-fg" />New task for you<span className="font-medium text-primary">Open</span></div>
        </Frame>
    )
}

function Clients({ role }: { role: Role }) {
    return (
        <Frame art="clients" className="grid gap-2.5">
            <Card className="grid gap-2.5">
                <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-md bg-surface-3 font-semibold">A</span>
                    <div><div className="font-semibold">Acme Corp</div><Tag tone="red">Delete requested</Tag></div>
                </div>
                <div className="tone-red tone-bg flex gap-2 rounded-lg p-2.5">
                    <IconTrash size={14} className="tone-fg mt-px flex-none" />
                    <div className="grid gap-1">
                        <span className="font-medium">Deletion requested</span>
                        {role === "SUPER_ADMIN" ? (
                            <>
                                <span className="text-muted-foreground">By Priya. 2 projects and 9 open tasks are affected.</span>
                                <div className="relative flex w-fit gap-1.5"><Spot /><span className="rounded border bg-card px-1.5 py-0.5">Decline</span><span className="rounded bg-primary px-1.5 py-0.5 text-primary-foreground">Approve deletion</span></div>
                            </>
                        ) : (
                            <span className="text-muted-foreground">Waiting for a super admin to approve.</span>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t pt-2">{[["2", "Projects"], ["9", "Open tasks"], ["58%", "Resolved"]].map(([v, l]) => <div key={l}><div className="num text-sm font-medium">{v}</div><div className="text-[10px] text-subtle-foreground">{l}</div></div>)}</div>
            </Card>
        </Frame>
    )
}

function Users() {
    const rows = [["Mina Lama", "CLIENT_ADMIN", "Active"], ["Ravi Shah", "USER", "Invited"], ["Sam Lee", "USER", "Locked"]] as const
    return (
        <Frame art="users" className="grid gap-2">
            <div className="flex items-center gap-2"><span className="font-semibold">Users</span>
                <span className="relative ml-auto rounded-md bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground"><Spot />Invite user</span>
            </div>
            <Card className="grid gap-0 p-0">
                {rows.map(([n, r, s]) => (
                    <div key={n} className="flex items-center gap-2 border-b px-2.5 py-1.5 last:border-b-0">
                        <span className="size-3 rounded-sm border border-border-strong" /><Avatar name={n} size={18} /><span className="flex-1">{n}</span>
                        <StatusBadge value={r} /><Tag tone={s === "Active" ? "green" : s === "Invited" ? "blue" : "red"}>{s}</Tag>
                    </div>
                ))}
            </Card>
        </Frame>
    )
}

function Analytics() {
    return (
        <Frame art="analytics" className="grid grid-cols-2 gap-2.5">
            <Card className="grid place-items-center gap-1.5"><span className="justify-self-start font-medium">Project status</span>
                <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
                    {[[0, 45, "--chart-1"], [45, 35, "--chart-2"], [80, 20, "--chart-3"]].map(([o, l, c]) => <circle key={c as string} cx="18" cy="18" r="14" fill="none" stroke={`oklch(var(${c}))`} strokeWidth="5" strokeDasharray={`${(l as number) * 0.88} 88`} strokeDashoffset={-(o as number) * 0.88} />)}
                </svg>
            </Card>
            <Card className="grid content-start gap-1.5"><span className="font-medium">Largest teams</span>
                {[80, 55, 30].map((p, i) => <div key={i} className="grid gap-0.5"><Line w="60%" /><Bar pct={p} /></div>)}
            </Card>
            <Card className="col-span-2 flex items-center gap-2"><IconChartBar size={14} className="text-primary" />Click any figure to open the filtered page</Card>
        </Frame>
    )
}

function Account() {
    return (
        <Frame art="account" className="grid gap-2">
            <Card className="grid gap-2">
                <div className="flex items-center gap-2"><Avatar name="Sam Lee" size={28} /><div><div className="font-semibold">Sam Lee</div><div className="text-[10px] text-subtle-foreground">sam@acme.io</div></div></div>
                {["Full name", "Phone"].map((l) => <div key={l} className="grid gap-0.5"><span className="text-[10px] text-muted-foreground">{l}</span><div className="h-5 rounded border bg-surface-2" /></div>)}
                <div className="flex items-center gap-2 border-t pt-2"><span className="text-muted-foreground">Theme</span><span className="ml-auto flex rounded-md border p-0.5 text-[10px]"><span className="rounded bg-surface-3 px-1.5">Light</span><span className="px-1.5">Dark</span></span></div>
                <span className="tone-red tone-fg w-fit">Sign out</span>
            </Card>
        </Frame>
    )
}

function Palette({ role }: { role: Role }) {
    const actions: [typeof IconFolder, string][] = role === "USER" ? [[IconMessagePlus, "Log an update"]]
        : role === "SUPER_ADMIN" ? [[IconSquareCheck, "New task"], [IconUsers, "Invite user"]]
        : [[IconSquareCheck, "New task"], [IconFolderPlus, "New project"]]
    return (
        <Frame art="palette" className="grid place-items-center">
            <Card className="grid w-[85%] gap-1.5 p-0">
                <div className="flex items-center gap-2 border-b px-2.5 py-2"><IconSearch size={13} className="text-subtle-foreground" /><span>web</span><span className="h-3 w-px animate-pulse bg-foreground" /></div>
                <div className="grid gap-0.5 px-1.5 pb-1.5">
                    <div className="px-1 font-mono text-[9.5px] uppercase tracking-wider text-subtle-foreground">Projects</div>
                    <div className="flex items-center gap-2 rounded-md bg-surface-2 px-1.5 py-1"><IconFolder size={13} />Website Revamp<StatusBadge value="IN_PROGRESS" className="ml-auto h-4 text-[9.5px]" /></div>
                    <div className="px-1 font-mono text-[9.5px] uppercase tracking-wider text-subtle-foreground">Actions</div>
                    {actions.map(([I, l]) => <div key={l} className="flex items-center gap-2 px-1.5 py-1"><I size={13} />{l}</div>)}
                </div>
            </Card>
        </Frame>
    )
}

/** The picture for a topic, drawn for the viewer's role where the screen differs by role. */
export function Illustration({ art, role }: { art: Art; role: Role }) {
    switch (art) {
        case "shell": return <Shell />
        case "dashboard": return <Dashboard role={role} />
        case "projects": return <Projects />
        case "tasks": return <Tasks role={role} />
        case "task-sheet": return <TaskSheet />
        case "notifications": return <Notifications />
        case "clients": return <Clients role={role} />
        case "users": return <Users />
        case "analytics": return <Analytics />
        case "account": return <Account />
        case "palette": return <Palette role={role} />
    }
}
