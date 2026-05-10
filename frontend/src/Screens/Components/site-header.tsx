import { useState } from "react"
import { useLocation } from "react-router-dom"
import { IconBell } from "@tabler/icons-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/users":     "Users",
    "/clients":   "Clients",
    "/projects":  "Projects",
    "/tasks":     "Tasks",
    "/account":   "Account",
}

export function SiteHeader() {
    const location = useLocation()
    const title = PAGE_TITLES[location.pathname] ?? "ProjoMan"
    const [open, setOpen] = useState(false)

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                />
                <h1 className="text-base font-medium">{title}</h1>

                <div className="ml-auto flex items-center gap-2">
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative h-8 w-8">
                                <IconBell className="size-4" />
                                {/* Badge — swap with real unread count when wired */}
                                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                                    3
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 p-0">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <span className="text-sm font-semibold">Notifications</span>
                                <button
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setOpen(false)}
                                >
                                    Mark all read
                                </button>
                            </div>
                            <div className="divide-y">
                                <div className="px-4 py-3 hover:bg-muted/50 cursor-pointer">
                                    <p className="text-sm font-medium">Task assigned to you</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">You were assigned "Fix login bug" · 2m ago</p>
                                </div>
                                <div className="px-4 py-3 hover:bg-muted/50 cursor-pointer">
                                    <p className="text-sm font-medium">Project updated</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">ProjoMan v2 project was updated · 1h ago</p>
                                </div>
                                <div className="px-4 py-3 hover:bg-muted/50 cursor-pointer">
                                    <p className="text-sm font-medium">New user registered</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">John Doe joined the platform · 3h ago</p>
                                </div>
                            </div>
                            <div className="border-t px-4 py-2 text-center">
                                <button className="text-xs text-primary hover:underline">
                                    View all notifications
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </header>
    )
}
