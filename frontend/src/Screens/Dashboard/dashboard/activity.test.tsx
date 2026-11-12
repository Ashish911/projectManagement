import { render, screen } from "@testing-library/react"
import { mergeActivity, type ActivityItem } from "./use-dashboard-data"
import { ActivityList } from "./widgets"
import type { ActivityEntry } from "@/api/activityApi"

const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString()
const roleChange: ActivityEntry = {
    id: "a1", action: "ROLE_CHANGED", summary: "changed Ravi Shah's role from User to Client admin for Atlas",
    reason: "Leads Atlas now", createdAt: iso(5), actor: { id: "sa", name: "Ada Admin" },
}
const created: ActivityItem = { id: "t1-c", actor: { id: "u1", name: "Mia Chen" }, verb: "created", object: "Fix login", at: Date.now() - 60 * 60000 }

describe("mergeActivity", () => {
    it("🟢 interleaves server entries with task events, newest first", () => {
        const items = mergeActivity([roleChange], [created], 5)
        expect(items.map((i) => i.id)).toEqual(["a1", "t1-c"])
        expect(items[0]).toMatchObject({ verb: roleChange.summary, note: "Leads Atlas now", actor: { name: "Ada Admin" } })
    })

    it("🔴 respects the limit", () => {
        expect(mergeActivity([roleChange], [created], 1)).toHaveLength(1)
    })
})

describe("ActivityList", () => {
    it("🟢 shows the reason under an entry", () => {
        render(<ActivityList items={mergeActivity([roleChange], [], 5)} />)
        expect(screen.getByText(/changed Ravi Shah's role/)).toBeInTheDocument()
        expect(screen.getByText("“Leads Atlas now”")).toBeInTheDocument()
    })
})
