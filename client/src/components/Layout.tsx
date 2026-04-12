import { NavLink, Outlet } from "react-router-dom";
import { useAuth, useRole } from "../auth/AuthContext";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: "0.5rem 0.75rem",
  borderRadius: 8,
  textDecoration: "none",
  color: isActive ? "#0b1220" : "#334155",
  background: isActive ? "#e2e8f0" : "transparent",
  fontWeight: isActive ? 600 : 400,
});

export function Layout() {
  const { logout, state } = useAuth();
  const role = useRole();

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <header
        style={{
          borderBottom: "1px solid #e2e8f0",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <strong style={{ marginRight: "auto" }}>Пропуска ЖК</strong>
          {state.status === "authenticated" && (
            <>
              <NavLink to="/" end style={linkStyle}>
                Главная
              </NavLink>
              {(role === "RESIDENT" || role === "ADMIN") && (
                <NavLink to="/passes/new" style={linkStyle}>
                  Новый пропуск
                </NavLink>
              )}
              {role === "RESIDENT" && (
                <>
                  <NavLink to="/passes/active" style={linkStyle}>
                    Активные
                  </NavLink>
                  <NavLink to="/passes/history" style={linkStyle}>
                    История
                  </NavLink>
                </>
              )}
              {role === "SECURITY" && (
                <NavLink to="/security" style={linkStyle}>
                  Охрана
                </NavLink>
              )}
              {role === "ADMIN" && (
                <NavLink to="/admin" style={linkStyle}>
                  Админ
                </NavLink>
              )}
              <NavLink to="/notifications" style={linkStyle}>
                Уведомления
              </NavLink>
              <NavLink to="/profile" style={linkStyle}>
                Профиль
              </NavLink>
              <button
                type="button"
                onClick={logout}
                style={{
                  marginLeft: 8,
                  padding: "0.45rem 0.75rem",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Выйти
              </button>
            </>
          )}
        </div>
      </header>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "1rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
