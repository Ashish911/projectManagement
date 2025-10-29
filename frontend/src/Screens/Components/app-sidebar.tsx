"use client"

import * as React from "react"
import {
    // IconCamera,
    IconChartBar,
    IconDashboard,
    // IconDatabase,
    // IconFileAi,
    // IconFileDescription,
    // IconFileWord,
    IconFolder,
    IconHelp,
    IconInnerShadowTop,
    IconListDetails,
    // IconReport,
    // IconSearch,
    IconSettings,
    IconUsers,
} from "@tabler/icons-react"

// import { NavDocuments } from "@/Screens/Components/nav-documents"
import { NavMain } from "@/Screens/Components/nav-main"
import { NavSecondary } from "@/Screens/Components/nav-secondary"
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
import {useDispatch, useSelector} from "react-redux";
import {useEffect} from "react";
import {fetchProfile} from "@/redux/actions/userActions.ts";

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "https://github.com/shadcn.png",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "#",
            icon: IconDashboard,
        },
        {
            title: "Tasks",
            url: "#",
            icon: IconListDetails,
        },
        {
            title: "Analytics",
            url: "#",
            icon: IconChartBar,
        },
        {
            title: "Projects",
            url: "#",
            icon: IconFolder,
        },
        {
            title: "Team",
            url: "#",
            icon: IconUsers,
        },
    ],
    // navClouds: [
    //     {
    //         title: "Capture",
    //         icon: IconCamera,
    //         isActive: true,
    //         url: "#",
    //         items: [
    //             {
    //                 title: "Active Proposals",
    //                 url: "#",
    //             },
    //             {
    //                 title: "Archived",
    //                 url: "#",
    //             },
    //         ],
    //     },
    //     {
    //         title: "Proposal",
    //         icon: IconFileDescription,
    //         url: "#",
    //         items: [
    //             {
    //                 title: "Active Proposals",
    //                 url: "#",
    //             },
    //             {
    //                 title: "Archived",
    //                 url: "#",
    //             },
    //         ],
    //     },
    //     {
    //         title: "Prompts",
    //         icon: IconFileAi,
    //         url: "#",
    //         items: [
    //             {
    //                 title: "Active Proposals",
    //                 url: "#",
    //             },
    //             {
    //                 title: "Archived",
    //                 url: "#",
    //             },
    //         ],
    //     },
    // ],
    navSecondary: [
        {
            title: "Settings",
            url: "#",
            icon: IconSettings,
        },
        {
            title: "Get Help",
            url: "#",
            icon: IconHelp,
        }
    ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(fetchProfile())
    },[])


    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="#">
                                <IconInnerShadowTop className="!size-5" />
                                <span className="text-base font-semibold">Acme Inc.</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
