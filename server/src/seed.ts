import bcrypt from "bcryptjs";
import { pool } from "./db/pool.js";

async function upsertUser(
  email: string,
  fullName: string,
  role: "ADMIN" | "SECURITY" | "RESIDENT",
  passwordHash: string
): Promise<number> {
  const r = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4::user_role)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role
     RETURNING id`,
    [email, passwordHash, fullName, role]
  );
  return r.rows[0].id as number;
}

async function main() {
  const hash = await bcrypt.hash("demo123", 10);

  await upsertUser("admin@demo.local", "Администратор", "ADMIN", hash);
  await upsertUser("security@demo.local", "Охранник", "SECURITY", hash);
  const residentId = await upsertUser("resident@demo.local", "Иван Жилец", "RESIDENT", hash);

  let apt = await pool.query(`SELECT id FROM apartments WHERE label = $1`, ["Корпус 1, кв. 12"]);
  let apartmentId: number;
  if (apt.rowCount === 0) {
    const ins = await pool.query(
      `INSERT INTO apartments (label) VALUES ($1) RETURNING id`,
      ["Корпус 1, кв. 12"]
    );
    apartmentId = ins.rows[0].id as number;
  } else {
    apartmentId = apt.rows[0].id as number;
  }

  await pool.query(
    `INSERT INTO user_apartments (user_id, apartment_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [residentId, apartmentId]
  );

  console.log("Seed OK. Пароль для всех демо-аккаунтов: demo123");
  console.log("  admin@demo.local, security@demo.local, resident@demo.local");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
