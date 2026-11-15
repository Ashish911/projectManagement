import type { Icon } from "@tabler/icons-react"
import { FEATURES } from "@/lib/features"
import {
    IconBell,
    IconBolt,
    IconBuilding,
    IconChartBar,
    IconChecklist,
    IconCompass,
    IconFolder,
    IconLayoutDashboard,
    IconListDetails,
    IconMessage2,
    IconUserCircle,
    IconUserPlus,
    IconUsers,
} from "@tabler/icons-react"

export type Role = "SUPER_ADMIN" | "CLIENT_ADMIN" | "USER"

/** Picture shown next to a topic's steps (see illustrations.tsx). */
export type Art = "shell" | "dashboard" | "projects" | "tasks" | "task-sheet" | "notifications" | "clients" | "users" | "analytics" | "account" | "palette"

/** "Your side" of a flow that needs someone else: what happens now and what you can do meanwhile. */
export type Waiting = { title: string; body: string; next: string[] }

/** A line of text, optionally shown only to some roles. */
type Line = string | { text: string; roles: Role[] }

type Topic = {
    id: string
    title: string
    icon: Icon
    summary: string
    roles: Role[]
    art: Art
    link?: { label: string; url: string }
    steps: Line[]
    tips?: Line[]
    waiting?: Partial<Record<Role, Waiting>>
}

/** A topic with every role-specific part already resolved for one role. */
export type ResolvedTopic = Omit<Topic, "roles" | "steps" | "tips" | "waiting"> & { steps: string[]; tips: string[]; waiting?: Waiting }

const ALL: Role[] = ["SUPER_ADMIN", "CLIENT_ADMIN", "USER"]
const ADMINS: Role[] = ["SUPER_ADMIN", "CLIENT_ADMIN"]
const only = (roles: Role[], text: string): Line => ({ text, roles })

/** Top-of-page summary: what the role is for, what it can do, and its part in the flow of work. */
export const ROLE_INTRO: Record<Role, {
    headline: string
    can: { icon: Icon; text: string }[]
    flow: { label: string; yours: boolean }[]
}> = {
    SUPER_ADMIN: {
        headline: "You run ProjoMan: you invite people, set up clients and make the final call on deletions.",
        can: [
            { icon: IconUserPlus, text: "Invite people and choose their role" },
            { icon: IconBuilding, text: "Create clients and give each one a client admin" },
            { icon: IconChecklist, text: "Approve or decline client deletion requests" },
            { icon: IconFolder, text: "See and manage every project and task" },
        ],
        flow: [
            { label: "Client", yours: true },
            { label: "Project", yours: true },
            { label: "Task", yours: true },
            { label: "Sub-task", yours: true },
            { label: "Resolved", yours: true },
        ],
    },
    CLIENT_ADMIN: {
        headline: "You manage a client: its projects, its team and the tasks that keep work moving. On other projects you're added to, you're a team member.",
        can: [
            { icon: IconFolder, text: "Create projects for your client and pick their team" },
            { icon: IconUsers, text: "Work on other clients' projects as a team member, if you're added" },
            { icon: IconListDetails, text: "Create tasks, assign them and set deadlines" },
            { icon: IconChartBar, text: "Track progress on the dashboard and in Analytics" },
            { icon: IconBuilding, text: "Keep your client's details up to date" },
        ],
        flow: [
            { label: "Client", yours: false },
            { label: "Project", yours: true },
            { label: "Task", yours: true },
            { label: "Sub-task", yours: true },
            { label: "Resolved", yours: true },
        ],
    },
    USER: {
        headline: "You get the work done: your tasks, their sub-tasks and the conversation around them.",
        can: [
            { icon: IconListDetails, text: "See the tasks assigned to you and move them along" },
            { icon: IconChecklist, text: "Break tasks into sub-tasks and tick them off" },
            { icon: IconMessage2, text: "Comment on tasks and log progress updates" },
            { icon: IconBell, text: "Get notified the moment something changes for you" },
        ],
        flow: [
            { label: "Client", yours: false },
            { label: "Project", yours: false },
            { label: "Task", yours: true },
            { label: "Sub-task", yours: true },
            { label: "Resolved", yours: true },
        ],
    },
}

