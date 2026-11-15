import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Combo } from "./combo"

const options = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]

describe("Combo — layering (PROF-07)", () => {
    it("🟢 the list renders in a portal on the shared popover layer", async () => {
        const { container } = render(<Combo value="" onChange={vi.fn()} options={options} />)
        await userEvent.click(screen.getByRole("button", { name: /Select/ }))
        const list = screen.getByRole("listbox")
        expect(container.contains(list)).toBe(false)
        expect(list.closest(".z-popover")).not.toBeNull()
    })

    it("🟢 picking from the portalled list still works", async () => {
        const onChange = vi.fn()
        render(<Combo value="" onChange={onChange} options={options} />)
        await userEvent.click(screen.getByRole("button", { name: /Select/ }))
        await userEvent.click(screen.getByRole("option", { name: "Beta" }))
        expect(onChange).toHaveBeenCalledWith("b")
    })

    it("🔴 typing in the portalled search box doesn't close it", async () => {
        render(<Combo value="" onChange={vi.fn()} options={options} />)
        await userEvent.click(screen.getByRole("button", { name: /Select/ }))
        await userEvent.click(screen.getByPlaceholderText("Search…"))
        await userEvent.type(screen.getByPlaceholderText("Search…"), "be")
        expect(screen.getAllByRole("option")).toHaveLength(1)
    })
})
