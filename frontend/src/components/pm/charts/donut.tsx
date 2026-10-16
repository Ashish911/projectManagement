import { useId } from "react"
import { tokenColor } from "./smooth"

/** Ring chart whose segments are revealed by a sweeping mask. */
export function Donut({ parts, size = 132, stroke = 14, center }: {
    parts: { value: number; color: string }[]
    size?: number
    stroke?: number
    center?: React.ReactNode
}) {
    const id = useId()
    const scale = size / 100 // Geometry is in a 100×100 viewBox
    const r = 50 - stroke / 2 / scale
    const total = parts.reduce((a, p) => a + p.value, 0) || 1
    const gap = parts.filter((p) => p.value > 0).length > 1 ? 1.4 : 0 // Gap between segments, in % of the ring
    let offset = 0

    return (
        <div className="relative flex-none" style={{ width: size, height: size }}>
            <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
                <defs>
                    <mask id={id}>
                        <circle cx={50} cy={50} r={r} fill="none" stroke="#fff" strokeWidth={(stroke * 1.6) / scale} pathLength={1} className="animate-pm-draw [stroke-dasharray:1] [stroke-dashoffset:1]" />
                    </mask>
                </defs>
                <circle cx={50} cy={50} r={r} fill="none" stroke={tokenColor("surface-3")} strokeWidth={stroke / scale} />
                <g mask={`url(#${id})`}>
                    {parts.map((p, k) => {
                        const len = (p.value / total) * 100
                        const seg = (
                            <circle
                                key={k}
                                cx={50}
                                cy={50}
                                r={r}
                                fill="none"
                                stroke={p.color}
                                strokeWidth={stroke / scale}
                                pathLength={100}
                                strokeDasharray={`${Math.max(0, len - gap)} ${100 - len + gap}`}
                                strokeDashoffset={-offset}
                            />
                        )
                        offset += len
                        return seg
                    })}
                </g>
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
        </div>
    )
}
