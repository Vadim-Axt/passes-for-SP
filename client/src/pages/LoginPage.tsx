import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, state } = useAuth();
  const [email, setEmail] = useState("resident@demo.local");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (state.status === "authenticated") {
    return <Navigate to="/" replace />;
  }
  if (state.status === "loading") {
    return <p>Загрузка…</p>;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "3rem auto" }}>
      <h1>Вход</h1>
      <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
        Демо: <code>resident@demo.local</code>, <code>security@demo.local</code>, <code>admin@demo.local</code> — пароль{" "}
        <code>demo123</code>
      </p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Пароль
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {error && <div style={{ color: "#b91c1c", fontSize: "0.9rem" }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ padding: "0.65rem", borderRadius: 8 }}>
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
