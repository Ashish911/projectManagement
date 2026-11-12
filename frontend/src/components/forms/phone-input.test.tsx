import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { PhoneInput, formatPhone, phoneError, toE164 } from "./phone-input"

function Harness({ initial = "", onValue }: { initial?: string; onValue: (v: string) => void }) {
    const [v, setV] = useState(initial)
    return <PhoneInput value={v} onChange={(x) => { setV(x); onValue(x) }} label="Phone" />
}

describe("PhoneInput", () => {
    it("🟢 defaults to Australia and stores E.164", async () => {
        const onValue = vi.fn()
        render(<Harness onValue={onValue} />)
        expect(screen.getByRole("combobox", { name: "Country code" })).toHaveValue("AU")
        await userEvent.type(screen.getByRole("textbox", { name: "Phone" }), "0412 345 678")
        expect(onValue).toHaveBeenLastCalledWith("+61412345678")
    })

    it("🟢 picks up the country of an existing number", () => {
        render(<Harness initial="+9779801234567" onValue={vi.fn()} />)
        expect(screen.getByRole("combobox", { name: "Country code" })).toHaveValue("NP")
        expect(screen.getByRole("textbox", { name: "Phone" })).toHaveValue("980-1234567")
    })

    it("🟢 changing the country re-reads the number", async () => {
        const onValue = vi.fn()
        render(<Harness onValue={onValue} />)
        await userEvent.type(screen.getByRole("textbox", { name: "Phone" }), "2015550123")
        await userEvent.selectOptions(screen.getByRole("combobox", { name: "Country code" }), "US")
        expect(onValue).toHaveBeenLastCalledWith("+12015550123")
    })

    it("🔴 an incomplete number is kept as typed so the form can flag it", async () => {
        const onValue = vi.fn()
        render(<Harness onValue={onValue} />)
        await userEvent.type(screen.getByRole("textbox", { name: "Phone" }), "0412")
        expect(phoneError(onValue.mock.lastCall![0])).toBe("Not a valid Australia number")
    })
})

describe("phone helpers", () => {
    it("🟢 formats E.164 for display", () => {
        expect(formatPhone("+61412345678")).toBe("+61 412 345 678")
        expect(formatPhone("")).toBe("")
        expect(formatPhone("call me")).toBe("call me") // Old free-text values show as they are
    })

    it("🔴 rejects numbers outside the supported countries", () => {
        expect(phoneError("+447911123456")).toBe("Use a number from Australia, New Zealand, the United States or Nepal")
        expect(phoneError("+61412345678")).toBeNull()
    })
})

describe("older numbers without a country code", () => {
    it("🟢 are read as Australian and saved as E.164", () => {
        expect(phoneError("0412 345 678")).toBeNull()
        expect(toE164("0412 345 678")).toBe("+61412345678")
        expect(toE164("AU|0412 345 678")).toBe("+61412345678")
        expect(toE164("+61412345678")).toBe("+61412345678")
    })

    it("🔴 an invalid one is flagged as an Australia number", () => {
        expect(phoneError("12345")).toBe("Not a valid Australia number")
    })
})
