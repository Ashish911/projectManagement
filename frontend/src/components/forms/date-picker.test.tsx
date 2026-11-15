import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DatePicker, addMonths, daysFromToday } from "./date-picker"

const open = async (props: Partial<React.ComponentProps<typeof DatePicker>> = {}) => {
    const onChange = vi.fn()
    render(<DatePicker value={null} onChange={onChange} {...props} />)
    await userEvent.click(screen.getByRole("button", { name: /No deadline|No target date|Choose a date/ }))
    return onChange
}

describe("DatePicker — quick picks", () => {
    it("🟢 tasks keep day-scale picks", async () => {
        await open()
        expect(screen.getByRole("button", { name: "Tomorrow" })).toBeInTheDocument()
    })

    it("🟢 projects get project-scale picks (DASH-05)", async () => {
        const onChange = await open({ quick: "project", placeholder: "No target date" })
        expect(screen.getAllByRole("button", { name: /^\+/ }).map((b) => b.textContent)).toEqual(["+1 week", "+2 weeks", "+1 month", "+3 months", "+6 months"])
        expect(screen.queryByRole("button", { name: "Tomorrow" })).not.toBeInTheDocument()
        await userEvent.click(screen.getByRole("button", { name: "+3 months" }))
        expect(onChange).toHaveBeenCalledWith(addMonths(daysFromToday(0), 3))
    })
})

describe("DatePicker — birthdate (PROF-04)", () => {
    it("🟢 no quick picks; jump by year, then pick a day", async () => {
        const onChange = await open({ quick: "none", birthdate: true, placeholder: "Choose a date" })
        expect(screen.queryByRole("button", { name: "Tomorrow" })).not.toBeInTheDocument()
        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Year" }), "1990")
        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Month" }), "4") // May
        await userEvent.click(screen.getByRole("button", { name: "May 14, 1990" }))
        expect(onChange).toHaveBeenCalledWith(new Date(1990, 4, 14))
    })

    it("🔴 future days can't be picked", async () => {
        await open({ quick: "none", birthdate: true, placeholder: "Choose a date" })
        const tomorrow = daysFromToday(1)
        const label = tomorrow.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        const cell = screen.queryByRole("button", { name: label })
        if (cell) expect(cell).toBeDisabled() // Only shown when tomorrow is in the visible month
    })
})

describe("addMonths", () => {
    it("🔴 clamps to the end of a shorter month", () => {
        expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28))
    })
})

describe("DatePicker — layering (PROF-07)", () => {
    it("🟢 the calendar renders in a portal on the shared popover layer", async () => {
        const { container } = render(<DatePicker value={null} onChange={vi.fn()} />)
        await userEvent.click(screen.getByRole("button", { name: /No deadline/ }))
        const cal = screen.getByRole("dialog", { name: "Choose a date" })
        expect(container.contains(cal)).toBe(false)
        expect(cal).toHaveClass("z-popover")
    })

    it("🔴 a click inside the portalled calendar doesn't close it", async () => {
        render(<DatePicker value={null} onChange={vi.fn()} />)
        await userEvent.click(screen.getByRole("button", { name: /No deadline/ }))
        await userEvent.click(screen.getByRole("button", { name: "Next month" }))
        expect(screen.getByRole("dialog", { name: "Choose a date" })).toBeInTheDocument()
    })

    it("🔴 a click outside closes it", async () => {
        render(<><DatePicker value={null} onChange={vi.fn()} /><button>elsewhere</button></>)
        await userEvent.click(screen.getByRole("button", { name: /No deadline/ }))
        await userEvent.click(screen.getByRole("button", { name: "elsewhere" }))
        expect(screen.queryByRole("dialog", { name: "Choose a date" })).not.toBeInTheDocument()
    })
})
