import { IconDotsVertical } from "@tabler/icons-react"
import { useSelector } from "react-redux"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Avatar } from "@/components/pm/avatar"
import { useForms } from "@/components/forms/forms-context"

/** Signed-in user at the bottom of the sidebar; opens the account menu. */
export function NavUser() {
    const openForm = useForms()
    const { profile, loading, error } = useSelector((state: any) => state.profile)

    if (loading) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" className="animate-pulse">
                        <div className="size-8 rounded-full bg-muted" />
                        <div className="grid flex-1 gap-1 text-left text-sm leading-tight">
                            <div className="h-4 w-24 rounded bg-muted" />
                            <div className="h-3 w-32 rounded bg-muted" />
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    if (error) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg">
                        <Avatar name="!" size={32} />
                        <span className="tone-red tone-fg text-xs">Error loading profile</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" onClick={() => openForm("account")} className="cursor-pointer gap-2.5 hover:bg-surface-2 group-data-[collapsible=icon]:!p-0" aria-label="Account menu">
                    <Avatar name={profile?.name} seed={profile?.id} size={32} />
                    <div className="grid min-w-0 flex-1 text-left leading-tight">
                        <span className="truncate text-[13px] font-semibold">{profile?.name}</span>
                        <span className="truncate text-xs text-subtle-foreground">{profile?.email}</span>
                    </div>
                    <IconDotsVertical className="ml-auto size-4 text-subtle-foreground" />
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
