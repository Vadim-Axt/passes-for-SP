import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { PassType } from "../types";

const types: { value: PassType; label: string }[] = [
  { value: "ONE_TIME_PERSON", label: "Разовый для человека" },
  { value: "COURIER", label: "Курьер" },
  { value: "VEHICLE", label: "Транспорт" },
  { value: "PERMANENT", label: "Постоянный" },
];

export function CreatePassPage() {
  const { state } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initialType = (params.get("type") as PassType | null) ?? "ONE_TIME_PERSON";

  const [type, setType] = useState<PassType>(types.some((t) => t.value === initialType) ? initialType : "ONE_TIME_PERSON");
  const [adminApts, setAdminApts] = useState<{ id: number; label: string }[] | null>(null);
  const [apartmentId, setApartmentId] = useState<number>(0);
  const [visitorName, setVisitorName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [courierCompany, setCourierCompany] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaults = useMemo(() => {
    const from = new Date();
    const until = new Date(from);
    if (type === "PERMANENT") until.setFullYear(until.getFullYear() + 1);
    else until.setDate(until.getDate() + 1);
    return { from: from.toISOString().slice(0, 16), until: until.toISOString().slice(0, 16) };
  }, [type]);

  const [validFrom, setValidFrom] = useState(defaults.from);
  const [validUntil, setValidUntil] = useState(defaults.until);

  useEffect(() => {
    if (state.status !== "authenticated") return;
    if (state.me.role === "RESIDENT" && state.me.apartments[0]) {
      setApartmentId(state.me.apartments[0].id);
    }
    if (state.me.role === "ADMIN") {
      void (async () => {
        const rows = await api.adminApartments();
        const list = rows.map((r) => ({ id: r.id, label: r.label }));
        setAdminApts(list);
        setApartmentId((id) => id || list[0]?.id || 0);
      })();
    }
  }, [state]);

  if (state.status !== "authenticated") return <Navigate to="/login" replace />;
  if (state.me.role !== "RESIDENT" && state.me.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }
  if (state.me.role === "RESIDENT" && state.me.apartments.length === 0) {
    return <p>Нет привязанных квартир. Обратитесь к администратору.</p>;
  }
  if (state.me.role === "ADMIN" && adminApts && adminApts.length === 0) {
    return <p>Сначала создайте квартиру в админке.</p>;
  }
  if (state.me.role === "ADMIN" && !adminApts) {
    return <p>Загрузка квартир…</p>;
  }

  const me = state.me;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resolvedApt = me.role === "RESIDENT" ? apartmentId || me.apartments[0]?.id : apartmentId;
      if (!resolvedApt) throw new Error("Выберите квартиру");

      const body: Record<string, unknown> = {
        apartmentId: resolvedApt,
        type,
        visitorName,
        purpose: purpose || null,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
      };
      if (type === "VEHICLE") body.vehiclePlate = vehiclePlate;
      if (type === "COURIER") body.courierCompany = courierCompany;

      const pass = await api.createPass(body);
      nav(`/passes/${pass.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Новый пропуск</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, maxWidth: 520, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Тип
          <select value={type} onChange={(e) => setType(e.target.value as PassType)}>
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {me.role === "RESIDENT" && me.apartments.length > 1 && (
          <label style={{ display: "grid", gap: 6 }}>
            Квартира
            <select value={apartmentId} onChange={(e) => setApartmentId(Number(e.target.value))}>
              {me.apartments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {me.role === "ADMIN" && (
          <label style={{ display: "grid", gap: 6 }}>
            Квартира
            <select
              value={apartmentId}
              onChange={(e) => setApartmentId(Number(e.target.value))}
              disabled={!adminApts?.length}
            >
              {(adminApts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label style={{ display: "grid", gap: 6 }}>
          Имя посетителя / водителя
          <input value={visitorName} onChange={(e) => setVisitorName(e.target.value)} required />
        </label>

        {type === "VEHICLE" && (
          <label style={{ display: "grid", gap: 6 }}>
            Госномер
            <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} required />
          </label>
        )}

        {type === "COURIER" && (
          <label style={{ display: "grid", gap: 6 }}>
            Служба / компания
            <input value={courierCompany} onChange={(e) => setCourierCompany(e.target.value)} required />
          </label>
        )}

        <label style={{ display: "grid", gap: 6 }}>
          Цель визита (необязательно)
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Действует с
            <input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Действует до
            <input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
          </label>
        </div>

        {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Создаём…" : "Создать"}
        </button>
      </form>
    </div>
  );
}
