import { fireEvent, render, screen } from "@testing-library/react"
import { useRef } from "react"
import { useOutside } from "./use-outside"

function Popover({ onOutside, active }: { onOutside: () => void; active: boolean }) {
    const ref = useRef<HTMLDivElement>(null)
    useOutside(ref, onOutside, active)
    return <><div ref={ref}>inside</div><div>outside</div></>
}

describe("useOutside", () => {
    it("🟢 a press outside calls the handler", () => {
        const fn = vi.fn()
        render(<Popover onOutside={fn} active />)
        fireEvent.mouseDown(screen.getByText("outside"))
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it("🔴 a press inside does nothing", () => {
        const fn = vi.fn()
        render(<Popover onOutside={fn} active />)
        fireEvent.mouseDown(screen.getByText("inside"))
        expect(fn).not.toHaveBeenCalled()
    })

    it("🔴 does nothing while inactive", () => {
        const fn = vi.fn()
        render(<Popover onOutside={fn} active={false} />)
        fireEvent.mouseDown(screen.getByText("outside"))
        expect(fn).not.toHaveBeenCalled()
    })

    it("🟢 calls the latest handler after a re-render, not a stale one", () => {
        const first = vi.fn()
        const second = vi.fn()
        const { rerender } = render(<Popover onOutside={first} active />)
        rerender(<Popover onOutside={second} active />)
        fireEvent.mouseDown(screen.getByText("outside"))
        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
    })
})
