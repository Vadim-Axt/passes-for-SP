import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Pass } from "../types";

export function SecurityPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Pass[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(query: string) {
    setError(null);
    try {
      const data = await api.passes(query.trim() || undefined, { security: true });
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void load(q);
  }

  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;
  if (!items) return <p>Загрузка…</p>;

  return (
    <div>
      <h1>Охрана: активные пропуска</h1>
      <form onSubmit={onSearch} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <input
          placeholder="Поиск: имя, номер, квартира, UUID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 220px", minWidth: 200, padding: "0.5rem 0.65rem", borderRadius: 8, border: "1px solid #cbd5e1" }}
        />
        <button className="btn primary" type="submit">
          Найти
        </button>
        <button className="btn" type="button" onClick={() => { setQ(""); void load(""); }}>
          Сброс
        </button>
      </form>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {items.length === 0 && <p>Ничего не найдено.</p>}
        {items.map((p) => (
          <Link
            key={p.id}
            to={`/passes/${p.id}`}
            style={{
              display: "block",
              padding: "0.85rem 1rem",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontWeight: 600 }}>{p.visitorName}</div>
            <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
              {p.apartmentLabel} · {p.type} · {p.status}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 6 }}>{p.id}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
