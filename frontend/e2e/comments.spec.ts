import type { Page } from "@playwright/test"
import { expect, test } from "./fixtures"
import { roleState } from "./env"

/** Opens the task's side sheet from the Tasks board. */
async function openTask(page: Page, title: string) {
    await page.goto("/tasks")
    await page.getByLabel(title, { exact: true }).click()
    return page.getByRole("dialog", { name: title })
}

test("🟢 a member comments on a task and their client admin deletes it", async ({ browser, seed }) => {
    const text = `Blocked on the API keys ${Date.now()}`

    const member = await browser.newContext({ storageState: roleState("user") })
    const memberPage = await member.newPage()
    let sheet = await openTask(memberPage, seed.task.title)
    await sheet.getByPlaceholder("Write a comment").fill(text)
    await sheet.getByRole("button", { name: "Post comment" }).click()
    await expect(sheet.getByText(text)).toBeVisible()
    await member.close()

    const admin = await browser.newContext({ storageState: roleState("clientAdmin") })
    const adminPage = await admin.newPage()
    sheet = await openTask(adminPage, seed.task.title)
    const comment = sheet.locator(".group").filter({ hasText: text })
    await expect(comment).toContainText(seed.users.user.name)
    await comment.hover()
    await comment.getByRole("button", { name: "Delete comment" }).click()
    await expect(sheet.getByText(text)).toBeHidden()

    // Gone on the server too
    sheet = await openTask(adminPage, seed.task.title)
    await expect(sheet.getByRole("heading", { name: "Comments" })).toBeVisible()
    await expect(sheet.getByText(text)).toHaveCount(0)
    await admin.close()
})

test("🔴 the post button stays disabled for an empty comment", async ({ browser, seed }) => {
    const member = await browser.newContext({ storageState: roleState("user") })
    const sheet = await openTask(await member.newPage(), seed.task.title)

    await sheet.getByPlaceholder("Write a comment").fill("   ")
    await expect(sheet.getByRole("button", { name: "Post comment" })).toBeDisabled()
    await member.close()
})
