import { cn } from "@/lib/utils"

// Same hue set as the status tones, so avatars sit well next to badges
const HUES = [262, 195, 72, 152, 300, 27, 120]

/** Stable hue for a person, derived from their id (or name). */
const hueFor = (key: string) => {
    let h = 0
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return HUES[h % HUES.length]
}

/** Round initial on a tinted background. `seed` keeps the colour stable per user. */
export function Avatar({ name, seed, size = 28, className }: { name?: string; seed?: string; size?: number; className?: string }) {
    const initial = name?.trim()?.[0]?.toUpperCase() ?? "?"
    return (
        <span
            title={name}
            className={cn("grid flex-none place-items-center rounded-full font-semibold ring-2 ring-card", className)}
            style={{
                width: size,
                height: size,
                fontSize: size * 0.41,
                backgroundColor: `oklch(var(--st-bg-l) calc(var(--st-bg-c) * 1.4) ${hueFor(seed ?? name ?? "")})`,
                color: `oklch(var(--st-fg-l) var(--st-fg-c) ${hueFor(seed ?? name ?? "")})`,
            }}
        >
            {initial}
        </span>
    )
}

/** Overlapping row of avatars, e.g. a project team. */
export function AvatarGroup({ people, size = 26, max = 5 }: { people: { id: string; name: string }[]; size?: number; max?: number }) {
    const shown = people.slice(0, max)
    const extra = people.length - shown.length
    return (
        <div className="flex [&>*+*]:-ml-[7px]">
            {shown.map((p) => <Avatar key={p.id} name={p.name} seed={p.id} size={size} />)}
            {extra > 0 && (
                <span className="num grid flex-none place-items-center rounded-full bg-surface-3 text-muted-foreground ring-2 ring-card" style={{ width: size, height: size, fontSize: size * 0.38 }}>
                    +{extra}
                </span>
            )}
        </div>
    )
}
