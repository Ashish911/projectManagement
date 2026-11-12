import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"

vi.mock("./use-app-data", async (orig) => ({
    ...(await orig<object>()),
    useAppData: () => ({ profile: { id: "me", role: "USER" }, role: "USER", users: [], projects: [], tasks: [] }),
}))
vi.mock("@/components/hooks/use-theme", () => ({ useTheme: () => ({ theme: "LIGHT", toggle: vi.fn() }) }))

const { CommandPalette } = await import("./command-palette")

const mount = () => render(
    <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
            <Route path="/dashboard" element={<CommandPalette data={{}} onClose={vi.fn()} closing={false} />} />
            <Route path="/guide" element={<h1>Guide page</h1>} />
        </Routes>
    </MemoryRouter>,
)

describe("CommandPalette — finding the Guide (GLB-05)", () => {
    it.each(["guide", "help", "how to"])("🟢 typing “%s” finds the Guide", async (query) => {
        mount()
        await userEvent.type(screen.getByPlaceholderText("Search or type a command…"), query)
        expect(screen.getByText("Guide")).toBeInTheDocument()
    })

    it("🟢 picking it opens the Guide", async () => {
        mount()
        await userEvent.type(screen.getByPlaceholderText("Search or type a command…"), "help{Enter}")
        expect(screen.getByRole("heading", { name: "Guide page" })).toBeInTheDocument()
    })
})
