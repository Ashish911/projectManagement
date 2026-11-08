import { readFileSync } from "node:fs"
import { test as base } from "@playwright/test"
import { SEED_FILE, roleState, type Role } from "./env"

/** Records created by server/scripts/seed-e2e.js; global setup saves them to SEED_FILE. */
export interface Seed {
    password: string
    users: Record<Role, { id: string; name: string; email: string; role: string }>
    client: { id: string; name: string }
    project: { id: string; name: string }
    task: { id: string; title: string }
}

/** `test` with the seeded records as a `seed` fixture. */
export const test = base.extend<{ seed: Seed }>({
    seed: async ({}, use) => {
        await use(JSON.parse(readFileSync(SEED_FILE, "utf8")))
    },
})

/** Starts every test in the file signed in as `role`. Call at the top of a spec or describe block. */
export const signedInAs = (role: Role) => test.use({ storageState: roleState(role) })

export { expect } from "@playwright/test"
