import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { Icon } from "@tabler/icons-react"
import { IconAlertCircle, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusKey } from "@/components/pm/status-badge"

// ── Form state ────────────────────────────────────────────────────────────────

type Rules<T> = Partial<{ [K in keyof T]: (value: T[K], all: T) => string | null | undefined }>

/**
 * Form values with per-field validation: errors show after a field is blurred
 * (or on submit), then update live as the user types.
 * @param init         Initial values.
 * @param rules        Per-field validators returning an error message or nothing.
 * @param validateNow  Show every error immediately (used when editing existing data).
 */
export function useForm<T extends Record<string, any>>(init: T, rules: Rules<T>, validateNow = false) {
    const check = (vals: T) => {
        const e: Partial<Record<keyof T, string>> = {}
        for (const k in rules) {
            const m = rules[k]?.(vals[k], vals)
            if (m) e[k] = m
        }
        return e
    }
    const [v, setV] = useState<T>(init)
    const vRef = useRef(v)
    vRef.current = v
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>(() =>
        validateNow ? Object.fromEntries(Object.keys(rules).map((k) => [k, true])) as any : {})
    const [err, setErr] = useState<Partial<Record<keyof T, string>>>(() => (validateNow ? check(init) : {}))
    const [busy, setBusy] = useState(false)
    const [shake, setShake] = useState(0)
    // Errors from the server, shown above the footer
    const [formError, setFormError] = useState<string | null>(null)

    // Live re-validation, but only for fields already touched or already in error
    useEffect(() => {
        setErr((prev) => {
            const c = check(v)
            const next: Partial<Record<keyof T, string>> = {}
            for (const k in c) if (touched[k] || prev[k]) next[k] = c[k]
            return next
        })
    }, [v])

    const set = <K extends keyof T>(k: K, x: T[K]) =>
        setV((o) => {
            const n = { ...o, [k]: x }
            vRef.current = n
            return n
        })

    const blur = (k: keyof T) => {
        // Leaving an empty field says nothing yet: "required" errors wait for submit. Otherwise the
        // error line appearing on blur shifts the layout and the click on Save misses its button.
        if (vRef.current[k] === "") return
        setTouched((t) => ({ ...t, [k]: true }))
        const c = check(vRef.current)
        setErr((e) => ({ ...e, [k]: c[k] }))
    }

    /** Validates everything; on success runs `fn` with a busy spinner, on failure shakes and focuses the first error. */
    const submit = async (fn: (vals: T) => Promise<void> | void, box?: React.RefObject<HTMLElement>) => {
        const c = check(vRef.current)
        setTouched(Object.fromEntries(Object.keys(rules).map((k) => [k, true])) as any)
        setErr(c)
        if (Object.keys(c).length) {
            setShake((s) => s + 1)
            setTimeout(() => box?.current?.querySelector<HTMLElement>("[data-invalid=true] input, [data-invalid=true] textarea, [data-invalid=true] button")?.focus(), 30)
            return
        }
        setBusy(true)
        setFormError(null)
        try {
            await fn(vRef.current)
        } catch (e: any) {
            setFormError(e?.message ?? "Something went wrong")
            setShake((s) => s + 1)
        } finally {
            setBusy(false)
        }
    }

    return { v, set, setV, err, blur, submit, busy, shake, formError, setFormError }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

/**
 * Centered dialog with a blurred overlay. Esc closes, ⌘/Ctrl+Enter submits,
 * the first text field is focused on open, and `shake` changes replay a shake.
 */
export function FormModal({ title, desc, icon: I, tone, width = 560, onClose, onSubmit, closing, shake = 0, boxRef, footer, children }: {
    title: React.ReactNode
    desc?: React.ReactNode
    icon?: Icon
    tone?: "red"
    width?: number
    onClose: () => void
    onSubmit?: () => void
    closing?: boolean
    shake?: number
    boxRef?: React.RefObject<HTMLDivElement>
    footer?: React.ReactNode
    children: React.ReactNode
}) {
    const own = useRef<HTMLDivElement>(null)
    const box = boxRef ?? own
    const submitRef = useRef(onSubmit)
    submitRef.current = onSubmit
    const closeRef = useRef(onClose)
    closeRef.current = onClose

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeRef.current()
            else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                submitRef.current?.()
            }
        }
        window.addEventListener("keydown", onKey)
        const t = setTimeout(() => box.current?.querySelector<HTMLElement>("input:not([type=checkbox]):not([type=date]),textarea")?.focus(), 80)
        return () => {
            window.removeEventListener("keydown", onKey)
            clearTimeout(t)
        }
    }, [])

    return createPortal(
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[oklch(0.22_0.01_65/.34)] px-5 pb-12 pt-[8vh] backdrop-blur-[4px] dark:bg-[oklch(0.05_0_0/.6)]",
                closing ? "animate-fm-fade-out" : "animate-fm-fade",
            )}
            onMouseDown={onClose}
        >
            <div
                ref={box}
                role="dialog"
                aria-modal
                aria-label={typeof title === "string" ? title : undefined}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn(
                    "relative flex max-w-full flex-col rounded-[14px] border bg-card shadow-lg",
                    closing ? "animate-fm-pop-out" : shake ? (shake % 2 ? "animate-fm-shake" : "animate-fm-shake-b") : "animate-fm-pop",
                )}
                style={{ width }}
            >
                <header className="flex items-start gap-3 px-5 pt-[18px]">
                    {I && (
                        <span className={cn("grid size-9 flex-none place-items-center rounded-[10px]", tone === "red" ? "tone-red tone-bg tone-fg" : "bg-accent text-accent-foreground")}>
                            <I size={19} />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
                        {desc && <div className="mt-[3px] text-[13px] text-subtle-foreground">{desc}</div>}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label="Close"><IconX /></Button>
                </header>
                <div className="grid gap-4 px-5 pb-[22px] pt-[18px]">{children}</div>
                {footer && <footer className="flex flex-wrap items-center gap-2 rounded-b-[14px] border-t bg-surface-2 py-3 pl-5 pr-4">{footer}</footer>}
            </div>
        </div>,
        document.body,
    )
}

