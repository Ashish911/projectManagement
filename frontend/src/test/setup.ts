import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"

// jsdom lacks these browser observers (used by charts and count-up animations)
class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
}
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
})
