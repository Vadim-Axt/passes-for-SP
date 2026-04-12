import { pool } from "./db/pool.js";

export async function notifyUser(params: {
  userId: number;
  passId: string | null;
  title: string;
  body: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, pass_id, title, body)
     VALUES ($1, $2, $3, $4)`,
    [params.userId, params.passId, params.title, params.body]
  );
}
