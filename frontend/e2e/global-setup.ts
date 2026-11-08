import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { API_URL, AUTH_DIR, MONGO_URI, REDIS_PORT, SEED_FILE, WEB_URL, roleState, type Role } from "./env"
import type { Seed } from "./fixtures"

const LOGIN = `mutation LoginMutation($email: String!, $password: String!) { login(email: $email, password: $password) { token } }`

/** Signs in through the API and returns the JWT. */
async function login(email: string, password: string): Promise<string> {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: LOGIN, variables: { email, password } }),
    })
    const body = await res.json()
    const token = body?.data?.login?.token
    if (!token) throw new Error(`E2E login failed for ${email}: ${JSON.stringify(body.errors)}`)
    return token
}

/**
 * Runs after the web servers are up: reseeds the database (server/scripts/seed-e2e.js), then
 * saves a browser state per role with the JWT in localStorage, which is where the app reads it.
 */
export default async function globalSetup() {
    const out = execFileSync("node", ["scripts/seed-e2e.js"], {
        cwd: "../server",
        env: { ...process.env, MONGO_URI, REDIS_PORT },
        encoding: "utf8",
    })
    const seed: Seed = JSON.parse(out.trim().split("\n").pop()!)

    mkdirSync(AUTH_DIR, { recursive: true })
    writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2))

    for (const role of Object.keys(seed.users) as Role[]) {
        const token = await login(seed.users[role].email, seed.password)
        const state = { cookies: [], origins: [{ origin: WEB_URL, localStorage: [{ name: "token", value: token }] }] }
        writeFileSync(roleState(role), JSON.stringify(state))
    }
}
