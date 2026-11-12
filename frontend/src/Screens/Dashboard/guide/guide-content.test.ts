import { NAV_BY_ROLE } from "@/Screens/Components/app-sidebar"
import { guideFor, ROLE_INTRO, type Role } from "./guide-content"

const ROLES: Role[] = ["SUPER_ADMIN", "CLIENT_ADMIN", "USER"]
const ids = (role: Role) => guideFor(role).map((t) => t.id)
const topic = (role: Role, id: string) => guideFor(role).find((t) => t.id === id)!
const stepText = (role: Role, id: string) => topic(role, id).steps.join(" ")

describe("guideFor", () => {
    it("🟢 every role gets the shared topics", () => {
        for (const role of ROLES) {
            expect(ids(role)).toEqual(expect.arrayContaining(["getting-around", "dashboard", "projects", "tasks", "task-details", "notifications", "account", "work-faster"]))
        }
    })

    it("🔴 a USER never sees admin topics", () => {
        expect(ids("USER")).not.toContain("users")
        expect(ids("USER")).not.toContain("clients")
        expect(ids("USER")).not.toContain("analytics")
    })

    it("🟢 only a SUPER_ADMIN gets the Users topic", () => {
        expect(ids("SUPER_ADMIN")).toContain("users")
        expect(ids("CLIENT_ADMIN")).not.toContain("users")
    })

    it("🟢 every role has the Guide in their sidebar", () => {
        for (const role of ROLES) expect(NAV_BY_ROLE[role].map((n) => n.url)).toContain("/guide")
    })

    it("🟢 every topic link is a page that role can open", () => {
        for (const role of ROLES) {
            const allowed = [...NAV_BY_ROLE[role].map((n) => n.url), "/account"]
            for (const t of guideFor(role)) {
                if (t.link) expect({ role, topic: t.id, url: allowed.includes(t.link.url) ? "ok" : t.link.url }).toEqual({ role, topic: t.id, url: "ok" })
            }
        }
    })

    it("🔴 no topic is left without steps after filtering by role", () => {
        for (const role of ROLES) {
            for (const t of guideFor(role)) expect({ role, topic: t.id, steps: t.steps.length > 0 }).toEqual({ role, topic: t.id, steps: true })
        }
    })

    it("🟢 steps are filtered by role: a USER logs updates, an admin creates tasks", () => {
        expect(stepText("USER", "tasks")).toContain("Log update")
        expect(stepText("USER", "tasks")).not.toContain("New task")
        expect(stepText("CLIENT_ADMIN", "tasks")).toContain("New task")
        expect(stepText("CLIENT_ADMIN", "tasks")).not.toContain("Log update")
    })

    it("🟢 a CLIENT_ADMIN sees only their side of a client deletion", () => {
        const clients = topic("CLIENT_ADMIN", "clients")
        expect(clients.waiting?.title).toMatch(/super admin/i)
        expect(stepText("CLIENT_ADMIN", "clients")).toContain("Request deletion")
        expect(stepText("CLIENT_ADMIN", "clients")).not.toContain("Approve deletion")
    })

    it("🟢 a SUPER_ADMIN decides deletions and waits on no one", () => {
        expect(stepText("SUPER_ADMIN", "clients")).toContain("Approve deletion")
        expect(topic("SUPER_ADMIN", "clients").waiting).toBeUndefined()
    })

    it("🟢 a USER is told who to ask when they can't do something themselves", () => {
        expect(topic("USER", "projects").waiting?.next.join(" ")).toMatch(/client admin/i)
        expect(topic("USER", "tasks").waiting).toBeDefined()
    })

    it("🟢 each role has an intro with a work flow that marks their part", () => {
        for (const role of ROLES) {
            expect(ROLE_INTRO[role].can.length).toBeGreaterThan(0)
            expect(ROLE_INTRO[role].flow.some((s) => s.yours)).toBe(true)
        }
    })
})
