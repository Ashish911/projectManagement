import React from "react";
import { AppLayout } from "@/Screens/Components/AppLayout";
import { AnalyticsDashboard } from "@/Screens/Components/AnalyticsDashboard";

export const Analytics: React.FC = () => {
    return (
        <AppLayout>
            <AnalyticsDashboard />
        </AppLayout>
    );
};
