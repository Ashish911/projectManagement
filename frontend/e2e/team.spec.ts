import { expect, signedInAs, test } from "./fixtures"
import { createUser } from "./api"

test.describe("clientAdmin", () => {
    signedInAs("clientAdmin")

    // CA-02: the picker lists people who aren't on any of their projects yet
    test("🟢 adds someone new to their project's team", async ({ page, seed }) => {
        const newcomer = await createUser(seed, `Nina Newcomer ${Date.now()}`)

        await page.goto(`/projects/${seed.project.id}`)
        await page.getByRole("button", { name: "Manage team" }).first().click()
        const form = page.getByRole("dialog", { name: "Manage team" })
        await form.getByPlaceholder("Search people").fill(newcomer.name)
        await form.getByText(newcomer.name).click()
        await form.getByRole("button", { name: "Save team" }).click()
        await expect(form).toBeHidden()

        await expect(page.getByText(newcomer.name).first()).toBeVisible()
    })
})
