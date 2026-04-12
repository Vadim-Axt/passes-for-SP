import { useAuth } from "../auth/AuthContext";

export function ProfilePage() {
  const { state } = useAuth();
  if (state.status !== "authenticated") return null;

  return (
    <div>
      <h1>Профиль</h1>
      <dl style={{ display: "grid", gap: 8, marginTop: 16, maxWidth: 480 }}>
        <dt style={{ color: "#64748b" }}>ФИО</dt>
        <dd style={{ margin: 0 }}>{state.me.fullName}</dd>
        <dt style={{ color: "#64748b" }}>Email</dt>
        <dd style={{ margin: 0 }}>{state.me.email}</dd>
        <dt style={{ color: "#64748b" }}>Роль</dt>
        <dd style={{ margin: 0 }}>{state.me.role}</dd>
        {state.me.apartments.length > 0 && (
          <>
            <dt style={{ color: "#64748b" }}>Квартиры</dt>
            <dd style={{ margin: 0 }}>{state.me.apartments.map((a) => a.label).join(", ")}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
