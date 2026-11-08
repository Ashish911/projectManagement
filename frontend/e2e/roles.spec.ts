import type { Page } from "@playwright/test"
import { expect, signedInAs, test } from "./fixtures"
import type { Role } from "./env"

/** Sidebar entries each role should see, in order (NAV_BY_ROLE in app-sidebar.tsx). */
const NAV: Record<Role, string[]> = {
    superAdmin: ["Dashboard", "Users", "Clients", "Projects", "Tasks"],
    clientAdmin: ["Dashboard", "Clients", "Projects", "Tasks", "Analytics"],
    user: ["Dashboard", "Projects", "Tasks"],
}

const sidebarItems = (page: Page) => page.locator('[data-sidebar="content"]').getByRole("button")

for (const role of Object.keys(NAV) as Role[]) {
    test.describe(role, () => {
        signedInAs(role)

        test(`🟢 sidebar shows ${role} navigation`, async ({ page }) => {
            await page.goto("/dashboard")
            await expect(sidebarItems(page)).toHaveText(NAV[role])
        })
    })
}

test.describe("user", () => {
    signedInAs("user")

    for (const path of ["/users", "/clients", "/analytics"]) {
        test(`🔴 is sent back to the dashboard from ${path}`, async ({ page }) => {
            await page.goto(path)
            await expect(page).toHaveURL(/\/dashboard$/)
        })
    }
})

test.describe("clientAdmin", () => {
    signedInAs("clientAdmin")

    test("🔴 is sent back to the dashboard from /users", async ({ page }) => {
        await page.goto("/users")
        await expect(page).toHaveURL(/\/dashboard$/)
    })
})
