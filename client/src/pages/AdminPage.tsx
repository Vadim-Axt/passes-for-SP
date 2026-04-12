import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";

type Tab = "users" | "apartments" | "audit";

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("apartments");
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<Awaited<ReturnType<typeof api.adminUsers>> | null>(null);
  const [apartments, setApartments] = useState<Awaited<ReturnType<typeof api.adminApartments>> | null>(null);
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof api.adminAudit>> | null>(null);

  const [newApt, setNewApt] = useState("");
  const [nuEmail, setNuEmail] = useState("");
  const [nuName, setNuName] = useState("");
  const [nuPass, setNuPass] = useState("demo123");
  const [nuRole, setNuRole] = useState("RESIDENT");
  const [linkUser, setLinkUser] = useState<number>(0);
  const [linkApt, setLinkApt] = useState<number>(0);

  async function refresh() {
    setError(null);
    try {
      const [u, a, au] = await Promise.all([api.adminUsers(), api.adminApartments(), api.adminAudit()]);
      setUsers(u);
      setApartments(a);
      setAudit(au);
      setLinkUser((id) => id || u[0]?.id || 0);
      setLinkApt((id) => id || a[0]?.id || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreateApt(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminCreateApartment(newApt.trim());
      setNewApt("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function onCreateUser(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminCreateUser({
        email: nuEmail.trim(),
        fullName: nuName.trim(),
        password: nuPass,
        role: nuRole,
      });
      setNuEmail("");
      setNuName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function onLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.adminLink(linkUser, linkApt);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  return (
    <div>
      <h1>Администрирование</h1>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {(["apartments", "users", "audit"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "btn primary" : "btn"}
            onClick={() => setTab(t)}
          >
            {t === "apartments" ? "Квартиры" : t === "users" ? "Пользователи" : "Журнал"}
          </button>
        ))}
      </div>

      {tab === "apartments" && apartments && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.05rem" }}>Квартиры</h2>
          <form onSubmit={onCreateApt} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <input
              placeholder="Например: Корпус 2, кв. 5"
              value={newApt}
              onChange={(e) => setNewApt(e.target.value)}
              required
              style={{ flex: "1 1 220px", padding: "0.5rem 0.65rem", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
            <button className="btn primary" type="submit">
              Добавить
            </button>
          </form>
          <ul style={{ marginTop: 16, paddingLeft: 18 }}>
            {apartments.map((a) => (
              <li key={a.id} style={{ marginBottom: 8 }}>
                <strong>{a.label}</strong>
                <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
                  Жильцы:{" "}
                  {a.residents.length ? a.residents.map((r) => `${r.fullName} (${r.email})`).join("; ") : "—"}
                </div>
              </li>
            ))}
          </ul>

          <h3 style={{ fontSize: "1rem", marginTop: 24 }}>Привязка жильца к квартире</h3>
          <form onSubmit={onLink} style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Пользователь
              <select value={linkUser} onChange={(e) => setLinkUser(Number(e.target.value))}>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} — {u.email} ({u.role})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Квартира
              <select value={linkApt} onChange={(e) => setLinkApt(Number(e.target.value))}>
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary" type="submit">
              Привязать
            </button>
          </form>
        </section>
      )}

      {tab === "users" && users && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.05rem" }}>Новый пользователь</h2>
          <form onSubmit={onCreateUser} style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Email
              <input value={nuEmail} onChange={(e) => setNuEmail(e.target.value)} type="email" required />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              ФИО
              <input value={nuName} onChange={(e) => setNuName(e.target.value)} required />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Пароль
              <input value={nuPass} onChange={(e) => setNuPass(e.target.value)} required />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Роль
              <select value={nuRole} onChange={(e) => setNuRole(e.target.value)}>
                <option value="RESIDENT">RESIDENT</option>
                <option value="SECURITY">SECURITY</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <button className="btn primary" type="submit">
              Создать
            </button>
          </form>

          <h2 style={{ fontSize: "1.05rem", marginTop: 28 }}>Список</h2>
          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {users.map((u) => (
              <li key={u.id}>
                {u.fullName} — {u.email} ({u.role})
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "audit" && audit && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: "1.05rem" }}>Журнал (последние события)</h2>
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "6px 8px" }}>Время</th>
                  <th style={{ padding: "6px 8px" }}>Действие</th>
                  <th style={{ padding: "6px 8px" }}>Кто</th>
                  <th style={{ padding: "6px 8px" }}>Пропуск</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                      {new Date(row.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{row.action}</td>
                    <td style={{ padding: "6px 8px" }}>{row.userEmail ?? "—"}</td>
                    <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {row.passId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
