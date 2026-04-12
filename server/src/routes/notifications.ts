import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req: AuthedRequest, res) => {
  const uid = req.user!.sub;
  const r = await pool.query(
    `SELECT id, pass_id AS "passId", title, body, read, created_at AS "createdAt"
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [uid]
  );
  res.json(r.rows);
});

notificationsRouter.patch("/:id/read", async (req: AuthedRequest, res) => {
  const uid = req.user!.sub;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const r = await pool.query(
    `UPDATE notifications SET read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, uid]
  );
  if (r.rowCount === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ok: true });
});
