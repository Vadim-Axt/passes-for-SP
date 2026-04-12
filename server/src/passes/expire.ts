import { pool } from "../db/pool.js";

/** Marks overdue passes as EXPIRED (ACTIVE or CREATED only). */
export async function expireStalePasses(): Promise<void> {
  await pool.query(
    `UPDATE passes
     SET status = 'EXPIRED', updated_at = NOW()
     WHERE valid_until < NOW()
       AND status IN ('ACTIVE', 'CREATED')`
  );
}
