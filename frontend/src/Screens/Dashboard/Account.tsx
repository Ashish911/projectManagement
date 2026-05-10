import React from "react";
import { AppLayout } from "@/Screens/Components/AppLayout";
import ProfileHeader from "@/Screens/Components/profile-header";
import ProfileContent from "@/Screens/Components/profile-content";

export const Account: React.FC = () => {
  return (
    <AppLayout>
      <ProfileHeader />
      <ProfileContent />
    </AppLayout>
  );
};
