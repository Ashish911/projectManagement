import { AppLayout } from "@/Screens/Components/AppLayout"

export const Users: React.FC = () => {
    return (
        <AppLayout>
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
                <p className="text-muted-foreground text-sm">Manage platform users and their roles.</p>
            </div>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
                Users table coming soon
            </div>
        </AppLayout>
    )
}
