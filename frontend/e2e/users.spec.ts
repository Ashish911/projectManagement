import { expect, signedInAs, test } from "./fixtures"

test.describe("superAdmin", () => {
    signedInAs("superAdmin")

    test("🟢 invites a user, who then shows in the list as invited", async ({ page }) => {
        const name = `Ivy Invite ${Date.now()}`
        await page.goto("/users")
        await page.getByRole("button", { name: "Invite user" }).click()
        const form = page.getByRole("dialog", { name: "Invite user" })
        await form.getByPlaceholder("e.g. Mina Lama").fill(name)
        await form.getByPlaceholder("name@company.com").fill(`ivy.${Date.now()}@e2e.test`)
        await form.getByLabel("Phone").fill("412 345 678")
        await form.getByRole("button", { name: /Send invite/ }).click()
        await expect(form).toBeHidden()

        await page.getByPlaceholder("Search name or email").fill(name)
        const row = page.getByRole("row", { name: new RegExp(name) })
        await expect(row).toBeVisible()
        await expect(row.getByText("Invited")).toBeVisible()
    })

    test("🔴 can't edit their own account from user admin", async ({ page, seed }) => {
        await page.goto("/users")
        await page.getByPlaceholder("Search name or email").fill(seed.users.superAdmin.email)
        await page.getByRole("row", { name: new RegExp(seed.users.superAdmin.name) }).click()
        await expect(page.getByRole("dialog", { name: "View user" })).toBeVisible()
    })
})
