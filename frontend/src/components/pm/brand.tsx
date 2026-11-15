import { cn } from "@/lib/utils"

const SRC = { full: "/brand/projoman-logo.png", icon: "/brand/projoman-icon.png" }

/**
 * The ProjoMan logo: `full` (mascot and wordmark) wherever the app's logo shows,
 * `icon` (the mascot mark) where space is tight, like the collapsed sidebar.
 * Originals live in `frontend/brand-source/`.
 */
export function BrandLogo({ variant = "full", className }: { variant?: "full" | "icon"; className?: string }) {
    return (
        <img
            src={SRC[variant]}
            alt="ProjoMan"
            draggable={false}
            className={cn("block flex-none select-none object-contain", variant === "icon" ? "size-8" : "h-16 w-auto", className)}
        />
    )
}
