import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar.tsx"
import { SiteHeader } from "@/Screens/Components/site-header.tsx"
import { AppSidebar } from "@/Screens/Components/app-sidebar.tsx"
import ProfileHeader from "@/Screens/Components/profile-header";
import ProfileContent from "@/Screens/Components/profile-content";


interface Props {
    currentLanguage: String;
}

export const Account:React.FC<Props> = () => {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <ProfileHeader />
                            <ProfileContent />
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
};