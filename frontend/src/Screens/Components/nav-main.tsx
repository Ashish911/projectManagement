"use client"

import { type Icon } from "@tabler/icons-react"
import { useNavigate, useLocation } from "react-router-dom"

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
    items,
}: {
    items: {
        title: string
        url: string
        icon?: Icon
    }[]
}) {
    const navigate = useNavigate()
    const location = useLocation()

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    {items.map((item) => {
                        const isActive = location.pathname === item.url
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    isActive={isActive}
                                    onClick={() => navigate(item.url)}
                                    className="cursor-pointer"
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
