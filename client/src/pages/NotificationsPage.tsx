import { useEffect, useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";
import type { NotificationRow } from "../types";

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.notifications();
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function mark(n: NotificationRow) {
    if (n.read) return;
    await api.markRead(n.id);
    setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
  }

  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;
  if (!items) return <p>Загрузка…</p>;

  return (
    <div>
      <h1>Уведомления</h1>
      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {items.length === 0 && <p>Пока пусто.</p>}
        {items.map((n) => (
          <div
            key={n.id}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              background: n.read ? "#fff" : "#eff6ff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <strong>{n.title}</strong>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                {new Date(n.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
            <p style={{ margin: "8px 0 0", color: "#334155" }}>{n.body}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              {n.passId && (
                <Link to={`/passes/${n.passId}`} className="btn">
                  Открыть пропуск
                </Link>
              )}
              {!n.read && (
                <button type="button" className="btn" onClick={() => void mark(n)}>
                  Прочитано
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
