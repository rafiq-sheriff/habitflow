import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AuthPage } from "@/pages/AuthPage";
import { AppShell } from "@/components/Layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { DailyFormPage } from "@/pages/DailyFormPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { QuestionsPage } from "@/pages/QuestionsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <div style={{ width: "100%", minHeight: "100vh" }}>
        <AuthPage />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="daily" element={<DailyFormPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="questions" element={<QuestionsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
