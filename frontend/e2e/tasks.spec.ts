import type { Locator, Page } from "@playwright/test"
import { expect, signedInAs, test } from "./fixtures"

const column = (page: Page, status: string) => page.getByTestId(`column-${status}`)

/**
 * Drags with real pointer moves; dnd-kit's PointerSensor needs 6px of movement to start.
 * The target is measured after the drag starts, because the board's layout changes while dragging.
 */
async function dragTo(page: Page, source: Locator, target: Locator) {
    const s = (await source.boundingBox())!
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2)
    await page.mouse.down()
    await page.mouse.move(s.x + s.width / 2 + 10, s.y + s.height / 2, { steps: 5 })
    const t = (await target.boundingBox())!
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 15 })
    await page.mouse.up()
}

test.describe("clientAdmin", () => {
    signedInAs("clientAdmin")

    test("🟢 creates a task, moves it across the board, and adds a subtask", async ({ page, seed }) => {
        const title = `Write release notes ${Date.now()}`
        await page.goto("/tasks")

        await page.getByRole("button", { name: "New task" }).click()
        const form = page.getByRole("dialog", { name: "New task" })
        await form.getByPlaceholder("What needs doing?").fill(title)
        // The project combo may already have a project picked, so find it by its field label
        await form.locator("[data-invalid]").filter({ has: page.getByText(/^Project\*?$/) }).getByRole("button").click()
        await page.getByRole("option", { name: seed.project.name }).click()
        await form.getByRole("button", { name: "Create task" }).click()
        await expect(form).toBeHidden()

        const card = page.getByLabel(title, { exact: true })
        await expect(column(page, "NEW").getByLabel(title, { exact: true })).toBeVisible()

        await dragTo(page, card, column(page, "IN_PROGRESS"))
        await expect(column(page, "IN_PROGRESS").getByLabel(title, { exact: true })).toBeVisible()

        // The move was saved, not just shown
        await page.reload()
        await expect(column(page, "IN_PROGRESS").getByLabel(title, { exact: true })).toBeVisible()

        await card.click()
        const sheet = page.getByRole("dialog", { name: title })
        await sheet.getByPlaceholder("Add a subtask, then press Enter").fill("Draft changelog")
        await sheet.getByPlaceholder("Add a subtask, then press Enter").press("Enter")
        await expect(sheet.getByText("Draft changelog")).toBeVisible()
    })

    test("🟢 switches to the list view", async ({ page, seed }) => {
        await page.goto("/tasks")
        await page.getByRole("button", { name: "List" }).click()

        await expect(page.getByTestId("column-NEW")).toHaveCount(0)
        await expect(page.getByRole("main").getByText(seed.task.title)).toBeVisible()
    })
})

test.describe("user", () => {
    signedInAs("user")

    test("🟢 sees their tasks and can't create one", async ({ page, seed }) => {
        await page.goto("/tasks")

        await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible()
        await expect(page.getByLabel(seed.task.title, { exact: true })).toBeVisible()
        await expect(page.getByRole("button", { name: "New task" })).toHaveCount(0)
    })
})
