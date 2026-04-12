import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { writeAudit } from "../audit.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/apartments", async (_req, res) => {
  const r = await pool.query(
    `SELECT a.id, a.label,
            COALESCE(
              json_agg(json_build_object('id', u.id, 'email', u.email, 'fullName', u.full_name))
                FILTER (WHERE u.id IS NOT NULL),
              '[]'::json
            ) AS residents
     FROM apartments a
     LEFT JOIN user_apartments ua ON ua.apartment_id = a.id
     LEFT JOIN users u ON u.id = ua.user_id
     GROUP BY a.id
     ORDER BY a.label`
  );
  res.json(r.rows);
});

const createAptSchema = z.object({ label: z.string().min(1).max(50) });

adminRouter.post("/apartments", async (req: AuthedRequest, res) => {
  const parsed = createAptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const r = await pool.query(`INSERT INTO apartments (label) VALUES ($1) RETURNING id, label`, [
      parsed.data.label,
    ]);
    await writeAudit({
      userId: req.user!.sub,
      passId: null,
      action: "ADMIN_APARTMENT_CREATED",
      meta: { label: parsed.data.label },
    });
    res.status(201).json(r.rows[0]);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") {
      res.status(409).json({ error: "Label already exists" });
      return;
    }
    throw e;
  }
});

const linkSchema = z.object({
  userId: z.number().int().positive(),
  apartmentId: z.number().int().positive(),
});

adminRouter.post("/link-apartment", async (req: AuthedRequest, res) => {
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await pool.query(
    `INSERT INTO user_apartments (user_id, apartment_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [parsed.data.userId, parsed.data.apartmentId]
  );
  await writeAudit({
    userId: req.user!.sub,
    passId: null,
    action: "ADMIN_LINK_APARTMENT",
    meta: parsed.data,
  });
  res.json({ ok: true });
});

adminRouter.get("/users", async (_req, res) => {
  const r = await pool.query(
    `SELECT u.id, u.email, u.full_name AS "fullName", u.role::text AS role, u.created_at AS "createdAt"
     FROM users u
     ORDER BY u.id`
  );
  res.json(r.rows);
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  fullName: z.string().min(1).max(200),
  role: z.enum(["RESIDENT", "SECURITY", "ADMIN"]),
});

adminRouter.post("/users", async (req: AuthedRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const hash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const r = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1,$2,$3,$4::user_role)
       RETURNING id, email, full_name AS "fullName", role::text AS role`,
      [parsed.data.email, hash, parsed.data.fullName, parsed.data.role]
    );
    await writeAudit({
      userId: req.user!.sub,
      passId: null,
      action: "ADMIN_USER_CREATED",
      meta: { email: parsed.data.email, role: parsed.data.role },
    });
    res.status(201).json(r.rows[0]);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") {
      res.status(409).json({ error: "Email already exists" });
      return;
    }
    throw e;
  }
});

adminRouter.get("/audit", async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const r = await pool.query(
    `SELECT al.id, al.user_id AS "userId", u.email AS "userEmail",
            al.pass_id AS "passId", al.action, al.meta, al.created_at AS "createdAt"
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json(r.rows);
});
