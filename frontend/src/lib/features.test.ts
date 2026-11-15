export {} // A module, not a global script (keeps `load` local)
const flags = vi.hoisted(() => ({ clientAdminAnalytics: false }))
vi.mock("@/lib/features", () => ({ FEATURES: flags }))

const load = async () => {
    vi.resetModules()
    const { NAV_BY_ROLE, analyticsRoles } = await import("@/Screens/Components/app-sidebar")
    const { guideFor } = await import("@/Screens/Dashboard/guide/guide-content")
    return { nav: NAV_BY_ROLE.CLIENT_ADMIN.map((i) => i.url), guide: guideFor("CLIENT_ADMIN").map((t) => t.id), roles: analyticsRoles() }
}

describe("Client admin Analytics flag (CA-01)", () => {
    afterEach(() => { flags.clientAdminAnalytics = false })

    it("🔴 off (the default): no nav item, no guide topic, route closed to client admins", async () => {
        const { nav, guide, roles } = await load()
        expect(nav).not.toContain("/analytics")
        expect(guide).not.toContain("analytics")
        expect(roles).toEqual(["SUPER_ADMIN"])
    })

    it("🟢 on: all three come back", async () => {
        flags.clientAdminAnalytics = true
        const { nav, guide, roles } = await load()
        expect(nav).toContain("/analytics")
        expect(guide).toContain("analytics")
        expect(roles).toEqual(["SUPER_ADMIN", "CLIENT_ADMIN"])
    })
})
