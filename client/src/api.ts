const TOKEN_KEY = "passapp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error ?? res.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: number; email: string; fullName: string; role: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  me: () => request<import("./types").Me>("/api/auth/me"),
  passes: (q?: string, opts?: { security?: boolean }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (opts?.security) p.set("security", "1");
    const qs = p.toString();
    return request<import("./types").Pass[]>(`/api/passes${qs ? `?${qs}` : ""}`);
  },
  passesActive: () => request<import("./types").Pass[]>("/api/passes?scope=active"),
  pass: (id: string) => request<import("./types").Pass>(`/api/passes/${id}`),
  createPass: (body: Record<string, unknown>) =>
    request<import("./types").Pass>("/api/passes", { method: "POST", body: JSON.stringify(body) }),
  checkIn: (id: string) => request<{ ok: boolean; status: string }>(`/api/passes/${id}/check-in`, { method: "POST" }),
  rejectPass: (id: string) => request<{ ok: boolean }>(`/api/passes/${id}/reject`, { method: "POST" }),
  cancelPass: (id: string) => request<{ ok: boolean }>(`/api/passes/${id}/cancel`, { method: "POST" }),
  suspendPass: (id: string) => request<{ ok: boolean }>(`/api/passes/${id}/suspend`, { method: "POST" }),
  resumePass: (id: string) => request<{ ok: boolean }>(`/api/passes/${id}/resume`, { method: "POST" }),
  notifications: () => request<import("./types").NotificationRow[]>("/api/notifications"),
  markRead: (id: number) => request<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  adminUsers: () =>
    request<{ id: number; email: string; fullName: string; role: string; createdAt: string }[]>("/api/admin/users"),
  adminApartments: () =>
    request<
      { id: number; label: string; residents: { id: number; email: string; fullName: string }[] }[]
    >("/api/admin/apartments"),
  adminAudit: () =>
    request<
      {
        id: number;
        userId: number | null;
        userEmail: string | null;
        passId: string | null;
        action: string;
        meta: unknown;
        createdAt: string;
      }[]
    >("/api/admin/audit?limit=200"),
  adminCreateApartment: (label: string) =>
    request<{ id: number; label: string }>("/api/admin/apartments", {
      method: "POST",
      body: JSON.stringify({ label }),
    }),
  adminCreateUser: (body: { email: string; password: string; fullName: string; role: string }) =>
    request<{ id: number }>("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
  adminLink: (userId: number, apartmentId: number) =>
    request<{ ok: boolean }>("/api/admin/link-apartment", {
      method: "POST",
      body: JSON.stringify({ userId, apartmentId }),
    }),
};
