import { API_URL } from "./env"
import type { Seed } from "./fixtures"

type Who = keyof Seed["users"]

/**
 * Calls the GraphQL API as a seeded role, for setting up records a spec needs
 * without clicking through other screens first.
 */
export async function gqlAs<T = any>(seed: Seed, who: Who, query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const call = async (q: string, v: Record<string, unknown>, token?: string) => {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
            body: JSON.stringify({ query: q, variables: v }),
        })
        const body = await res.json()
        if (body.errors?.length) throw new Error(body.errors[0].message)
        return body.data
    }
    const { login } = await call(
        "mutation LoginMutation($email: String!, $password: String!) { login(email: $email, password: $password) { token } }",
        { email: seed.users[who].email, password: seed.password },
    )
    return call(query, variables, login.token)
}

/** A new USER account (password sign-in), unique per run. */
export async function createUser(seed: Seed, name: string) {
    const email = `${name.toLowerCase().replace(/\W+/g, ".")}.${Date.now()}@e2e.test`
    const { createUser } = await gqlAs(seed, "superAdmin",
        `mutation CreateUser($name: String!, $email: String!, $number: String!, $gender: String!, $mode: String, $password: String) {
            createUser(name: $name, email: $email, number: $number, gender: $gender, mode: $mode, password: $password) { id name email }
        }`,
        { name, email, number: "+61412345678", gender: "OTHERS", mode: "PASSWORD", password: seed.password },
    )
    return createUser as { id: string; name: string; email: string }
}
