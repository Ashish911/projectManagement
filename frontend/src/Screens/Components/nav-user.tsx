"use client"

import {
    IconDotsVertical,
    IconLogout,
    IconUserCircle,
} from "@tabler/icons-react"

import {
    Avatar,
    AvatarFallback,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

import { useDispatch, useSelector } from "react-redux"
import { logout } from "@/redux/actions/authActions.ts"
import { useNavigate } from "react-router-dom"

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

export function NavUser() {
    const { isMobile } = useSidebar()
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const { profile, loading, error } = useSelector((state: any) => state.profile)

    const initials = profile?.name ? getInitials(profile.name) : "?"

    if (loading) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" className="animate-pulse">
                        <div className="h-8 w-8 rounded-lg bg-muted" />
                        <div className="grid flex-1 text-left text-sm leading-tight gap-1">
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
                        <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarFallback>!</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-red-500">Error loading profile</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{profile?.name}</span>
                                <span className="text-muted-foreground truncate text-xs">{profile?.email}</span>
                            </div>
                            <IconDotsVertical className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{profile?.name}</span>
                                    <span className="text-muted-foreground truncate text-xs">{profile?.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => navigate("/account")}>
                                <IconUserCircle />
                                Account
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => dispatch(logout() as any)}>
                            <IconLogout />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
