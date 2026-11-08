import { useMemo, useState } from "react"

/**
 * Checkbox selection over a list of ids (e.g. table rows).
 * Ids that disappear from `ids` (filtered out or deleted) drop out of the selection.
 */
export function useSelection(ids: string[]) {
    const [picked, setPicked] = useState<Set<string>>(new Set())
    const selected = useMemo(() => ids.filter((id) => picked.has(id)), [ids, picked])
    const allSelected = ids.length > 0 && selected.length === ids.length

    const toggle = (id: string) =>
        setPicked((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    const toggleAll = () => setPicked(allSelected ? new Set() : new Set(ids))
    const clear = () => setPicked(new Set())

    return {
        selected,
        isSelected: (id: string) => picked.has(id),
        toggle,
        toggleAll,
        clear,
        allSelected,
        mixed: selected.length > 0 && !allSelected,
    }
}
