import { useEffect, useSyncExternalStore } from "react"
import { useDispatch, useSelector } from "react-redux"
import { savePreference } from "@/redux/actions/preferenceActions"
import { readStorage, writeStorage } from "@/hooks/use-local-storage"

export type Theme = "LIGHT" | "DARK"

// Also read by the inline script in index.html, so the theme applies before React mounts
const STORAGE_KEY = "pm-theme"

// Plain string, not JSON, because index.html compares it directly
const readCachedTheme = (): Theme => readStorage<Theme>(STORAGE_KEY, "LIGHT", { raw: true, isValid: (v) => v === "DARK" })

/** Sets the `.dark` class on <html> and caches the choice for the next page load. */
const applyTheme = (theme: Theme) => {
    document.documentElement.classList.toggle("dark", theme === "DARK")
    writeStorage(STORAGE_KEY, theme, { raw: true })
}

// ── One shared theme for every toggle (header, account panel, ⌘K) ───────────────
let current: Theme | null = null // Read from the cache on first use
const listeners = new Set<() => void>()
const SAVE_DELAY_MS = 400
let saveTimer: ReturnType<typeof setTimeout> | null = null
let saving = 0 // Saves in flight

const getTheme = () => (current ??= readCachedTheme())
// Stable module-level function: an inline one would re-subscribe on every render
const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => { listeners.delete(l) }
}
const setTheme = (t: Theme) => {
    if (t === getTheme()) return
    current = t
    applyTheme(t)
    listeners.forEach((l) => l())
}

/**
 * The current theme, shared by every caller. `toggle` and `set` apply at once;
 * saving to the server is debounced, so rapid clicks send only the final value,
 * and a server value that arrives while a save is pending is ignored.
 */
export function useTheme() {
    const dispatch = useDispatch()
    const savedTheme: Theme | undefined = useSelector((state: any) => state.preference?.preference?.theme)
    const theme = useSyncExternalStore(subscribe, getTheme)

    // The server preference wins once it loads, unless our own change is still being saved
    useEffect(() => {
        if (savedTheme && !saveTimer && !saving) setTheme(savedTheme)
    }, [savedTheme])

    useEffect(() => applyTheme(getTheme()), [])

    const set = (next: Theme) => {
        setTheme(next)
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
            saveTimer = null
            saving++
            Promise.resolve(dispatch(savePreference({ theme: getTheme() }) as any)).finally(() => { saving-- })
        }, SAVE_DELAY_MS)
    }
    const toggle = () => set(getTheme() === "DARK" ? "LIGHT" : "DARK")

    return { theme, toggle, set }
}
