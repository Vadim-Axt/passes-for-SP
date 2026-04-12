import { Router, type NextFunction, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { signToken } from "../auth/tokens.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { writeAudit } from "../audit.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

authRouter.post("/login", async (req, res, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { email, password } = parsed.data;
    const r = await pool.query(
      `SELECT id, email, password_hash, full_name, role::text AS role FROM users WHERE lower(email) = lower($1)`,
      [email]
    );
    const row = r.rows[0] as
      | { id: number; email: string; password_hash: string; full_name: string; role: string }
      | undefined;
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ sub: row.id, role: row.role, email: row.email });
    await writeAudit({ userId: row.id, passId: null, action: "AUTH_LOGIN", meta: { email: row.email } });
    res.json({
      token,
      user: { id: row.id, email: row.email, fullName: row.full_name, role: row.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const uid = req.user!.sub;
    const r = await pool.query(
      `SELECT id, email, full_name, role::text AS role FROM users WHERE id = $1`,
      [uid]
    );
    const u = r.rows[0] as { id: number; email: string; full_name: string; role: string } | undefined;
    if (!u) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const apts = await pool.query(
      `SELECT a.id, a.label
       FROM apartments a
       JOIN user_apartments ua ON ua.apartment_id = a.id
       WHERE ua.user_id = $1
       ORDER BY a.label`,
      [uid]
    );
    res.json({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      apartments: apts.rows.map((x: { id: number; label: string }) => ({ id: x.id, label: x.label })),
    });
  } catch (err) {
    next(err);
  }
});
