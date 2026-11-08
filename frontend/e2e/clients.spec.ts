import { expect, signedInAs, test } from "./fixtures"

test.describe("superAdmin", () => {
    signedInAs("superAdmin")

    test("🟢 adds a client, then renames it", async ({ page }) => {
        const name = `Globex ${Date.now()}`
        await page.goto("/clients")

        await page.getByRole("button", { name: "New client" }).click()
        const form = page.getByRole("dialog", { name: "New client" })
        await form.getByPlaceholder("e.g. Northwind").fill(name)
        await form.getByPlaceholder("ops@company.com").fill(`ops-${Date.now()}@globex.test`)
        await form.getByRole("button", { name: "Add client" }).click()

        await expect(form).toBeHidden()
        const row = page.getByRole("row").filter({ hasText: name })
        await expect(row).toBeVisible()

        await row.click()
        await page.getByRole("button", { name: "Edit client" }).click()
        const edit = page.getByRole("dialog", { name: "Edit client" })
        await edit.getByPlaceholder("e.g. Northwind").fill(`${name} Ltd`)
        await edit.getByRole("button", { name: "Save changes" }).click()

        await expect(edit).toBeHidden()
        await expect(page.getByRole("row").filter({ hasText: `${name} Ltd` })).toBeVisible()
    })

    test("🔴 keeps the form open when the name is empty", async ({ page }) => {
        await page.goto("/clients")
        await page.getByRole("button", { name: "New client" }).click()
        const form = page.getByRole("dialog", { name: "New client" })
        await form.getByRole("button", { name: "Add client" }).click()

        await expect(form).toBeVisible()
    })
})

test.describe("clientAdmin", () => {
    signedInAs("clientAdmin")

    test("🟢 sees only the client they manage", async ({ page, seed }) => {
        await page.goto("/clients")

        await expect(page.getByRole("heading", { name: "Your client" })).toBeVisible()
        await expect(page.getByText(seed.client.name).first()).toBeVisible()
        await expect(page.getByRole("button", { name: "New client" })).toHaveCount(0)
    })
})
