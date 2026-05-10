import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { savePreference } from "@/redux/actions/preferenceActions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GENDER_LABELS: Record<string, string> = {
    MALE: "Male",
    FEMALE: "Female",
    OTHERS: "Others",
};

export default function ProfileContent() {
    const dispatch = useDispatch();
    const { profile } = useSelector((state: any) => state.profile);
    const { preference, loading: prefLoading, saving: prefSaving } = useSelector((state: any) => state.preference);

    const [theme, setTheme] = useState<"LIGHT" | "DARK">("LIGHT");
    const [language, setLanguage] = useState<"ENGLISH" | "JAPANESE" | "KOREAN">("ENGLISH");
    const [prefSaved, setPrefSaved] = useState(false);

    useEffect(() => {
        if (preference) {
            setTheme(preference.theme);
            setLanguage(preference.language);
        }
    }, [preference]);

    const handleSave = async () => {
        const success = await (dispatch as any)(savePreference({ theme, language }));
        if (success) {
            setPrefSaved(true);
            setTimeout(() => setPrefSaved(false), 2500);
        }
    };

    return (
        <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* ── Profile ──────────────────────────────────────────────────────── */}
            <TabsContent value="profile">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>
                            Your personal details pulled from your account.
                            Profile editing will be available in a future update.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" value={profile?.name ?? ""} readOnly disabled />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={profile?.email ?? ""} readOnly disabled />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" value={profile?.number ?? ""} readOnly disabled />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="dob">Date of Birth</Label>
                                <Input id="dob" value={profile?.dob ?? ""} readOnly disabled />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="gender">Gender</Label>
                                <Input
                                    id="gender"
                                    value={GENDER_LABELS[profile?.gender] ?? profile?.gender ?? ""}
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* ── Preferences ──────────────────────────────────────────────────── */}
            <TabsContent value="preferences">
                <Card>
                    <CardHeader>
                        <CardTitle>Preferences</CardTitle>
                        <CardDescription>
                            Control how ProjoMan looks and feels for you.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {prefLoading ? (
                            <p className="text-sm text-muted-foreground">Loading preferences…</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label>Theme</Label>
                                        <Select value={theme} onValueChange={(v) => setTheme(v as "LIGHT" | "DARK")}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="LIGHT">Light</SelectItem>
                                                <SelectItem value="DARK">Dark</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Language</Label>
                                        <Select value={language} onValueChange={(v) => setLanguage(v as "ENGLISH" | "JAPANESE" | "KOREAN")}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ENGLISH">English</SelectItem>
                                                <SelectItem value="JAPANESE">Japanese</SelectItem>
                                                <SelectItem value="KOREAN">Korean</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button onClick={handleSave} disabled={prefSaving}>
                                        {prefSaving ? "Saving…" : "Save Preferences"}
                                    </Button>
                                    {prefSaved && (
                                        <span className="text-sm text-green-600">Saved successfully</span>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
