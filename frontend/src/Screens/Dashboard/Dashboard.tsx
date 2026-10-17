import { useSelector } from "react-redux"
import { AdminDashboard } from "@/Screens/Dashboard/dashboard/AdminDashboard"
import { MemberDashboard } from "@/Screens/Dashboard/dashboard/MemberDashboard"

export const Dashboard: React.FC = () => {
    const role = useSelector((state: any) => state.profile.profile?.role)
    if (!role) return null // Profile still loading; the sidebar shows its own skeleton
    return role === "USER" ? <MemberDashboard /> : <AdminDashboard />
}
