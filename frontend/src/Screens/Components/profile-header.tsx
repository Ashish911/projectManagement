import { useSelector } from "react-redux";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Calendar } from "lucide-react";

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    CLIENT_ADMIN: "Client Admin",
    USER: "User",
};

export default function ProfileHeader() {
    const { profile } = useSelector((state: any) => state.profile);

    const initials = profile?.name ? getInitials(profile.name) : "?";
    const roleLabel = ROLE_LABELS[profile?.role] ?? profile?.role ?? "—";

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
                    <Avatar className="h-20 w-20">
                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <h1 className="text-2xl font-bold">{profile?.name ?? "—"}</h1>
                            <Badge variant="secondary">{roleLabel}</Badge>
                        </div>
                        <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                                <Mail className="size-4" />
                                {profile?.email ?? "—"}
                            </div>
                            {profile?.number && (
                                <div className="flex items-center gap-1.5">
                                    <Phone className="size-4" />
                                    {profile.number}
                                </div>
                            )}
                            {profile?.dob && (
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="size-4" />
                                    {profile.dob}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
