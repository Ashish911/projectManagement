import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { BrandLogo } from "./brand"

describe("BrandLogo", () => {
    it("🟢 the app mark next to the ProjoMan wordmark, as one link-sized lockup", () => {
        render(<BrandLogo />)
        expect(screen.getByRole("img", { name: "" , hidden: true })).toHaveAttribute("src", "/brand/projoman-icon.png")
        expect(screen.getByText("ProjoMan")).toBeInTheDocument()
    })

    it("🟢 the wordmark can be hidden (collapsed sidebar) without losing the accessible name", () => {
        render(<BrandLogo wordmarkClassName="hidden" />)
        expect(screen.getByLabelText("ProjoMan")).toBeInTheDocument()
    })
})

describe("index.html (BRD-01)", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8") // Vitest runs from frontend/

    it("🟢 uses the ProjoMan favicon and touch icon", () => {
        expect(html).toContain('href="/favicon-32.png"')
        expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"')
        expect(html).toContain("<title>ProjoMan</title>")
    })

    it("🔴 no Vite default favicon", () => {
        expect(html).not.toContain("vite.svg")
    })
})
