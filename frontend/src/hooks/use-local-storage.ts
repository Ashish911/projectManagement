import { useCallback, useState } from "react"

export type StorageOptions = {
    /** Store the value as a plain string instead of JSON (for keys read outside React, e.g. index.html) */
    raw?: boolean
    /** Rejects stored values that are no longer allowed; the fallback is used instead */
    isValid?: (value: unknown) => boolean
}

/** Reads a value from localStorage; storage can be blocked (private mode), so failures return `fallback`. */
export function readStorage<T>(key: string, fallback: T, { raw, isValid }: StorageOptions = {}): T {
    try {
        const stored = localStorage.getItem(key)
        if (stored === null) return fallback
        const value = raw ? stored : JSON.parse(stored)
        return !isValid || isValid(value) ? (value as T) : fallback
    } catch {
        return fallback
    }
}

/** Writes a value to localStorage, ignoring blocked storage. */
export function writeStorage<T>(key: string, value: T, { raw }: StorageOptions = {}) {
    try {
        localStorage.setItem(key, raw ? String(value) : JSON.stringify(value))
    } catch {
        // Not critical: the value just won't survive a reload
    }
}

/** useState that is remembered in localStorage under `key`. */
export function useLocalStorage<T>(key: string, initial: T, options: StorageOptions = {}) {
    const [value, setValue] = useState<T>(() => readStorage(key, initial, options))
    const { raw } = options
    const set = useCallback((next: T) => {
        setValue(next)
        writeStorage(key, next, { raw })
    }, [key, raw])
    return [value, set] as const
}
