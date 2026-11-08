import { useCallback, useRef, useState } from "react"

/**
 * Runs async work with `busy` and `error` state, for buttons and forms.
 * `run(fn)` ignores calls while busy, stores the thrown message in `error`,
 * and returns fn's result (or undefined if it threw).
 */
export function useAsyncAction() {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const running = useRef(false) // Guards double clicks before `busy` re-renders

    const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
        if (running.current) return undefined
        running.current = true
        setBusy(true)
        setError("")
        try {
            return await fn()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
            return undefined
        } finally {
            running.current = false
            setBusy(false)
        }
    }, [])

    return { run, busy, error, setError }
}
