import { expect, test } from "./fixtures"
import { roleState } from "./env"

// Runs through the whole pipeline: API → BullMQ queue → worker → Redis PubSub → graphql-ws → header toast
test("🟢 a member sees a live notification when a task is assigned to them", async ({ browser, seed }) => {
    const title = `Review invoices ${Date.now()}`

    const member = await browser.newContext({ storageState: roleState("user") })
    const memberPage = await member.newPage()
    await memberPage.goto("/dashboard")
    await expect(memberPage.getByRole("button", { name: "Notifications" })).toBeVisible()

    const admin = await browser.newContext({ storageState: roleState("clientAdmin") })
    const adminPage = await admin.newPage()
    await adminPage.goto("/tasks")
    await adminPage.getByRole("button", { name: "New task" }).click()
    const form = adminPage.getByRole("dialog", { name: "New task" })
    await form.getByPlaceholder("What needs doing?").fill(title)
    await form.locator("[data-invalid]").filter({ has: adminPage.getByText(/^Project\*?$/) }).getByRole("button").click()
    await form.getByRole("option", { name: seed.project.name }).click()
    await form.locator("[data-invalid]").filter({ has: adminPage.getByText(/^Assignee$/) }).getByRole("button").click()
    await form.getByRole("option", { name: seed.users.user.name }).click()
    await form.getByRole("button", { name: "Create task" }).click()
    await expect(form).toBeHidden()

    // No reload: the notification has to arrive over the WebSocket
    await expect(memberPage.getByText(`You have been assigned a new task: ${title}`).first()).toBeVisible({ timeout: 15_000 })

    await admin.close()
    await member.close()
})
