import { useEffect, useRef } from "react"
import { animate, useInView } from "motion/react"

/** Animates 0 → value on mount and from the previous value whenever `value` changes. */
export function CountUp({ value, duration = 0.9, decimals = 0, suffix = "" }: { value: number; duration?: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView || !ref.current) return
    const controls = animate(prev.current, value, {
      duration, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { if (ref.current) ref.current.textContent = v.toFixed(decimals) + suffix },
    })
    prev.current = value
    return () => controls.stop()
  }, [value, inView])

  return <span ref={ref} className="num">{(0).toFixed(decimals)}{suffix}</span>
}
