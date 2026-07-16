import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me-1234567890abcd");

export type SessionRole = "user" | "admin" | "partner";
export type Session = { sub: string; role: SessionRole };

const COOKIE: Record<SessionRole, string> = {
  user: "km_user",
  admin: "km_admin",
  partner: "km_partner",
};

export async function createSession(role: SessionRole, sub: string) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE[role], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}

export async function getSession(role: SessionRole): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE[role])?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== role || !payload.sub) return null;
    return { sub: payload.sub, role };
  } catch {
    return null;
  }
}

export async function destroySession(role: SessionRole) {
  const jar = await cookies();
  jar.delete(COOKIE[role]);
}

export const SESSION_COOKIE = COOKIE;
export const sessionSecret = secret;
