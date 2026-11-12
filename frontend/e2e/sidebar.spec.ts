import { expect, signedInAs, test } from "./fixtures"

test.describe("superAdmin", () => {
    signedInAs("superAdmin")

    test("🟢 collapsed sidebar centres every icon in the rail", async ({ page }) => {
        await page.goto("/dashboard")
        await page.getByRole("button", { name: "Toggle sidebar" }).click()
        const rail = page.locator('[data-sidebar="sidebar"]')
        // Wait for the collapse transition to finish
        await expect.poll(async () => (await rail.boundingBox())?.width).toBeLessThan(80)
        await page.waitForTimeout(400)
        const { center, offsets } = await rail.evaluate((sb) => {
            const r = sb.getBoundingClientRect()
            const center = r.left + r.width / 2
            const marks = [...sb.querySelectorAll('[data-sidebar="content"] svg, [data-sidebar="header"] a > span:first-child, [data-sidebar="footer"] [aria-label="Account menu"] > span:first-child')]
            return { center, offsets: marks.map((m) => { const b = m.getBoundingClientRect(); return Math.abs(b.left + b.width / 2 - center) }) }
        })
        expect(offsets.length).toBeGreaterThan(4)
        for (const off of offsets) expect(off, `icon is ${off.toFixed(1)}px off the rail's centre (${center})`).toBeLessThanOrEqual(1.5)
    })

    test("🟢 collapsed icons show their label on hover", async ({ page }) => {
        await page.goto("/dashboard")
        await page.getByRole("button", { name: "Toggle sidebar" }).click()
        await page.waitForTimeout(500)
        await page.locator('[data-sidebar="content"]').getByRole("button", { name: "Tasks" }).hover()
        await expect(page.getByRole("tooltip", { name: "Tasks" })).toBeVisible()
    })
})