const TOPICS: Topic[] = [
    {
        id: "getting-around",
        title: "Getting around",
        icon: IconCompass,
        summary: "The sidebar takes you between sections; the top bar holds search, the theme switch and your notifications.",
        roles: ALL,
        art: "shell",
        steps: [
            "Use the sidebar on the left to move between sections. It only lists the sections your role can use.",
            "Collapse the sidebar with the button at the top left when you want more room; it shrinks to icons.",
            "Click the search box in the top bar, or press ⌘K (Ctrl+K on Windows), to jump to any page, project or task.",
            "Switch between light and dark theme with the moon or sun icon. Your choice is remembered.",
            "Click your name at the bottom of the sidebar to open your account, where you can edit your profile or sign out.",
        ],
    },
    {
        id: "dashboard",
        title: "Your dashboard",
        icon: IconLayoutDashboard,
        summary: "Your starting point each day: what needs attention now and how work is trending.",
        roles: ALL,
        art: "dashboard",
        link: { label: "Open dashboard", url: "/dashboard" },
        steps: [
            only(["USER"], "Needs attention lists your open tasks, soonest first. Switch between Overdue, Today and This week."),
            only(["USER"], "Tick the circle on a task to resolve it straight from the dashboard."),
            only(["USER"], "My projects shows how far along each of your projects is; My week shows how many tasks are due each day."),
            only(ADMINS, "The cards at the top sum up your area. Click any card to open that page, already filtered."),
            only(ADMINS, "Pick 7d, 30d or 90d to change the period for the created vs resolved chart. Your choice is remembered."),
            only(["SUPER_ADMIN"], "Needs a decision appears when a client asks to be deleted or has no client admin. Act on it right there."),
            only(ADMINS, "Upcoming deadlines, Workload and Activity show what's due soon, who has the most open work and what changed recently."),
        ],
        tips: [
            only(["USER"], "Clear the Overdue tab first thing; it's the quickest way to stay on top of your work."),
            only(ADMINS, "Workload shows who's overloaded before deadlines slip. Reassign tasks from the Tasks page."),
        ],
    },
    {
        id: "projects",
        title: "Projects",
        icon: IconFolder,
        summary: "A project groups the tasks for one piece of work for a client, along with the team working on it.",
        roles: ALL,
        art: "projects",
        link: { label: "Open projects", url: "/projects" },
        steps: [
            only(["USER"], "Projects lists the projects you're a member of. Use the status tabs or search to find one."),
            only(["SUPER_ADMIN"], "Projects lists every project for every client. Use the status tabs or search to narrow it down."),
            only(["CLIENT_ADMIN"], "Projects lists your client's projects, plus any other project you're on. Use the status tabs or search to narrow it down."),
            only(["CLIENT_ADMIN"], "On another client's project you're a team member: you work on your own tasks and comment, but can't manage the project."),
            only(ADMINS, "Click New project, give it a name, status and due date, and watch the card preview update as you type."),
            "Open a project to see its progress, the burn-down chart, what's Up next and who's on the team.",
            only(ADMINS, "Use Manage team to add or remove people. Anyone added is notified and can see the project straight away."),
            only(ADMINS, "Delete a project from More project actions. You type its name to confirm, and you still get a few seconds to undo."),
        ],
        waiting: {
            USER: {
                title: "Can't see a project?",
                body: "You only see projects you've been added to. Adding people is done by the project's client admin.",
                next: [
                    "Ask your client admin to add you to the project.",
                    "You'll get a notification as soon as you're added, and the project appears in your list.",
                ],
            },
        },
    },
    {
        id: "tasks",
        title: "Tasks",
        icon: IconListDetails,
        summary: "Tasks move from New to In progress to Resolved, and can be Reopened if more work turns up.",
        roles: ALL,
        art: "tasks",
        link: { label: "Open tasks", url: "/tasks" },
        steps: [
            "The Board shows tasks in four columns: New, In progress, Resolved and Reopened. The List groups them by due date.",
            only(["USER"], "You see the tasks assigned to you. Drag a card to another column to change its status."),
            only(ADMINS, "Drag any card to another column to change its status. Switch between Everyone and Assigned to me."),
            only(ADMINS, "Click New task (or the + at the top of the New and In progress columns), then pick the project, assignee, priority and deadline."),
            only(["USER"], "Click Log update to post progress on one of your tasks. If you're stuck, turn on I'm blocked on this and pick who can unblock you."),
            "Overdue tasks are marked so they stand out. Resolving a task notifies the person who created it.",
        ],
        tips: [
            only(ADMINS, "Assign every task to one person: an owner keeps work from stalling."),
            only(["USER"], "Move a task to In progress when you start it, so your admin can see what you're on without asking."),
        ],
        waiting: {
            USER: {
                title: "Need a new task?",
                body: "Tasks are created by your client admin or a super admin. You can't create them yourself.",
                next: [
                    "Comment on a related task, or use Log update, to say what's needed.",
                    "When a task is assigned to you, you'll get a notification and it appears on your board.",
                    "In the meantime, you can break your own tasks into sub-tasks.",
                ],
            },
        },
    },
    {
        id: "task-details",
        title: "Task details, sub-tasks and comments",
        icon: IconChecklist,
        summary: "Open any task to see everything about it in one panel: details, sub-tasks and the discussion.",
        roles: ALL,
        art: "task-sheet",
        link: { label: "Open tasks", url: "/tasks" },
        steps: [
            "Click a task on the board or in the list to open its panel on the right.",
            only(ADMINS, "Edit the title, priority, assignee or deadline in place. Changes save as you make them; there's no Save button."),
            only(["USER"], "Edit your own tasks in place. Changes save as you make them; there's no Save button."),
            "Add a sub-task by typing in the sub-task box and pressing Enter. Tick it off when it's done; the task shows how many are done.",
            "Type a comment at the bottom and send it. The task's assignee and creator are notified.",
        ],
        tips: [
            "Quick add: type “Review PR !high @ravi ^fri” to set the priority, assignee and due date of a sub-task in one go.",
        ],
    },
    {
        id: "notifications",
        title: "Notifications",
        icon: IconBell,
        summary: "ProjoMan tells you the moment something changes for you, without needing to reload.",
        roles: ALL,
        art: "notifications",
        steps: [
            "A red dot on the bell means you have unread notifications. New ones also pop up in the corner with an Open button.",
            "Click the bell to see them all, newest first. Click one to mark it read.",
            "Use Mark all read to clear the dot, or Clear all to empty the list.",
            only(["USER"], "You're notified when you're added to a project, given a task or sub-task, someone comments on your task, or your role changes."),
            only(["CLIENT_ADMIN"], "You're also notified when you're made admin of a client and when a super admin declines your deletion request."),
            only(["SUPER_ADMIN"], "You're notified about the tasks you create and the comments on them, like everyone else."),
        ],
    },
    {
        id: "clients",
        title: "Clients",
        icon: IconBuilding,
        summary: "A client is a company you do work for. Each client can have one client admin who manages its projects.",
        roles: ADMINS,
        art: "clients",
        link: { label: "Open clients", url: "/clients" },
        steps: [
            only(["SUPER_ADMIN"], "Clients lists every client. The Needs attention tab shows clients without an admin; Delete requested shows pending requests."),
            only(["SUPER_ADMIN"], "Click New client to add one. Email and phone are optional."),
            only(["SUPER_ADMIN"], "Select a client and use Assign a client admin. The admin is notified and can start managing it."),
            only(["SUPER_ADMIN"], "When a client admin requests deletion, open the client and choose Approve deletion, or Decline with a short reason. They're notified either way."),
            only(["SUPER_ADMIN"], "Delete client removes it without a request. You type its name to confirm."),
            only(["CLIENT_ADMIN"], "Clients shows the client you manage: its contact details, projects and progress."),
            only(["CLIENT_ADMIN"], "Click the pencil to update the client's name, email or phone."),
            only(["CLIENT_ADMIN"], "If the client should be removed, click Request deletion. Nothing is deleted until a super admin approves."),
        ],
        waiting: {
            CLIENT_ADMIN: {
                title: "Waiting for a super admin to approve",
                body: "After you request deletion, the client is marked Delete requested and a super admin reviews it. Until then nothing changes: projects and tasks keep working as normal.",
                next: [
                    "You'll get a notification when the request is approved or declined.",
                    "If it's declined, the notification includes the reason, and the client stays as it is.",
                    "If it's approved, the client and its projects are removed. You stay a client admin, with no client until a super admin assigns you one.",
                ],
            },
        },
    },
    {
        id: "users",
        title: "Users",
        icon: IconUsers,
        summary: "Everyone who can sign in to ProjoMan, their role and whether their account is active.",
        roles: ["SUPER_ADMIN"],
        art: "users",
        link: { label: "Open users", url: "/users" },
        steps: [
            "Click Invite user. Choose Invite to email them a sign-up link (valid for 48 hours), or Temporary password to set one yourself.",
            "Pick their role. A client admin can be given a client now or later, and each client can have only one.",
            "The Status column shows Invited (hasn't signed in yet), Active or Locked (too many wrong passwords).",
            "Tick rows to Change role, Unlock or Remove several people at once. You can't select yourself.",
            "Open someone to edit their details or resend their invite. Use Export for a CSV or JSON copy of the list.",
        ],
        tips: ["Removing a user unassigns their tasks and takes them off their projects. Reassign their work first."],
    },
    {
        id: "analytics",
        title: "Analytics",
        icon: IconChartBar,
        summary: "The bigger picture for your client: project status, team sizes and how healthy things look.",
        roles: FEATURES.clientAdminAnalytics ? ["CLIENT_ADMIN"] : [], // Hidden with the page (CA-01)
        art: "analytics",
        link: { label: "Open analytics", url: "/analytics" },
        steps: [
            "The cards at the top sum up projects, tasks and people.",
            "The charts break projects down by status and people by role.",
            "Click through any figure to open the matching page, already filtered.",
        ],
    },
    {
        id: "account",
        title: "Your account",
        icon: IconUserCircle,
        summary: "Your profile, your password and how ProjoMan looks for you.",
        roles: ALL,
        art: "account",
        link: { label: "Open account", url: "/account" },
        steps: [
            "Click your name at the bottom of the sidebar to open your account. Sign out is at the bottom of that panel.",
            "Edit your name, phone, date of birth or gender and click Save profile.",
            "To change your password, enter your current one, then the new one twice.",
            "Forgot your password? On the sign-in page choose Forgot password and follow the link in the email.",
        ],
        waiting: {
            USER: {
                title: "Locked out?",
                body: "After 5 wrong passwords in a row your account is locked for an hour, even if you then enter the right one.",
                next: ["Wait an hour and sign in again, or ask a super admin to unlock your account now.", "If you've forgotten your password, use Forgot password on the sign-in page instead of guessing."],
            },
            CLIENT_ADMIN: {
                title: "Locked out, or need someone added?",
                body: "Inviting new people, changing roles and unlocking accounts are done by a super admin. A locked account also unlocks by itself after an hour.",
                next: [
                    "Ask a super admin to invite the person you need, or to unlock an account.",
                    "Once someone is invited, you can add them to your projects from Manage team.",
                ],
            },
        },
    },
    {
        id: "work-faster",
        title: "Work faster",
        icon: IconBolt,
        summary: "Small habits that save the most time in ProjoMan.",
        roles: ALL,
        art: "palette",
        steps: [
            "Press ⌘K (Ctrl+K) from anywhere, then type a few letters to jump to a page, project or task.",
            only(ADMINS, "⌘K also runs actions: New task and New project, without leaving the page you're on."),
            only(["SUPER_ADMIN"], "From ⌘K you can also Invite user, add a New client, or search for people by name."),
            only(["USER"], "From ⌘K choose Log an update to post progress on a task from anywhere."),
            "Use quick add when creating sub-tasks: !urgent, !high, !normal or !backlog for priority, @name to assign, ^fri for the due date.",
            "In forms, press ⌘↵ (Ctrl+Enter) to save and Esc to close.",
            "Keep your notifications at zero: click through, act, and Mark all read.",
        ],
    },
]

const text = (l: Line) => (typeof l === "string" ? l : l.text)
const shows = (l: Line, role: Role) => typeof l === "string" || l.roles.includes(role)

/** The topics a role sees, with steps, tips and the "waiting" note filtered for that role. */
export function guideFor(role: Role): ResolvedTopic[] {
    return TOPICS.filter((t) => t.roles.includes(role)).map(({ roles: _roles, steps, tips = [], waiting, ...t }) => ({
        ...t,
        steps: steps.filter((l) => shows(l, role)).map(text),
        tips: tips.filter((l) => shows(l, role)).map(text),
        waiting: waiting?.[role],
    }))
}
