import { useEffect, useRef } from "react"

type Ref = React.RefObject<HTMLElement>

/**
 * Calls `onOutside` on a mouse press outside `ref` while `active` (closes popovers).
 * Pass several refs when part of the popover is portalled elsewhere in the DOM.
 */
export function useOutside(ref: Ref | Ref[], onOutside: () => void, active: boolean) {
    const handler = useRef(onOutside)
    handler.current = onOutside // Always call the latest callback without re-binding the listener
    const refs = useRef<Ref[]>([])
    refs.current = Array.isArray(ref) ? ref : [ref]
    useEffect(() => {
        if (!active) return
        const h = (e: MouseEvent) => {
            const inside = refs.current.some((r) => r.current?.contains(e.target as Node))
            if (!inside && refs.current[0].current) handler.current()
        }
        document.addEventListener("mousedown", h, true)
        return () => document.removeEventListener("mousedown", h, true)
    }, [active])
}
