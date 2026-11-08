import type { Page } from "@playwright/test"
import { expect, signedInAs, test } from "./fixtures"

/** Fills and submits the login form on `/`. */
async function submitLogin(page: Page, email: string, password: string) {
    await page.getByPlaceholder("Email Address").fill(email)
    await page.getByPlaceholder("Password").fill(password)
    await page.getByRole("button", { name: "Login", exact: true }).click()
}

test.describe("signed out", () => {
    test("🟢 logs in with valid credentials and lands on the dashboard", async ({ page, seed }) => {
        await page.goto("/")
        await submitLogin(page, seed.users.user.email, seed.password)

        await expect(page).toHaveURL(/\/dashboard$/)
        await expect(page.getByRole("button", { name: "Account menu" })).toContainText(seed.users.user.name)
    })

    test("🔴 shows an error for a wrong password and stays on the login page", async ({ page, seed }) => {
        await page.goto("/")
        await submitLogin(page, seed.users.user.email, "wrong-password")

        await expect(page.getByText("Invalid email or password")).toBeVisible()
        await expect(page).toHaveURL(/\/$/)
    })

    test("🔴 redirects protected routes to the login page", async ({ page }) => {
        await page.goto("/dashboard")

        await expect(page).toHaveURL(/\/$/)
        await expect(page.getByRole("heading", { name: "Login" })).toBeVisible()
    })

    test("🟢 registers a new account, then signs in with it", async ({ page }) => {
        const email = `new-${Date.now()}@e2e.test`
        await page.goto("/register")

        await page.getByPlaceholder("Email Address").fill(email)
        await page.getByPlaceholder("Full Name").fill("Nina New")
        await page.getByPlaceholder("Password", { exact: true }).fill("Password123!")
        await page.getByPlaceholder("Confirm Password").fill("Password123!")
        await page.getByPlaceholder("Phone Number").fill("0400111222")
        await page.getByRole("combobox").click()
        await page.getByRole("option", { name: "Female" }).click()
        await page.getByRole("button", { name: "Select date" }).click()
        await page.getByRole("gridcell", { name: "15" }).first().click()
        await page.getByRole("button", { name: "Register", exact: true }).click()

        // Registration returns to the login page instead of signing in
        await expect(page).toHaveURL(/\/$/)
        await submitLogin(page, email, "Password123!")
        await expect(page).toHaveURL(/\/dashboard$/)
    })
})

test.describe("signed in", () => {
    signedInAs("user")

    test("🟢 signs out from the account menu", async ({ page }) => {
        await page.goto("/dashboard")
        await page.getByRole("button", { name: "Account menu" }).click()
        await page.getByRole("button", { name: "Sign out" }).click()

        await expect(page).toHaveURL(/\/$/)
        await page.goto("/dashboard")
        await expect(page).toHaveURL(/\/$/) // Token is gone, so the guard redirects
    })
})
