import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { writeAudit } from "../audit.js";
import { notifyUser } from "../notify.js";
import { expireStalePasses } from "../passes/expire.js";

export const passesRouter = Router();
passesRouter.use(requireAuth);

const passType = z.enum(["ONE_TIME_PERSON", "COURIER", "VEHICLE", "PERMANENT"]);

const createPassSchema = z.object({
  apartmentId: z.number().int().positive(),
  type: passType,
  visitorName: z.string().min(1).max(200),
  vehiclePlate: z.string().max(32).optional().nullable(),
  courierCompany: z.string().max(200).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
});

async function assertResidentOwnsApartment(userId: number, apartmentId: number): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM user_apartments WHERE user_id = $1 AND apartment_id = $2`,
    [userId, apartmentId]
  );
  return r.rowCount !== null && r.rowCount > 0;
}

function mapPassRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    apartmentId: row.apartment_id,
    createdBy: row.created_by,
    type: row.type,
    status: row.status,
    visitorName: row.visitor_name,
    vehiclePlate: row.vehicle_plate,
    courierCompany: row.courier_company,
    purpose: row.purpose,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    apartmentLabel: row.apartment_label ?? undefined,
  };
}

passesRouter.post("/", requireRole("RESIDENT", "ADMIN"), async (req: AuthedRequest, res) => {
  const parsed = createPassSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const uid = req.user!.sub;
  const b = parsed.data;
  if (req.user!.role === "RESIDENT") {
    const ok = await assertResidentOwnsApartment(uid, b.apartmentId);
    if (!ok) {
      res.status(403).json({ error: "Apartment not linked to user" });
      return;
    }
  }
  if (b.type === "VEHICLE" && !b.vehiclePlate?.trim()) {
    res.status(400).json({ error: "vehiclePlate required for VEHICLE" });
    return;
  }
  if (b.type === "COURIER" && !b.courierCompany?.trim()) {
    res.status(400).json({ error: "courierCompany required for COURIER" });
    return;
  }
  const vf = new Date(b.validFrom);
  const vu = new Date(b.validUntil);
  if (vu <= vf) {
    res.status(400).json({ error: "validUntil must be after validFrom" });
    return;
  }

  const ins = await pool.query(
    `INSERT INTO passes (
       apartment_id, created_by, type, status,
       visitor_name, vehicle_plate, courier_company, purpose,
       valid_from, valid_until
     ) VALUES ($1,$2,$3,'ACTIVE',$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      b.apartmentId,
      uid,
      b.type,
      b.visitorName,
      b.vehiclePlate ?? null,
      b.courierCompany ?? null,
      b.purpose ?? null,
      vf.toISOString(),
      vu.toISOString(),
    ]
  );
  const row = ins.rows[0];
  await writeAudit({
    userId: uid,
    passId: row.id,
    action: "PASS_CREATED",
    meta: { type: b.type, apartmentId: b.apartmentId },
  });
  res.status(201).json(mapPassRow(row));
});

