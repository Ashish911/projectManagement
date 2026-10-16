import { smoothPath, tokenColor, type Point } from "./smooth"

/** Small trend line that draws itself in, with a dot on the latest value. */
export function Sparkline({ points, width = 96, height = 32, color = tokenColor("chart-1") }: {
    points: number[]
    width?: number
    height?: number
    color?: string
}) {
    if (points.length < 2) return null
    const max = Math.max(...points)
    const min = Math.min(...points)
    const range = max - min || 1
    const xy: Point[] = points.map((v, i) => [
        (i / (points.length - 1)) * width,
        height - 3 - ((v - min) / range) * (height - 6),
    ])
    const last = xy[xy.length - 1]

    return (
        <svg width={width} height={height} className="block overflow-visible">
            <path
                d={smoothPath(xy)}
                fill="none"
                stroke={color}
                strokeWidth={1.75}
                strokeLinecap="round"
                pathLength={1}
                className="animate-pm-draw [stroke-dasharray:1] [stroke-dashoffset:1]"
            />
            <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} className="animate-pm-fade-late" />
        </svg>
    )
}
