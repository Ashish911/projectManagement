import { AppLayout } from "@/Screens/Components/AppLayout"

export const Tasks: React.FC = () => {
    return (
        <AppLayout>
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
                <p className="text-muted-foreground text-sm">View tasks and sub-tasks assigned to you.</p>
            </div>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
                Tasks board coming soon
            </div>
        </AppLayout>
    )
}