passesRouter.get("/", async (req: AuthedRequest, res) => {
  await expireStalePasses();
  const uid = req.user!.sub;
  const role = req.user!.role;
  const scope = req.query.scope as string | undefined;

  if (role === "RESIDENT") {
    const activeOnly = scope === "active";
    const r = await pool.query(
      `SELECT p.*, a.label AS apartment_label
       FROM passes p
       JOIN apartments a ON a.id = p.apartment_id
       WHERE p.created_by = $1
         ${activeOnly ? `AND p.status IN ('CREATED','ACTIVE','SUSPENDED')` : ""}
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [uid]
    );
    res.json(r.rows.map(mapPassRow));
    return;
  }

  const adminSecurityView = role === "ADMIN" && req.query.security === "1";

  if (role === "SECURITY" || adminSecurityView) {
    const q = (req.query.q as string | undefined)?.trim();
    if (q) {
      const r = await pool.query(
        `SELECT p.*, a.label AS apartment_label
         FROM passes p
         JOIN apartments a ON a.id = p.apartment_id
         WHERE p.status IN ('CREATED','ACTIVE','SUSPENDED')
           AND (
             p.visitor_name ILIKE $1
             OR COALESCE(p.vehicle_plate,'') ILIKE $1
             OR COALESCE(p.courier_company,'') ILIKE $1
             OR a.label ILIKE $1
             OR CAST(p.id AS TEXT) ILIKE $1
           )
         ORDER BY p.valid_until ASC
         LIMIT 100`,
        [`%${q}%`]
      );
      res.json(r.rows.map(mapPassRow));
      return;
    }
    const r = await pool.query(
      `SELECT p.*, a.label AS apartment_label
       FROM passes p
       JOIN apartments a ON a.id = p.apartment_id
       WHERE p.status IN ('CREATED','ACTIVE','SUSPENDED')
       ORDER BY p.valid_until ASC
       LIMIT 200`
    );
    res.json(r.rows.map(mapPassRow));
    return;
  }

  if (role === "ADMIN" && !adminSecurityView) {
    const r = await pool.query(
      `SELECT p.*, a.label AS apartment_label
       FROM passes p
       JOIN apartments a ON a.id = p.apartment_id
       ORDER BY p.created_at DESC
       LIMIT 500`
    );
    res.json(r.rows.map(mapPassRow));
    return;
  }

  res.status(403).json({ error: "Forbidden" });
});

passesRouter.get("/:id", async (req: AuthedRequest, res) => {
  await expireStalePasses();
  const id = req.params.id;
  const r = await pool.query(
    `SELECT p.*, a.label AS apartment_label
     FROM passes p
     JOIN apartments a ON a.id = p.apartment_id
     WHERE p.id = $1::uuid`,
    [id]
  );
  const row = r.rows[0];
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const uid = req.user!.sub;
  const role = req.user!.role;
  if (role === "RESIDENT" && row.created_by !== uid) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(mapPassRow(row));
});

passesRouter.post("/:id/check-in", requireRole("SECURITY", "ADMIN"), async (req: AuthedRequest, res) => {
  await expireStalePasses();
  const id = req.params.id;
  const uid = req.user!.sub;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(`SELECT * FROM passes WHERE id = $1::uuid FOR UPDATE`, [id]);
    const p = r.rows[0];
    if (!p) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!["CREATED", "ACTIVE"].includes(p.status)) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: `Cannot check-in status ${p.status}` });
      return;
    }
    const disposable = ["ONE_TIME_PERSON", "COURIER", "VEHICLE"].includes(p.type);
    const newStatus = disposable ? "USED" : "ACTIVE";
    await client.query(
      `UPDATE passes SET status = $2, updated_at = NOW() WHERE id = $1::uuid`,
      [id, newStatus]
    );
    await client.query(
      `INSERT INTO audit_log (user_id, pass_id, action, meta) VALUES ($1,$2,'PASS_CHECK_IN',$3::jsonb)`,
      [uid, id, JSON.stringify({ previousStatus: p.status, newStatus })]
    );
    await client.query("COMMIT");

    await notifyUser({
      userId: p.created_by,
      passId: id,
      title: "Зафиксирован допуск",
      body: disposable
        ? `Пропуск «${p.visitor_name}» отмечен как использованный.`
        : `Зафиксирован вход по постоянному пропуску «${p.visitor_name}».`,
    });
    res.json({ ok: true, status: newStatus });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

passesRouter.post("/:id/reject", requireRole("SECURITY", "ADMIN"), async (req: AuthedRequest, res) => {
  await expireStalePasses();
  const id = req.params.id;
  const uid = req.user!.sub;
  const r = await pool.query(`SELECT * FROM passes WHERE id = $1::uuid`, [id]);
  const p = r.rows[0];
  if (!p) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!["CREATED", "ACTIVE"].includes(p.status)) {
    res.status(400).json({ error: `Cannot reject status ${p.status}` });
    return;
  }
  await pool.query(`UPDATE passes SET status = 'REJECTED', updated_at = NOW() WHERE id = $1::uuid`, [id]);
  await writeAudit({ userId: uid, passId: id, action: "PASS_REJECTED", meta: {} });
  await notifyUser({
    userId: p.created_by,
    passId: id,
    title: "Пропуск отклонён",
    body: `Охрана отклонила пропуск «${p.visitor_name}».`,
  });
  res.json({ ok: true, status: "REJECTED" });
});

passesRouter.post("/:id/cancel", requireRole("RESIDENT", "ADMIN"), async (req: AuthedRequest, res) => {
  await expireStalePasses();
  const id = req.params.id;
  const uid = req.user!.sub;
  const r = await pool.query(`SELECT * FROM passes WHERE id = $1::uuid`, [id]);
  const p = r.rows[0];
  if (!p) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (req.user!.role === "RESIDENT" && p.created_by !== uid) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!["CREATED", "ACTIVE", "SUSPENDED"].includes(p.status)) {
    res.status(400).json({ error: `Cannot cancel status ${p.status}` });
    return;
  }
  await pool.query(`UPDATE passes SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1::uuid`, [id]);
  await writeAudit({ userId: uid, passId: id, action: "PASS_CANCELLED", meta: {} });
  res.json({ ok: true, status: "CANCELLED" });
});

passesRouter.post("/:id/suspend", requireRole("RESIDENT", "ADMIN"), async (req: AuthedRequest, res) => {
  await expireStalePasses();
  const id = req.params.id;
  const uid = req.user!.sub;
  const r = await pool.query(`SELECT * FROM passes WHERE id = $1::uuid`, [id]);
  const p = r.rows[0];
  if (!p) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (p.type !== "PERMANENT") {
    res.status(400).json({ error: "Only PERMANENT passes can be suspended" });
    return;
  }
  if (req.user!.role === "RESIDENT" && p.created_by !== uid) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (p.status !== "ACTIVE") {
    res.status(400).json({ error: `Cannot suspend status ${p.status}` });
    return;
  }
  await pool.query(`UPDATE passes SET status = 'SUSPENDED', updated_at = NOW() WHERE id = $1::uuid`, [id]);
  await writeAudit({ userId: uid, passId: id, action: "PASS_SUSPENDED", meta: {} });
  res.json({ ok: true, status: "SUSPENDED" });
});

passesRouter.post("/:id/resume", requireRole("RESIDENT", "ADMIN"), async (req: AuthedRequest, res) => {
  await expireStalePasses();
  const id = req.params.id;
  const uid = req.user!.sub;
  const r = await pool.query(`SELECT * FROM passes WHERE id = $1::uuid`, [id]);
  const p = r.rows[0];
  if (!p) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (p.type !== "PERMANENT") {
    res.status(400).json({ error: "Only PERMANENT passes" });
    return;
  }
  if (req.user!.role === "RESIDENT" && p.created_by !== uid) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (p.status !== "SUSPENDED") {
    res.status(400).json({ error: `Cannot resume status ${p.status}` });
    return;
  }
  if (new Date(p.valid_until) < new Date()) {
    res.status(400).json({ error: "Pass is expired" });
    return;
  }
  await pool.query(`UPDATE passes SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1::uuid`, [id]);
  await writeAudit({ userId: uid, passId: id, action: "PASS_RESUMED", meta: {} });
  res.json({ ok: true, status: "ACTIVE" });
});
