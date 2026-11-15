import { birthDate } from "./dates"
import { fromYmd } from "@/components/forms/date-picker"

const epoch = String(Date.UTC(1998, 2, 14)) // How the API sends a stored date of birth

describe("birthDate (PROF-09)", () => {
    it.each([
        ["a date-only string", "1998-03-14"],
        ["an epoch-ms string from the API", epoch],
        ["an ISO string", "1998-03-14T00:00:00.000Z"],
    ])("🟢 %s reads as a plain date", (_, v) => {
        expect(birthDate(v)).toBe("14 Mar 1998")
    })

    it("🔴 nothing, or junk, is an empty string — never relative time", () => {
        expect(birthDate(null)).toBe("")
        expect(birthDate("")).toBe("")
        expect(birthDate("soon")).toBe("")
    })
})

describe("fromYmd (PROF-09)", () => {
    it("🟢 an API date of birth opens the picker on the same calendar day", () => {
        expect(fromYmd(epoch)).toEqual(new Date(1998, 2, 14))
    })
})
