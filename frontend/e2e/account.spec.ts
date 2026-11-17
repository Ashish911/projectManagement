import { expect, signedInAs, test } from "./fixtures"
import { gqlAs } from "./api"

test.describe("user", () => {
    signedInAs("user")

    // Put the seeded name back even if the test fails: later specs look people up by it
    test.afterEach(async ({ seed }) => {
        await gqlAs(seed, "user", "mutation UpdateProfile($name: String) { updateProfile(name: $name) { id } }", { name: seed.users.user.name })
    })

    test("🟢 edits their profile from the account menu", async ({ page }) => {
        await page.goto("/dashboard")
        await page.getByRole("button", { name: "Account menu" }).click()
        await page.getByText("Edit profile").click()
        await page.getByLabel("Full name").fill("Uma Renamed")
        await page.getByLabel("Phone").fill("412 345 678")
        await page.getByRole("button", { name: "Save profile" }).click()
        await page.keyboard.press("Escape")

        // The sidebar's account row shows the new name
        await expect(page.getByRole("button", { name: "Account menu" })).toContainText("Uma Renamed")
    })
})
