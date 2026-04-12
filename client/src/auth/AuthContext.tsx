import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "../api";
import type { Me, UserRole } from "../types";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; me: Me };

const AuthContext = createContext<{
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setState({ status: "anonymous" });
      return;
    }
    try {
      const me = await api.me();
      setState({ status: "authenticated", me });
    } catch {
      setToken(null);
      setState({ status: "anonymous" });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.login(email, password);
    setToken(r.token);
    const me = await api.me();
    setState({ status: "authenticated", me });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setState({ status: "anonymous" });
  }, []);

  const value = useMemo(() => ({ state, login, logout, refresh }), [state, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

export function useRole(): UserRole | null {
  const { state } = useAuth();
  if (state.status !== "authenticated") return null;
  return state.me.role;
}