// ── Fields ────────────────────────────────────────────────────────────────────

/** Shared look for text inputs and textareas inside forms. */
export const inputCls =
    "w-full h-9 rounded-lg border border-border-strong bg-card px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-fast placeholder:text-subtle-foreground hover:border-subtle-foreground focus:border-primary focus:ring-[3px] focus:ring-ring/35 group-data-[invalid=true]/field:border-[oklch(var(--st-dot-l)_var(--st-dot-c)_27)]"
export const textareaCls = cn(inputCls, "h-auto min-h-[86px] resize-y py-[9px] leading-[1.45]")

/** Label row (required star, optional tag and right slot), the control, then an error or hint. */
export function Field({ label, req, hint, error, right, tag, children, className }: {
    label?: React.ReactNode
    req?: boolean
    hint?: React.ReactNode
    error?: string | null
    right?: React.ReactNode
    tag?: React.ReactNode
    children: React.ReactNode
    className?: string
}) {
    return (
        <div data-invalid={!!error} className={cn("group/field relative grid min-w-0 content-start gap-1.5", className)}>
            {label && (
                <div className="flex items-center gap-1.5 text-[13px] font-medium">
                    <span>{label}{req && <span className="tone-red tone-fg ml-0.5">*</span>}</span>
                    {tag}
                    {right && <span className="ml-auto">{right}</span>}
                </div>
            )}
            {children}
            {error ? (
                <div key={error} className="tone-red tone-fg flex animate-fm-err items-start gap-[5px] text-xs leading-[1.35]"><IconAlertCircle size={14} className="flex-none" />{error}</div>
            ) : hint ? (
                <div className="text-xs leading-[1.35] text-subtle-foreground">{hint}</div>
            ) : null}
        </div>
    )
}

/** Uppercase mono divider label between groups of fields. */
export const Section = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-1 flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[.06em] text-subtle-foreground after:h-px after:flex-1 after:bg-border">{children}</div>
)

