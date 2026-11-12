import { expect, signedInAs, test } from "./fixtures"

const topics = (page: import("@playwright/test").Page) => page.getByRole("heading", { level: 2 })

test.describe("user", () => {
    signedInAs("user")

    test("🟢 opens the Guide from the sidebar and sees only their topics", async ({ page }) => {
        await page.goto("/dashboard")
        await page.locator('[data-sidebar="content"]').getByRole("button", { name: "Guide" }).click()
        await expect(page).toHaveURL(/\/guide$/)
        await expect(page.getByText(/You get the work done/)).toBeVisible()
        await expect(topics(page).filter({ hasText: /^Tasks$/ })).toBeVisible()
        await expect(topics(page).filter({ hasText: /^(Users|Clients|Analytics)$/ })).toHaveCount(0)
    })

    test("🟢 a topic's button opens that page", async ({ page }) => {
        await page.goto("/guide")
        await page.getByRole("region", { name: "Tasks", exact: true }).getByRole("button", { name: /Open tasks/ }).click()
        await expect(page).toHaveURL(/\/tasks$/)
    })
})

test.describe("clientAdmin", () => {
    signedInAs("clientAdmin")

    test("🟢 sees their side of a client deletion, not the approval steps", async ({ page }) => {
        await page.goto("/guide")
        const clients = page.getByRole("region", { name: "Clients", exact: true })
        await expect(clients.getByText("Waiting for a super admin to approve", { exact: true })).toBeVisible()
        await expect(clients.getByText(/Approve deletion/)).toHaveCount(0)
    })
})

test.describe("superAdmin", () => {
    signedInAs("superAdmin")

    test("🟢 sees how to approve a deletion and the Users topic", async ({ page }) => {
        await page.goto("/guide")
        await expect(page.getByRole("region", { name: "Clients", exact: true }).getByText(/choose Approve deletion/)).toBeVisible()
        await expect(topics(page).filter({ hasText: /^Users$/ })).toBeVisible()
    })
})
