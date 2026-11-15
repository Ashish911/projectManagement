import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen } from "@testing-library/react"
import { BrandLogo } from "./brand"

describe("BrandLogo (BRD-01)", () => {
    it("🟢 full logo by default", () => {
        render(<BrandLogo />)
        expect(screen.getByRole("img", { name: "ProjoMan" })).toHaveAttribute("src", "/brand/projoman-logo.png")
    })

    it("🟢 the small mark for tight spots (collapsed sidebar)", () => {
        render(<BrandLogo variant="icon" />)
        expect(screen.getByRole("img", { name: "ProjoMan" })).toHaveAttribute("src", "/brand/projoman-icon.png")
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
