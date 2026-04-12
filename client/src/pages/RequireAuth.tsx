import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, useRole } from "../auth/AuthContext";
import type { UserRole } from "../types";

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { state } = useAuth();
  const role = useRole();

  if (state.status === "loading") return <p>Загрузка…</p>;
  if (state.status === "anonymous") return <Navigate to="/login" replace />;

  if (roles && role && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
