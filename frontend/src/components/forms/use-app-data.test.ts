import { listsRefreshing } from "./use-app-data"

const state = (o: Record<string, object> = {}) => ({
    usersList: { loading: false, users: [] }, clients: { loading: false, clients: [] },
    projects: { loading: false, projects: [] }, tasks: { loading: false, loaded: false, tasks: [] }, ...o,
})

describe("listsRefreshing (LDR-01)", () => {
    it("🟢 a list that's on screen and refetching counts", () => {
        expect(listsRefreshing(state({ usersList: { loading: true, users: [{ id: "u" }] } }))).toBe(true)
        expect(listsRefreshing(state({ tasks: { loading: true, loaded: true, tasks: [] } }))).toBe(true)
    })

    it("🔴 a first load doesn't (the skeletons cover it), nor does idle", () => {
        expect(listsRefreshing(state({ projects: { loading: true, projects: [] } }))).toBe(false)
        expect(listsRefreshing(state())).toBe(false)
    })
})
