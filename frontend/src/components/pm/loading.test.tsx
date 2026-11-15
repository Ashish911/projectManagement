import { render, screen } from "@testing-library/react"
import { Loading } from "./loading"

describe("Loading", () => {
    it.each(["table", "cards", "board", "panel", "lines"] as const)("🟢 %s is announced as a status with its label", (kind) => {
        render(<Loading kind={kind} label="Loading users" />)
        const status = screen.getByRole("status", { name: "Loading users" })
        expect(status).toHaveAttribute("aria-busy", "true")
        expect(status.querySelectorAll("[data-skeleton]").length).toBeGreaterThan(0)
    })

    it("🟢 table shows the requested number of rows", () => {
        render(<Loading kind="table" rows={4} label="Loading users" />)
        expect(screen.getByRole("status").querySelectorAll("[data-row]")).toHaveLength(4)
    })
})

describe("RefreshBar (LDR-01)", () => {
    it("🟢 shows a refreshing status while busy", async () => {
        const { RefreshBar } = await import("./loading")
        render(<RefreshBar busy />)
        expect(screen.getByRole("status", { name: "Refreshing" })).toBeInTheDocument()
    })

    it("🔴 renders nothing when idle", async () => {
        const { RefreshBar } = await import("./loading")
        render(<RefreshBar busy={false} />)
        expect(screen.queryByRole("status")).not.toBeInTheDocument()
    })
})
