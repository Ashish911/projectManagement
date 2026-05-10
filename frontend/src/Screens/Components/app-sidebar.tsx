"use client"

import * as React from "react"
import {
    IconChartBar,
    IconDashboard,
    IconFolder,
    IconInnerShadowTop,
    IconListDetails,
    IconUsers,
    IconBuilding,
} from "@tabler/icons-react"

import { NavMain } from "@/Screens/Components/nav-main"
import { NavUser } from "@/Screens/Components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchProfile } from "@/redux/actions/userActions.ts";
import { fetchPreference } from "@/redux/actions/preferenceActions.ts";

const NAV_BY_ROLE = {
    SUPER_ADMIN: [
        { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
        { title: "Users",     url: "/users",     icon: IconUsers },
        { title: "Clients",   url: "/clients",   icon: IconBuilding },
        { title: "Projects",  url: "/projects",  icon: IconFolder },
        { title: "Tasks",     url: "/tasks",     icon: IconListDetails },
    ],
    CLIENT_ADMIN: [
        { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
        { title: "Projects",  url: "/projects",  icon: IconFolder },
        { title: "Tasks",     url: "/tasks",     icon: IconListDetails },
        { title: "Analytics", url: "/analytics", icon: IconChartBar },
    ],
    USER: [
        { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
        { title: "Projects",  url: "/projects",  icon: IconFolder },
        { title: "Tasks",     url: "/tasks",     icon: IconListDetails },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const dispatch = useDispatch();
    const { profile } = useSelector((state: any) => state.profile);

    useEffect(() => {
        dispatch(fetchProfile() as any);
        dispatch(fetchPreference() as any);
    }, [dispatch])

    const role = profile?.role ?? "USER"
    const navItems = NAV_BY_ROLE[role as keyof typeof NAV_BY_ROLE] ?? NAV_BY_ROLE.USER

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="/dashboard">
                                <IconInnerShadowTop className="!size-5" />
                                <span className="text-base font-semibold">ProjoMan</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    )
}
