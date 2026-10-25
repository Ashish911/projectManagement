import { type Icon } from "@tabler/icons-react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "motion/react"

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
        <SidebarGroup className="px-3 py-0">
            <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                    {items.map((item) => {
                        // Sub-pages (e.g. /projects/:id) keep their section highlighted
                        const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/")
                        return (
                            <SidebarMenuItem key={item.title}>
                                {/* Shared layoutId makes the highlight slide between items */}
                                {isActive && (
                                    <motion.span
                                        layoutId="nav-pill"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        className="absolute inset-0 rounded-lg bg-card shadow-sm ring-1 ring-border"
                                    />
                                )}
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    isActive={isActive}
                                    onClick={() => navigate(item.url)}
                                    className="relative h-9 cursor-pointer gap-[11px] rounded-lg px-2.5 text-[13.5px] font-medium text-muted-foreground transition-colors duration-fast hover:bg-surface-2 hover:text-foreground data-[active=true]:bg-transparent data-[active=true]:text-foreground [&>svg]:size-[18px] data-[active=true]:[&>svg]:text-primary"
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
