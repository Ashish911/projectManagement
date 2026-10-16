export type Point = [x: number, y: number]

/** Smooth SVG path through the points (Catmull-Rom style cubic curves, as in the design). */
export function smoothPath(pts: Point[]): string {
    if (pts.length < 2) return ""
    const k = 0.18 // Curve tension; higher bends more
    let d = `M${pts[0][0]},${pts[0][1]}`
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2] ?? p2
        // Keep control points between the two ends, so the curve never overshoots (e.g. below zero)
        const lo = Math.min(p1[1], p2[1])
        const hi = Math.max(p1[1], p2[1])
        const clamp = (y: number) => Math.min(hi, Math.max(lo, y))
        d += ` C${p1[0] + (p2[0] - p0[0]) * k},${clamp(p1[1] + (p2[1] - p0[1]) * k)} ${p2[0] - (p3[0] - p1[0]) * k},${clamp(p2[1] - (p3[1] - p1[1]) * k)} ${p2[0]},${p2[1]}`
    }
    return d
}

/** CSS colour for a theme token stored as raw OKLCH channels, e.g. tokenColor("chart-1"). */
export const tokenColor = (name: string) => `oklch(var(--${name}))`
