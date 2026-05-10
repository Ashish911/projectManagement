import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/Screens/Components/app-sidebar"
import { SiteHeader } from "@/Screens/Components/site-header"

export function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "14rem",
                    "--header-height": "3rem",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col p-4 md:p-6 gap-4 md:gap-6">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
