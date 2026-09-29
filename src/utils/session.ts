import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "pen_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionRole = "student" | "teacher";

export interface Session {
  role: SessionRole;
  /** 학생이면 Student.id, 교사면 null */
  studentId: string | null;
  /** 화면과 댓글에 쓰는 이름 */
  name: string;
}

interface SessionPayload extends Session {
  exp: number;
}

/**
 * Returns the secret used to sign session cookies. Without SESSION_SECRET it is derived from the database URL,
 * so every server instance agrees on it without extra setup.
 */
export function getSessionSecret(env: Record<string, string | undefined> = process.env): string {
  if (env.SESSION_SECRET) {
    return env.SESSION_SECRET;
  }

  return createHash("sha256")
    .update(`penstagram-session:${env.DATABASE_URL ?? "file:./dev.db"}`)
    .digest("hex");
}

/**
 * Signs a base64url payload with HMAC-SHA256.
 */
function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/**
 * Creates a signed session token of the form "payload.signature".
 */
export function createSessionToken(session: Session, secret: string, now: number = Date.now()): string {
  const payload: SessionPayload = { ...session, exp: now + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${body}.${sign(body, secret)}`;
}

/**
 * Checks the signature and expiry, and returns the session or null. Any malformed token is simply rejected.
 */
export function verifySessionToken(token: string | undefined | null, secret: string, now: number = Date.now()): Session | null {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = Buffer.from(sign(body, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionPayload>;
    const validRole = payload.role === "student" || payload.role === "teacher";
    if (!validRole || typeof payload.name !== "string" || typeof payload.exp !== "number" || payload.exp < now) {
      return null;
    }
    if (payload.role === "student" && typeof payload.studentId !== "string") {
      return null;
    }

    return { role: payload.role as SessionRole, studentId: payload.role === "student" ? (payload.studentId as string) : null, name: payload.name };
  } catch {
    return null;
  }
}

/**
 * Reads one cookie value out of a Cookie header.
 */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return undefined;
}

/**
 * Reads and verifies the session from a request's Cookie header.
 */
export function readSession(cookieHeader: string | undefined, secret: string = getSessionSecret(), now: number = Date.now()): Session | null {
  return verifySessionToken(readCookie(cookieHeader, SESSION_COOKIE), secret, now);
}

/**
 * Builds the Set-Cookie header value; pass null to clear the cookie.
 */
export function buildSessionCookie(token: string | null, secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=${token ?? ""}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  parts.push(token ? `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}` : "Max-Age=0");
  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/**
 * Returns the configured teacher PIN, or null when teacher login is disabled (production without TEACHER_PIN).
 */
export function getTeacherPin(env: Record<string, string | undefined> = process.env): string | null {
  if (env.TEACHER_PIN) {
    return env.TEACHER_PIN;
  }

  return env.NODE_ENV === "production" ? null : "1234";
}

/**
 * Compares the entered PIN with the configured one without leaking timing information.
 */
export function checkTeacherPin(input: string, env: Record<string, string | undefined> = process.env): boolean {
  const pin = getTeacherPin(env);
  if (pin === null) {
    return false;
  }

  const expected = createHash("sha256").update(pin).digest();
  const received = createHash("sha256").update(input).digest();

  return timingSafeEqual(expected, received);
}

/**
 * Makes sure a teacher display name ends with "선생님" so comments are shown with the teacher badge.
 */
export function normalizeTeacherName(input: string): string {
  const trimmed = input.trim().slice(0, 16);
  if (trimmed.length === 0) {
    return "선생님";
  }

  return trimmed.endsWith("선생님") ? trimmed : `${trimmed} 선생님`;
}
