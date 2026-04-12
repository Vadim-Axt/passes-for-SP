import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { AdminPage } from "./pages/AdminPage";
import { CreatePassPage } from "./pages/CreatePassPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PassDetailPage } from "./pages/PassDetailPage";
import { PassesActivePage, PassesHistoryPage } from "./pages/PassesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RequireAuth } from "./pages/RequireAuth";
import { SecurityPage } from "./pages/SecurityPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <RequireAuth>
                  <HomePage />
                </RequireAuth>
              }
            />
            <Route
              path="/passes/active"
              element={
                <RequireAuth roles={["RESIDENT"]}>
                  <PassesActivePage />
                </RequireAuth>
              }
            />
            <Route
              path="/passes/history"
              element={
                <RequireAuth roles={["RESIDENT"]}>
                  <PassesHistoryPage />
                </RequireAuth>
              }
            />
            <Route
              path="/passes/new"
              element={
                <RequireAuth roles={["RESIDENT", "ADMIN"]}>
                  <CreatePassPage />
                </RequireAuth>
              }
            />
            <Route
              path="/passes/:id"
              element={
                <RequireAuth>
                  <PassDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/security"
              element={
                <RequireAuth roles={["SECURITY", "ADMIN"]}>
                  <SecurityPage />
                </RequireAuth>
              }
            />
            <Route
              path="/notifications"
              element={
                <RequireAuth>
                  <NotificationsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth roles={["ADMIN"]}>
                  <AdminPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
