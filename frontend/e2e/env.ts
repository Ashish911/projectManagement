// Ports and URLs for the e2e stack. Kept off the dev ports (4000, 8000, 9090, 6379)
// so the suite can run while the dev stack is up.
export const MONGO_PORT = 27018
export const MONGO_URI = `mongodb://127.0.0.1:${MONGO_PORT}/projoman-e2e`
export const REDIS_PORT = process.env.E2E_REDIS_PORT ?? "6380"
export const API_PORT = 8001
export const API_URL = `http://localhost:${API_PORT}/graphql`
export const WEB_PORT = 4001
export const WEB_URL = `http://localhost:${WEB_PORT}`

export type Role = "superAdmin" | "clientAdmin" | "user"

/** Where global setup writes the seeded records and each role's signed-in browser state. */
export const AUTH_DIR = "e2e/.auth"
export const SEED_FILE = `${AUTH_DIR}/seed.json`
export const roleState = (role: Role) => `${AUTH_DIR}/${role}.json`
