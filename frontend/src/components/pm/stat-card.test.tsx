import { render, screen } from "@testing-library/react"
import { IconUsers } from "@tabler/icons-react"
import { StatCard } from "./stat-card"

describe("StatCard (LDR-01)", () => {
    it("🟢 shows a skeleton instead of a number while loading", () => {
        render(<StatCard label="Users" icon={IconUsers} value={0} loading />)
        expect(screen.getByRole("status", { name: "Loading Users" })).toBeInTheDocument()
        expect(screen.queryByText("0")).not.toBeInTheDocument()
    })

    it("🔴 a loaded zero is still a zero", () => {
        render(<StatCard label="Users" icon={IconUsers} value={0} />)
        expect(screen.queryByRole("status")).not.toBeInTheDocument()
    })
})
