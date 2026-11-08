import { useEffect, useRef } from "react"

/** Calls `onOutside` on a mouse press outside `ref` while `active` (closes popovers). */
export function useOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void, active: boolean) {
    const handler = useRef(onOutside)
    handler.current = onOutside // Always call the latest callback without re-binding the listener
    useEffect(() => {
        if (!active) return
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) handler.current()
        }
        document.addEventListener("mousedown", h, true)
        return () => document.removeEventListener("mousedown", h, true)
    }, [active, ref])
}
