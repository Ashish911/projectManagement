import { expect, signedInAs, test } from "./fixtures"

test.describe("clientAdmin", () => {
    signedInAs("clientAdmin")

    test("🟢 a change in one tab shows up in another without reloading (GLB-04)", async ({ context, seed }) => {
        const title = `Sync check ${Date.now()}`
        const tabA = await context.newPage()
        const tabB = await context.newPage()
        await tabB.goto("/tasks")
        await expect(tabB.getByTestId("column-NEW")).toBeVisible()

        await tabA.goto("/tasks")
        await tabA.getByRole("button", { name: "New task" }).click()
        const form = tabA.getByRole("dialog", { name: "New task" })
        await form.getByPlaceholder("What needs doing?").fill(title)
        await form.locator("[data-invalid]").filter({ has: tabA.getByText(/^Project\*?$/) }).getByRole("button").click()
        await tabA.getByRole("option", { name: seed.project.name }).click()
        await form.getByRole("button", { name: "Create task" }).click()
        await expect(form).toBeHidden()

        // Tab B never reloads; the new task arrives through the tab sync
        await expect(tabB.getByTestId("column-NEW").getByLabel(title, { exact: true })).toBeVisible({ timeout: 5000 })
    })
})
