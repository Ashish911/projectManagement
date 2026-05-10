import { AppLayout } from "@/Screens/Components/AppLayout"

export const Projects: React.FC = () => {
    return (
        <AppLayout>
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
                <p className="text-muted-foreground text-sm">Browse and manage projects.</p>
            </div>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
                Projects list coming soon
            </div>
        </AppLayout>
    )
}
