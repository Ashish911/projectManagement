/** True if the form field holding `el` spans its whole row: not one of two columns (PROF-06). */
export function onOwnRow(el: HTMLElement): boolean {
    const field = el.closest("[data-invalid], .space-y-1\\.5") as HTMLElement | null
    if (!field) return false
    const parent = field.parentElement!
    const twoCols = /grid-cols-2/.test(parent.className)
    return !twoCols || field.classList.contains("col-span-full")
}
