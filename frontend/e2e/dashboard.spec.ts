import { expect, signedInAs, test } from "./fixtures"

// Each role lands on its own dashboard (Admin for super / client admins, Member for users)
const LANDING = [
    { role: "superAdmin", heading: "Dashboard", sees: ["Users", "Clients", "Active projects", "Overdue tasks"] },
    { role: "clientAdmin", heading: "Dashboard", sees: ["Projects", "Team members", "Resolved", "Overdue tasks"] },
    { role: "user", heading: /Good (morning|afternoon|evening)/, sees: ["Needs attention", "My week"] },
] as const

for (const { role, heading, sees } of LANDING) {
    test.describe(role, () => {
        signedInAs(role)

        test("🟢 lands on their dashboard with its widgets", async ({ page }) => {
            await page.goto("/dashboard")
            await expect(page.locator("main").getByRole("heading", { level: 1, name: heading })).toBeVisible()
            for (const text of sees) await expect(page.getByText(text, { exact: true }).first()).toBeVisible()
        })
    })
}
