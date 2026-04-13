import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { passesRouter } from "./routes/passes.js";
import { notificationsRouter } from "./routes/notifications.js";
import { adminRouter } from "./routes/admin.js";
import { pool } from "./db/pool.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

const clientDist = path.resolve(process.cwd(), "../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/passes", passesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const e = err as { code?: string };
  if (e.code === "28P01") {
    res.status(503).json({
      error: "Ошибка входа в PostgreSQL (неверный пользователь или пароль). Проверьте DATABASE_URL в server/.env.",
    });
    return;
  }
  if (e.code === "ECONNREFUSED") {
    res.status(503).json({
      error: "PostgreSQL недоступен (порт не слушается). Запустите БД: npm run db:up в корне проекта.",
    });
    return;
  }
  res.status(500).json({ error: "Internal error" });
});

function pgStartupHint(err: unknown): void {
  const e = err as { code?: string; message?: string };
  console.error("\n--- Ошибка подключения к PostgreSQL ---");
  if (e.code === "28P01") {
    console.error(
      "Код 28P01: неверный пароль или пользователь для того сервера, к которому вы подключаетесь.\n" +
        "Частая причина: на порту 5432 слушает НЕ Docker, а другой PostgreSQL (установленный в Windows).\n" +
        "Варианты:\n" +
        "  • Остановите локальный Postgres и оставьте только контейнер из docker-compose.\n" +
        "  • Или смените порт контейнера (например 5433:5432) и DATABASE_URL=...@localhost:5433/...\n" +
        "  • Или пропишите в DATABASE_URL логин/пароль вашего локального Postgres.\n"
    );
  } else if (e.code === "ECONNREFUSED") {
    console.error("Соединение отклонено: Postgres не запущен или другой порт в DATABASE_URL.\n");
  }
  console.error("Текущий DATABASE_URL (без пароля):", maskDatabaseUrl(process.env.DATABASE_URL));
  console.error("Исходная ошибка:", err);
  console.error("----------------------------------------\n");
}

function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return "(не задан)";
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(некорректный URL)";
  }
}

async function start(): Promise<void> {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    pgStartupHint(err);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

void start();
