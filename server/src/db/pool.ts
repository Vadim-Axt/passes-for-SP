import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Явный путь: при запуске из другой CWD всё равно подхватится server/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Создайте server/.env (см. server/.env.example) или задайте переменную окружения."
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
