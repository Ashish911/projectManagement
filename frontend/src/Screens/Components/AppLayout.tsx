import { useOutlet } from "react-router-dom"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/Screens/Components/app-sidebar"
import { SiteHeader } from "@/Screens/Components/site-header"
import { PageTransition } from "@/components/pm/page-transition"
import { FormsProvider } from "@/components/forms/form-host"
import { useLiveRefresh } from "@/hooks/use-live-refresh"

/** Shell for every signed-in page; stays mounted while the routed content below it changes. */
export function AppLayout() {
    // useOutlet (not <Outlet/>) freezes the old page during its exit animation
    const outlet = useOutlet()
    // Refetch when notifications arrive, other tabs change data, or this tab regains focus
    useLiveRefresh()

    return (
        <FormsProvider>
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "14.5rem", // 232px, as in the design
                    "--sidebar-width-icon": "4rem", // Collapsed icon rail
                    "--header-height": "3.5rem",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="sidebar" collapsible="icon" />
            <SidebarInset>
                <SiteHeader />
                <PageTransition>{outlet}</PageTransition>
            </SidebarInset>
        </SidebarProvider>
        </FormsProvider>
    )
}
