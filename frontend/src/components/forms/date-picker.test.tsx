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

describe("DatePicker — birthdate display (PROF-09)", () => {
    it("🟢 shows a plain date, never 'days ago'", () => {
        render(<DatePicker birthdate quick="none" value={new Date(1998, 2, 14)} onChange={vi.fn()} />)
        expect(screen.getByRole("button", { name: /14 Mar 1998/ })).toBeInTheDocument()
        expect(screen.queryByText(/ago/)).not.toBeInTheDocument()
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

describe("DatePicker — day states (PROF-08)", () => {
    const cell = (d: Date) => screen.getByRole("button", { name: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) })

    it("🟢 today is marked as the current date; the picked day is pressed", async () => {
        await open()
        const today = cell(daysFromToday(0))
        expect(today).toHaveAttribute("aria-current", "date")
        expect(today).toHaveAttribute("data-today")
    })

    it("🟢 days before today are marked past for due dates", async () => {
        await open()
        const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        if (first < daysFromToday(0)) expect(cell(first)).toHaveAttribute("data-past")
    })

    it("🔴 but not for a date of birth, where every day is in the past", async () => {
        render(<DatePicker birthdate quick="none" value={new Date(1998, 2, 14)} onChange={vi.fn()} />)
        await userEvent.click(screen.getByRole("button", { name: /14 Mar 1998/ }))
        expect(cell(new Date(1998, 2, 10))).not.toHaveAttribute("data-past")
        expect(cell(new Date(1998, 2, 14))).toHaveAttribute("aria-pressed", "true")
    })

    it("🟢 days outside the shown month are marked as such", async () => {
        render(<DatePicker birthdate quick="none" value={new Date(1998, 2, 14)} onChange={vi.fn()} />)
        await userEvent.click(screen.getByRole("button", { name: /14 Mar 1998/ }))
        expect(cell(new Date(1998, 1, 23))).toHaveAttribute("data-outside")
    })
})
