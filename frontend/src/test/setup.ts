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
// jsdom has no layout, so scrolling into view is a no-op (used by the ⌘K palette's highlighted row)
Element.prototype.scrollIntoView ??= function () {}
window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
})
