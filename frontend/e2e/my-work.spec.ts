import { expect, signedInAs, test } from "./fixtures"
import { gqlAs } from "./api"

test.describe("user", () => {
    signedInAs("user")

    // TSK-05: a subtask assigned to you brings its (unassigned) parent into your tasks
    test("🟢 sees a task where only a subtask is theirs, with the subtask under it", async ({ page, seed }) => {
        const title = `Parent ${Date.now()}`
        const { createTask } = await gqlAs(seed, "clientAdmin",
            "mutation CreateTask($title: String!, $projectId: ID!) { createTask(title: $title, projectId: $projectId) { id } }",
            { title, projectId: seed.project.id })
        await gqlAs(seed, "clientAdmin",
            "mutation CreateSubTask($title: String!, $taskId: ID!, $assignedTo: ID) { createSubTask(title: $title, taskId: $taskId, assignedTo: $assignedTo) { id } }",
            { title: "Write the copy", taskId: createTask.id, assignedTo: seed.users.user.id })

        await page.goto("/tasks")
        const card = page.getByTestId("column-NEW").getByLabel(title, { exact: true })
        await expect(card).toBeVisible()
        await expect(card.getByText("Write the copy")).toBeVisible()
        await expect(card.getByText(/assigned to you/)).toBeVisible()

        // The parent opens read-only for them
        await card.click()
        await expect(page.getByLabel("Task title")).toBeDisabled()
    })
})
