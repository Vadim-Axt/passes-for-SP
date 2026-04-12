import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

const JWT_SECRET = process.env.JWT_SECRET;

export type JwtPayload = { sub: number; role: string; email: string };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded as unknown as JwtPayload;
}
