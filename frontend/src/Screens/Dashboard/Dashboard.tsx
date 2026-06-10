import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx"
import { SiteHeader } from "@/Screens/Components/site-header.tsx"
import { AppSidebar } from "@/Screens/Components/app-sidebar.tsx"
import { AnalyticsDashboard } from "@/Screens/Components/AnalyticsDashboard.tsx"

export const Dashboard: React.FC = () => {
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
                    <AnalyticsDashboard />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
