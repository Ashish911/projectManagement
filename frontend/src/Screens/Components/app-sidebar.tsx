import * as React from "react"
import { Link } from "react-router-dom"
import {
    IconBuilding,
    IconChartBar,
    IconFolder,
    IconHelpCircle,
    IconLayoutDashboard,
    IconListDetails,
    IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/Screens/Components/nav-main"
import { NavUser } from "@/Screens/Components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from "@/components/ui/sidebar"
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchProfile } from "@/redux/actions/userActions.ts";
import { fetchPreference } from "@/redux/actions/preferenceActions.ts";

// Kanban is reachable at /kanban but no longer listed; the Tasks board replaces it in the redesign
export const NAV_BY_ROLE = {
    SUPER_ADMIN: [
        { title: "Dashboard", url: "/dashboard", icon: IconLayoutDashboard },
        { title: "Users",     url: "/users",     icon: IconUsers },
        { title: "Clients",   url: "/clients",   icon: IconBuilding },
        { title: "Projects",  url: "/projects",  icon: IconFolder },
        { title: "Tasks",     url: "/tasks",     icon: IconListDetails },
        { title: "Guide",     url: "/guide",     icon: IconHelpCircle },
    ],
    CLIENT_ADMIN: [
        { title: "Dashboard", url: "/dashboard", icon: IconLayoutDashboard },
        { title: "Clients",   url: "/clients",   icon: IconBuilding },
        { title: "Projects",  url: "/projects",  icon: IconFolder },
        { title: "Tasks",     url: "/tasks",     icon: IconListDetails },
        { title: "Analytics", url: "/analytics", icon: IconChartBar },
        { title: "Guide",     url: "/guide",     icon: IconHelpCircle },
    ],
    USER: [
        { title: "Dashboard", url: "/dashboard", icon: IconLayoutDashboard },
        { title: "Projects",  url: "/projects",  icon: IconFolder },
        { title: "Tasks",     url: "/tasks",     icon: IconListDetails },
        { title: "Guide",     url: "/guide",     icon: IconHelpCircle },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const dispatch = useDispatch();
    const { profile } = useSelector((state: any) => state.profile);
    const { preference } = useSelector((state: any) => state.preference);

    useEffect(() => {
        if (!profile) dispatch(fetchProfile() as any);
        if (!preference) dispatch(fetchPreference() as any);
    }, [dispatch])

    const role = profile?.role ?? "USER"
    const navItems = NAV_BY_ROLE[role as keyof typeof NAV_BY_ROLE] ?? NAV_BY_ROLE.USER

    return (
        <Sidebar {...props}>
            <SidebarHeader className="px-3 pb-1 pt-3.5">
                <Link to="/dashboard" className="flex items-center gap-2.5 px-2 pb-3.5 pt-1.5 text-base font-semibold tracking-[-0.02em] text-foreground hover:no-underline group-data-[collapsible=icon]:px-1.5">
                    {/* Ring logo: accent ring around a dark core */}
                    <span className="size-[22px] flex-none rounded-full border-[5px] border-primary [box-shadow:inset_0_0_0_3px_oklch(var(--background)),inset_0_0_0_10px_oklch(var(--foreground))]" />
                    <span className="truncate transition-opacity group-data-[collapsible=icon]:opacity-0">ProjoMan</span>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter className="border-t px-1.5 py-2.5">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    )
}
