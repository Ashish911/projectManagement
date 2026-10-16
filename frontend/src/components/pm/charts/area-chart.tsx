import { useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { smoothPath, tokenColor, type Point } from "./smooth"

export type Series = {
    name: string
    points: number[]
    color: string
    /** Fill a soft gradient under the line */
    area?: boolean
}

const VIEW_W = 640 // SVG is stretched to the container width; only the ratio matters
const PAD = 8

/** Line/area chart with dashed grid, draw-in animation and a hover crosshair + tooltip. */
export function AreaChart({ series, labels, height = 220 }: { series: Series[]; labels: string[]; height?: number }) {
    const id = useId()
    const ref = useRef<HTMLDivElement>(null)
    const [hover, setHover] = useState<number | null>(null)

    const n = series[0]?.points.length ?? 0
    if (n < 2) return null

    const peak = Math.max(1, ...series.flatMap((s) => s.points))
    const max = peak * 1.15 // Headroom above the highest point
    const x = (i: number) => (i / (n - 1)) * VIEW_W
    const y = (v: number) => height - PAD - (v / max) * (height - PAD * 2)

    const onMove = (e: React.MouseEvent) => {
        const r = ref.current!.getBoundingClientRect()
        setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))))
    }

    // Thin out x labels so they never crowd
    const shownLabels = labels.filter((_, i) => n <= 8 || i % Math.ceil(n / 6) === 0 || i === n - 1)
    const hoverPct = hover != null ? (hover / (n - 1)) * 100 : 0

    return (
        <div>
            <div ref={ref} className="relative" style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
                <svg viewBox={`0 0 ${VIEW_W} ${height}`} preserveAspectRatio="none" width="100%" height={height} className="block overflow-visible">
                    <defs>
                        {series.map((s, k) => (
                            <linearGradient key={k} id={`${id}-${k}`} x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0" stopColor={s.color} stopOpacity={0.16} />
                                <stop offset="1" stopColor={s.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    {[0.25, 0.5, 0.75, 1].map((f) => (
                        <line key={f} x1={0} x2={VIEW_W} y1={y(peak * f)} y2={y(peak * f)} stroke={tokenColor("chart-grid")} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                    ))}
                    {series.map((s, k) => {
                        const d = smoothPath(s.points.map((v, i): Point => [x(i), y(v)]))
                        return (
                            <g key={k}>
                                {s.area && <path d={`${d} L${VIEW_W},${height} L0,${height} Z`} fill={`url(#${id}-${k})`} className="animate-pm-fade-late" />}
                                <path
                                    d={d}
                                    fill="none"
                                    stroke={s.color}
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    vectorEffect="non-scaling-stroke"
                                    pathLength={1}
                                    className="animate-pm-draw [stroke-dasharray:1] [stroke-dashoffset:1]"
                                    style={{ animationDelay: `${k * 120}ms` }}
                                />
                            </g>
                        )
                    })}
                </svg>

                {hover != null && (
                    <>
                        <div className="pointer-events-none absolute inset-y-0 border-l border-border-strong" style={{ left: `${hoverPct}%` }} />
                        {series.map((s, k) => (
                            <span
                                key={k}
                                className="pointer-events-none absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card transition-all duration-150 ease-out"
                                style={{ left: `${hoverPct}%`, top: `${(y(s.points[hover]) / height) * 100}%`, background: s.color }}
                            />
                        ))}
                        <div
                            className={cn(
                                "pointer-events-none absolute top-1 min-w-[130px] rounded-xl border bg-card px-2.5 py-2 shadow-md transition-[left] duration-150 ease-out",
                                hover > n / 2 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3",
                            )}
                            style={{ left: `${hoverPct}%` }}
                        >
                            <div className="mb-1 text-xs text-subtle-foreground">{labels[hover]}</div>
                            {series.map((s, k) => (
                                <div key={k} className="flex items-center gap-2 text-[12.5px]">
                                    <span className="size-2 rounded-sm" style={{ background: s.color }} />
                                    {s.name}
                                    <b className="num ml-auto">{s.points[hover]}</b>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            <div className="mt-2 flex justify-between">
                {shownLabels.map((l, i) => <span key={i} className="num text-xs text-subtle-foreground">{l}</span>)}
            </div>
        </div>
    )
}

/** Small legend chip used in panel headers: a short line in the series colour plus its name. */
export function LegendLine({ label, color }: { label: string; color: string }) {
    return (
        <span className="flex items-center gap-1.5 text-xs text-subtle-foreground">
            <span className="h-0.5 w-2.5 rounded-sm" style={{ background: color }} />
            {label}
        </span>
    )
}