/** Two columns on wide dialogs, one on phones. */
export const Grid2 = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 gap-x-3.5 gap-y-4 min-[560px]:grid-cols-2">{children}</div>
)

/** Inline callout. */
export function Note({ tone, icon: I, children }: { tone?: "amber" | "green" | "red"; icon?: Icon; children: React.ReactNode }) {
    return (
        <div className={cn("flex animate-pm-in items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] leading-[1.45]", tone ? `tone-${tone} tone-bg` : "bg-surface-2")}>
            {I && <I size={17} className={cn("flex-none self-start", tone ? "tone-fg" : "text-subtle-foreground")} />}
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    )
}

/** Server error shown above the footer. */
export const FormError = ({ message }: { message: string | null }) =>
    message ? <Note tone="red" icon={IconAlertCircle}>{message}</Note> : null

// ── Footer & buttons ──────────────────────────────────────────────────────────

export const Kbd = ({ children }: { children: React.ReactNode }) => (
    <span className="rounded border bg-surface-2 px-[5px] py-0.5 font-mono text-[11px] font-medium text-subtle-foreground">{children}</span>
)

export const Spinner = () => <span className="size-3.5 flex-none animate-spin rounded-full border-2 border-current border-r-transparent" />

/** Footer: keyboard hints (or a custom left slot), then Cancel and the given actions. */
export function FormFoot({ onClose, left, children }: { onClose: () => void; left?: React.ReactNode; children?: React.ReactNode }) {
    return (
        <>
            {left !== undefined ? left : (
                <span className="hidden items-center gap-1 text-xs text-subtle-foreground sm:flex"><Kbd>⌘</Kbd><Kbd>↵</Kbd>save<span className="ml-2"><Kbd>esc</Kbd></span>close</span>
            )}
            <span className="flex-1" />
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            {children}
        </>
    )
}

export function SubmitButton({ busy, children, onClick, danger, disabled }: {
    busy?: boolean
    children: React.ReactNode
    onClick: () => void
    danger?: boolean
    disabled?: boolean
}) {
    return (
        <Button type="button" variant={danger ? "destructive" : "default"} onClick={onClick} disabled={disabled} className={cn("min-w-[124px]", busy && "pointer-events-none")}>
            {busy && <Spinner />}
            {busy ? "Saving…" : children}
        </Button>
    )
}

/** Small toggle switch with a label. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: React.ReactNode }) {
    return (
        <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-muted-foreground">
            <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
            <span className="relative h-[18px] w-[30px] rounded-full bg-border-strong transition-colors duration-base after:absolute after:left-0.5 after:top-0.5 after:size-3.5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-slow after:ease-spring peer-checked:bg-primary peer-checked:after:translate-x-3 peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/35" />
            {label}
        </label>
    )
}

/** Radio group drawn as status/priority badges. */
export function Pills<T extends StatusKey>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly T[] }) {
    return (
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
            {options.map((o) => {
                const on = value === o
                return (
                    <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        key={o}
                        onClick={() => onChange(o)}
                        className={cn(
                            "group/pill flex rounded-[9px] border bg-card p-[3px] transition duration-fast active:scale-[.96] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
                            on && "border-primary shadow-[inset_0_0_0_1px_oklch(var(--primary))]",
                        )}
                    >
                        <StatusBadge value={o} className={cn("transition-opacity duration-fast", on ? "opacity-100" : "opacity-55 group-hover/pill:opacity-100")} />
                    </button>
                )
            })}
        </div>
    )
}

/** Rounded chip button, e.g. quick dates or quick replies. */
export function Chip({ on, onClick, children }: { on?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "h-7 rounded-full border px-2.5 text-[12.5px] font-medium transition-all duration-fast",
                on ? "border-transparent bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
        >
            {children}
        </button>
    )
}

/** Wraps a field so it flashes when a typed token (e.g. "!urgent") fills it. */
export function Flash({ n, children }: { n: number; children: React.ReactNode }) {
    return <div key={n} className={cn("rounded-lg", n > 0 && "animate-fm-flash")}>{children}</div>
}
