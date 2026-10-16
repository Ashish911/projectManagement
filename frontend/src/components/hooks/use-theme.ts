import { useEffect, useState } from "react"
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

/**
 * Keeps <html> in sync with the saved Preference theme.
 * `toggle` switches immediately and saves to the server in the background.
 */
export function useTheme() {
    const dispatch = useDispatch()
    const savedTheme: Theme | undefined = useSelector((state: any) => state.preference?.preference?.theme)
    const [theme, setTheme] = useState<Theme>(readCachedTheme)

    // The server preference wins once it loads, or when changed on the Account page
    useEffect(() => {
        if (savedTheme) setTheme(savedTheme)
    }, [savedTheme])

    useEffect(() => applyTheme(theme), [theme])

    const toggle = () => {
        const next: Theme = theme === "DARK" ? "LIGHT" : "DARK"
        setTheme(next)
        dispatch(savePreference({ theme: next }) as any)
    }

    return { theme, toggle }
}
