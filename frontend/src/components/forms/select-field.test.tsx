import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SelectField } from "./form-kit"
import { PhoneInput } from "./phone-input"

/** Our own chevron, inside the field, instead of the browser's (which sat on the edge). */
const hasOwnChevron = (select: HTMLElement) =>
    select.classList.contains("appearance-none") && !!select.parentElement!.querySelector("svg[data-chevron]")

describe("SelectField", () => {
    it("🟢 a native select with a centred chevron of our own", async () => {
        const onChange = vi.fn()
        render(<SelectField label="Due date" value="" onChange={onChange} options={[["", "Any"], ["overdue", "Overdue"]]} />)
        const select = screen.getByRole("combobox", { name: "Due date" })
        expect(hasOwnChevron(select)).toBe(true)
        await userEvent.selectOptions(select, "overdue")
        expect(onChange).toHaveBeenCalledWith("overdue")
    })

    it("🟢 numeric values come back as numbers", async () => {
        const onChange = vi.fn()
        render(<SelectField label="Year" value={1998} onChange={onChange} options={[[1998, "1998"], [1999, "1999"]]} />)
        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Year" }), "1999")
        expect(onChange).toHaveBeenCalledWith(1999)
    })

    it("🟢 the phone country code uses it", () => {
        render(<PhoneInput label="Phone" value="" onChange={vi.fn()} />)
        expect(hasOwnChevron(screen.getByRole("combobox", { name: "Country code" }))).toBe(true)
    })
})
