import { useEffect, useRef } from "react"
import { subscribe } from "@/api/ws"

/**
 * Keeps a GraphQL subscription open while the component is mounted (and `enabled`),
 * calling `onData` with each result.
 */
export function useSubscription<T>(query: string, onData: (data: T) => void, options: { variables?: Record<string, unknown>; enabled?: boolean } = {}) {
    const { variables, enabled = true } = options
    const handler = useRef(onData)
    handler.current = onData
    const key = JSON.stringify(variables ?? {})
    useEffect(() => {
        if (!enabled) return
        return subscribe<T>(query, (d) => handler.current(d), variables)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, key, enabled])
}
