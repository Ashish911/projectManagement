import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ActionButton, FormFoot, FormModal, SubmitButton } from "./form-kit"

const Dialog = ({ busy, onClose }: { busy: boolean; onClose: () => void }) => (
    <FormModal title="Edit" onClose={onClose} footer={<FormFoot onClose={onClose}><SubmitButton busy={busy} onClick={() => {}}>Save</SubmitButton></FormFoot>}>
        <p>body</p>
    </FormModal>
)

describe("FormModal while saving (LDR-01)", () => {
    it("🔴 Esc, the backdrop, × and Cancel don't close it mid-request", async () => {
        const onClose = vi.fn()
        render(<Dialog busy onClose={onClose} />)
        fireEvent.keyDown(window, { key: "Escape" })
        fireEvent.mouseDown(screen.getByRole("dialog").parentElement!)
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Close" })).toBeDisabled()
        expect(onClose).not.toHaveBeenCalled()
    })

    it("🟢 once idle it closes as usual", () => {
        const onClose = vi.fn()
        render(<Dialog busy={false} onClose={onClose} />)
        fireEvent.keyDown(window, { key: "Escape" })
        expect(onClose).toHaveBeenCalled()
    })
})

describe("ActionButton (LDR-01)", () => {
    it("🟢 busy: spinner, disabled, keeps its label", async () => {
        const onClick = vi.fn()
        render(<ActionButton busy onClick={onClick}>Unlock</ActionButton>)
        const b = screen.getByRole("button", { name: "Unlock" })
        expect(b).toBeDisabled()
        expect(b).toHaveAttribute("aria-busy", "true")
        await userEvent.click(b)
        expect(onClick).not.toHaveBeenCalled()
    })
})
