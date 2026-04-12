import { pool } from "./db/pool.js";

export async function writeAudit(params: {
  userId: number | null;
  passId: string | null;
  action: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `INSERT INTO audit_log (user_id, pass_id, action, meta)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [params.userId, params.passId, params.action, JSON.stringify(params.meta ?? {})]
  );
}
