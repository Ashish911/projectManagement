import { expect, signedInAs, test } from "./fixtures"

test.describe("clientAdmin", () => {
    signedInAs("clientAdmin")

    test("🟢 creates a project with a team member and opens it", async ({ page, seed }) => {
        const name = `Mobile App ${Date.now()}`
        await page.goto("/projects")

        await page.getByRole("button", { name: "New project" }).first().click()
        const form = page.getByRole("dialog", { name: "New project" })
        await form.getByPlaceholder("e.g. Atlas Portal").fill(name)
        await form.getByPlaceholder("What is this project for?").fill("Created by the e2e suite")
        await form.getByRole("button", { name: "Add people" }).click()
        await form.getByRole("option", { name: seed.users.user.name }).click()
        await form.getByRole("button", { name: "Create project" }).click()

        await expect(form).toBeHidden()
        await page.getByRole("main").getByText(name).click()
        await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}$/)
        await expect(page.getByRole("heading", { name })).toBeVisible()
        await page.getByRole("tab", { name: /^Team/ }).click()
        await expect(page.getByRole("main").getByText(seed.users.user.name).first()).toBeVisible()
    })
})

test.describe("user", () => {
    signedInAs("user")

    test("🟢 sees the project they are assigned to and can't create one", async ({ page, seed }) => {
        await page.goto("/projects")

        await expect(page.getByText(seed.project.name)).toBeVisible()
        await expect(page.getByRole("button", { name: "New project" })).toHaveCount(0)
    })
})
