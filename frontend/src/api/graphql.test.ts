import { AxiosError, AxiosHeaders } from "axios"

const post = vi.hoisted(() => vi.fn())
vi.mock("axios", async (orig) => {
    const real = await orig<typeof import("axios")>()
    return { ...real, default: { ...real.default, create: () => ({ post, interceptors: { request: { use: vi.fn() } } }) } }
})

const { gql } = await import("./graphql")

const httpError = (status: number, data: unknown) => {
    const config = { headers: new AxiosHeaders() }
    return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, { status, statusText: "", headers: {}, config, data })
}

describe("gql", () => {
    beforeEach(() => post.mockReset())

    it("🟢 returns data", async () => {
        post.mockResolvedValue({ data: { data: { ok: 1 } } })
        await expect(gql("query Q { ok }")).resolves.toEqual({ ok: 1 })
        expect(post).toHaveBeenCalledWith("", { query: "query Q { ok }", variables: undefined })
    })

    it("🔴 throws the first GraphQL error from a 200 reply", async () => {
        post.mockResolvedValue({ data: { data: null, errors: [{ message: "Task not found" }, { message: "other" }] } })
        await expect(gql("q")).rejects.toThrow("Task not found")
    })

    it("🔴 throws the GraphQL message from a 401/429 reply, not Axios's", async () => {
        post.mockRejectedValue(httpError(401, { errors: [{ message: "Invalid or expired token" }] }))
        await expect(gql("q")).rejects.toThrow("Invalid or expired token")
        post.mockRejectedValue(httpError(429, { errors: [{ message: "Too many requests" }] }))
        await expect(gql("q")).rejects.toThrow("Too many requests")
    })

    it("🔴 rethrows network errors unchanged", async () => {
        const err = new Error("Network Error")
        post.mockRejectedValue(err)
        await expect(gql("q")).rejects.toBe(err)
    })
})
