import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useRole } from "../auth/AuthContext";
import type { Pass } from "../types";

export function PassDetailPage() {
  const { id } = useParams();
  const role = useRole();
  const nav = useNavigate();
  const [pass, setPass] = useState<Pass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await api.pass(id);
        if (!cancelled) setPass(p);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function reload() {
    if (!id) return;
    setPass(await api.pass(id));
  }

  if (error) return <p style={{ color: "#b91c1c" }}>{error}</p>;
  if (!pass) return <p>Загрузка…</p>;

  const canSecurityAct = role === "SECURITY" || role === "ADMIN";
  const canResidentAct = role === "RESIDENT" || role === "ADMIN";

  return (
    <div>
      <p>
        <Link to={role === "SECURITY" || role === "ADMIN" ? "/security" : "/passes/active"}>← Назад</Link>
      </p>
      <h1>Пропуск</h1>
      {msg && <p style={{ color: "#15803d" }}>{msg}</p>}
      <div style={{ display: "grid", gap: 8, marginTop: 12, lineHeight: 1.5 }}>
        <div>
          <strong>Статус:</strong> {pass.status}
        </div>
        <div>
          <strong>Тип:</strong> {pass.type}
        </div>
        <div>
          <strong>Квартира:</strong> {pass.apartmentLabel ?? pass.apartmentId}
        </div>
        <div>
          <strong>Посетитель:</strong> {pass.visitorName}
        </div>
        {pass.vehiclePlate && (
          <div>
            <strong>Авто:</strong> {pass.vehiclePlate}
          </div>
        )}
        {pass.courierCompany && (
          <div>
            <strong>Курьер:</strong> {pass.courierCompany}
          </div>
        )}
        {pass.purpose && (
          <div>
            <strong>Цель:</strong> {pass.purpose}
          </div>
        )}
        <div>
          <strong>Период:</strong> {new Date(pass.validFrom).toLocaleString("ru-RU")} —{" "}
          {new Date(pass.validUntil).toLocaleString("ru-RU")}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
        {canSecurityAct && ["CREATED", "ACTIVE"].includes(pass.status) && (
          <>
            <button
              className="btn primary"
              type="button"
              onClick={async () => {
                setMsg(null);
                await api.checkIn(pass.id);
                setMsg("Допуск зафиксирован.");
                await reload();
              }}
            >
              Зафиксировать допуск
            </button>
            <button
              className="btn danger"
              type="button"
              onClick={async () => {
                setMsg(null);
                await api.rejectPass(pass.id);
                setMsg("Пропуск отклонён.");
                await reload();
              }}
            >
              Отклонить
            </button>
          </>
        )}

        {canResidentAct && ["CREATED", "ACTIVE", "SUSPENDED"].includes(pass.status) && pass.type === "PERMANENT" && (
          <>
            {pass.status === "ACTIVE" && (
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  setMsg(null);
                  await api.suspendPass(pass.id);
                  setMsg("Пропуск приостановлен.");
                  await reload();
                }}
              >
                Приостановить
              </button>
            )}
            {pass.status === "SUSPENDED" && (
              <button
                className="btn primary"
                type="button"
                onClick={async () => {
                  setMsg(null);
                  await api.resumePass(pass.id);
                  setMsg("Пропуск снова активен.");
                  await reload();
                }}
              >
                Возобновить
              </button>
            )}
          </>
        )}

        {canResidentAct && ["CREATED", "ACTIVE", "SUSPENDED"].includes(pass.status) && (
          <button
            className="btn danger"
            type="button"
            onClick={async () => {
              setMsg(null);
              await api.cancelPass(pass.id);
              setMsg("Пропуск отменён.");
              await reload();
            }}
          >
            Отменить заявку
          </button>
        )}
      </div>

      {role === "RESIDENT" && (
        <p style={{ marginTop: 24, color: "#64748b", fontSize: "0.9rem" }}>
          После действий охраны вы получите уведомление в разделе «Уведомления».
        </p>
      )}

      {role === "ADMIN" && (
        <p style={{ marginTop: 16 }}>
          <button type="button" className="btn" onClick={() => nav("/admin")}>
            К админке
          </button>
        </p>
      )}
    </div>
  );
}
