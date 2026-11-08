import { defineConfig, devices } from "@playwright/test"
import { API_PORT, MONGO_PORT, MONGO_URI, REDIS_PORT, WEB_PORT, WEB_URL } from "./e2e/env"

/** Environment shared by the API and the notification worker. */
const serverEnv = {
    NODE_ENV: "test", // Not "development", which turns on the in-app rate limiter
    MONGO_URI,
    SECRET_KEY: "e2e-secret-key-not-used-anywhere-else-0123456789",
    REDIS_HOST: "localhost",
    REDIS_PORT,
    APP_URL: WEB_URL,
    BIRD_API_KEY: "", // Never send emails from tests
}

// End-to-end tests against the real stack: in-memory MongoDB, the GraphQL server, the notification
// worker and the Vite app.
// Needs a Redis on REDIS_PORT (6380 locally, see `npm run e2e:redis`). Global setup seeds the
// database and signs in one user per role; see e2e/global-setup.ts.
export default defineConfig({
    testDir: "e2e",
    fullyParallel: false, // Specs share one database, so run them in file order
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    globalSetup: "./e2e/global-setup.ts",
    use: {
        baseURL: WEB_URL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    // E2E_BROWSER_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's Chromium
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.E2E_BROWSER_CHANNEL } }],
    // Started in order, each waiting for the previous to be ready
    webServer: [
        {
            name: "MongoDB",
            command: "node e2e/mongo-server.mjs",
            port: MONGO_PORT,
            env: { E2E_MONGO_PORT: String(MONGO_PORT) },
            timeout: 120_000, // First run downloads the mongod binary
        },
        {
            name: "API",
            command: "node app.js",
            cwd: "../server",
            url: `http://localhost:${API_PORT}/health/ready`,
            env: { ...serverEnv, PORT: String(API_PORT), METRICS_PORT: "9191" },
            timeout: 60_000,
        },
        {
            // Delivers queued notifications; without it they wait in Redis. No port, so not awaited.
            name: "Worker",
            command: "node worker/notification.worker.js",
            cwd: "../server",
            env: serverEnv,
        },
        {
            name: "Web",
            command: `npx vite --port ${WEB_PORT} --strictPort`,
            url: WEB_URL,
            env: { VITE_API_URL: `http://localhost:${API_PORT}/graphql` }, // Overrides frontend/.env
            timeout: 60_000,
        },
    ],
})
