import { Link } from "react-router-dom";
import { useAuth, useRole } from "../auth/AuthContext";

export function HomePage() {
  const { state } = useAuth();
  const role = useRole();

  if (state.status !== "authenticated") return null;

  return (
    <div>
      <h1>Здравствуйте, {state.me.fullName}</h1>
      <p style={{ color: "#64748b" }}>Роль: {role}</p>

      {role === "RESIDENT" && (
        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          <h2 style={{ fontSize: "1.1rem" }}>Быстрые действия</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link className="btn primary" to="/passes/new?type=ONE_TIME_PERSON">
              Разовый гость
            </Link>
            <Link className="btn primary" to="/passes/new?type=COURIER">
              Курьер
            </Link>
            <Link className="btn primary" to="/passes/new?type=VEHICLE">
              Транспорт
            </Link>
            <Link className="btn primary" to="/passes/new?type=PERMANENT">
              Постоянный
            </Link>
          </div>
        </div>
      )}

      {role === "SECURITY" && (
        <p style={{ marginTop: 16 }}>
          Перейдите в раздел <Link to="/security">«Охрана»</Link> для поиска и обработки пропусков.
        </p>
      )}

      {role === "ADMIN" && (
        <div style={{ marginTop: 24 }}>
          <p>
            Раздел <Link to="/admin">«Админ»</Link>: пользователи, квартиры, журнал. Экран{" "}
            <Link to="/security">«Охрана»</Link> — те же активные пропуска, что у сотрудника охраны.
          </p>
          <h2 style={{ fontSize: "1.1rem", marginTop: 16 }}>Создать пропуск (тест)</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            <Link className="btn primary" to="/passes/new?type=ONE_TIME_PERSON">
              Разовый гость
            </Link>
            <Link className="btn primary" to="/passes/new?type=COURIER">
              Курьер
            </Link>
            <Link className="btn primary" to="/passes/new?type=VEHICLE">
              Транспорт
            </Link>
            <Link className="btn primary" to="/passes/new?type=PERMANENT">
              Постоянный
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
