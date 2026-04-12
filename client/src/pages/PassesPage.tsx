import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Pass } from "../types";

function statusColor(s: string) {
  switch (s) {
    case "ACTIVE":
    case "CREATED":
      return "#15803d";
    case "USED":
    case "COMPLETED":
      return "#0369a1";
    case "REJECTED":
    case "CANCELLED":
      return "#b91c1c";
    case "EXPIRED":
      return "#92400e";
    case "SUSPENDED":
      return "#a16207";
    default:
      return "#475569";
  }
}

function PassCard({ p }: { p: Pass }) {
  return (
    <Link
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 600 }}>{p.visitorName}</div>
          <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
            {p.apartmentLabel} · {p.type}
            {p.vehiclePlate ? ` · ${p.vehiclePlate}` : ""}
            {p.courierCompany ? ` · ${p.courierCompany}` : ""}
          </div>
        </div>
        <span style={{ color: statusColor(p.status), fontWeight: 600, fontSize: "0.9rem" }}>{p.status}</span>
      </div>
      <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 8 }}>
        Действует до {new Date(p.validUntil).toLocaleString("ru-RU")}
      </div>
    </Link>
  );
}

export function PassesActivePage() {
  const [items, setItems] = useState<Pass[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.passesActive();
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;
  if (!items) return <p>Загрузка…</p>;

  return (
    <div>
      <h1>Активные пропуска</h1>
      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {items.length === 0 && <p>Нет активных пропусков.</p>}
        {items.map((p) => (
          <PassCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

export function PassesHistoryPage() {
  const [items, setItems] = useState<Pass[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.passes();
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;
  if (!items) return <p>Загрузка…</p>;

  return (
    <div>
      <h1>История заявок</h1>
      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {items.length === 0 && <p>Заявок пока нет.</p>}
        {items.map((p) => (
          <PassCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
