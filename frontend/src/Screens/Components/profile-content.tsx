import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { savePreference } from "@/redux/actions/preferenceActions";
import { updateProfile } from "@/api/userApi";
import { USER_PROFILE_SUCCESS } from "@/redux/constants/userConstants";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, X } from "lucide-react";

const GENDER_OPTIONS = [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHERS", label: "Others" },
];

const GENDER_LABELS: Record<string, string> = {
    MALE: "Male",
    FEMALE: "Female",
    OTHERS: "Others",
};

export default function ProfileContent() {
    const dispatch = useDispatch();
    const { profile } = useSelector((state: any) => state.profile);
    const { preference, loading: prefLoading, saving: prefSaving } = useSelector((state: any) => state.preference);

    // ── preferences state ──────────────────────────────────────────
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

    // ── profile edit state ─────────────────────────────────────────
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", number: "", dob: "", gender: "" });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const startEdit = () => {
        setEditForm({
            name: profile?.name ?? "",
            number: profile?.number ?? "",
            dob: profile?.dob ?? "",
            gender: profile?.gender ?? "MALE",
        });
        setSaveError(null);
        setEditing(true);
    };

    const handleProfileSave = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            const updated = await updateProfile(editForm);
            dispatch({ type: USER_PROFILE_SUCCESS, payload: updated });
            setEditing(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (e: any) {
            setSaveError(e.message);
        } finally {
            setSaving(false);
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
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>
                                    {editing ? "Update your personal details below." : "Your personal details."}
                                </CardDescription>
                            </div>
                            {!editing ? (
                                <Button variant="outline" size="sm" onClick={startEdit}>
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                    Edit
                                </Button>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setSaveError(null); }}>
                                    <X className="mr-1.5 h-3.5 w-3.5" />
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {editing ? (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-name">Full Name</Label>
                                        <Input
                                            id="edit-name"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-email">Email</Label>
                                        <Input id="edit-email" value={profile?.email ?? ""} readOnly disabled />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-phone">Phone</Label>
                                        <Input
                                            id="edit-phone"
                                            value={editForm.number}
                                            onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-dob">Date of Birth</Label>
                                        <Input
                                            id="edit-dob"
                                            value={editForm.dob}
                                            onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Gender</Label>
                                        <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {GENDER_OPTIONS.map((g) => (
                                                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                                <div className="flex items-center gap-3">
                                    <Button onClick={handleProfileSave} disabled={saving || !editForm.name}>
                                        {saving ? "Saving…" : "Save Changes"}
                                    </Button>
                                    {saveSuccess && <span className="text-sm text-green-600">Saved successfully</span>}
                                </div>
                            </>
                        ) : (
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
                        )}
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
