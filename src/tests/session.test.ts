// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  buildSessionCookie,
  checkTeacherPin,
  createSessionToken,
  getSessionSecret,
  getTeacherPin,
  normalizeTeacherName,
  readCookie,
  readSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  verifySessionToken,
} from "@/utils/session";

const SECRET = "test-secret";
const STUDENT = { role: "student", studentId: "abc", name: "도토리" } as const;

describe("session tokens", () => {
  it("round-trips a student and a teacher session", () => {
    const student = verifySessionToken(createSessionToken(STUDENT, SECRET), SECRET);
    const teacher = verifySessionToken(createSessionToken({ role: "teacher", studentId: null, name: "국어 선생님" }, SECRET), SECRET);

    expect(student).toEqual(STUDENT);
    expect(teacher).toEqual({ role: "teacher", studentId: null, name: "국어 선생님" });
  });

  it("rejects tampering, wrong secrets, expiry, and garbage", () => {
    const token = createSessionToken(STUDENT, SECRET, 1000);
    const [body, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...STUDENT, role: "teacher", studentId: null, exp: 9e15 })).toString("base64url");

    expect(verifySessionToken(token, "other-secret", 1000)).toBeNull();
    expect(verifySessionToken(`${forged}.${signature}`, SECRET, 1000)).toBeNull();
    expect(verifySessionToken(`${body}.`, SECRET, 1000)).toBeNull();
    expect(verifySessionToken(token, SECRET, 1000 + SESSION_TTL_MS + 1)).toBeNull();
    expect(verifySessionToken("not-a-token", SECRET)).toBeNull();
    expect(verifySessionToken(undefined, SECRET)).toBeNull();
  });

  it("reads the session from a Cookie header", () => {
    const token = createSessionToken(STUDENT, SECRET);
    const header = `theme=dark; ${SESSION_COOKIE}=${encodeURIComponent(token)}; other=1`;

    expect(readCookie(header, SESSION_COOKIE)).toBe(token);
    expect(readSession(header, SECRET)).toEqual(STUDENT);
    expect(readSession("theme=dark", SECRET)).toBeNull();
    expect(readSession(undefined, SECRET)).toBeNull();
  });

  it("builds a set and a clear cookie", () => {
    expect(buildSessionCookie("abc", true)).toContain("HttpOnly");
    expect(buildSessionCookie("abc", true)).toContain("Secure");
    expect(buildSessionCookie("abc", false)).not.toContain("Secure");
    expect(buildSessionCookie(null, false)).toContain("Max-Age=0");
  });

  it("derives a stable secret from the database URL when none is set", () => {
    const a = getSessionSecret({ DATABASE_URL: "postgres://a" });
    const b = getSessionSecret({ DATABASE_URL: "postgres://b" });

    expect(a).toBe(getSessionSecret({ DATABASE_URL: "postgres://a" }));
    expect(a).not.toBe(b);
    expect(getSessionSecret({ SESSION_SECRET: "x" })).toBe("x");
  });
});

describe("teacher PIN", () => {
  it("uses 1234 only outside production and requires the env var in production", () => {
    expect(getTeacherPin({})).toBe("1234");
    expect(getTeacherPin({ NODE_ENV: "production" })).toBeNull();
    expect(getTeacherPin({ NODE_ENV: "production", TEACHER_PIN: "9999" })).toBe("9999");
  });

  it("accepts only the configured PIN", () => {
    expect(checkTeacherPin("1234", {})).toBe(true);
    expect(checkTeacherPin("0000", {})).toBe(false);
    expect(checkTeacherPin("1234", { NODE_ENV: "production" })).toBe(false);
    expect(checkTeacherPin("9999", { NODE_ENV: "production", TEACHER_PIN: "9999" })).toBe(true);
  });

  it("normalizes teacher names for the comment badge", () => {
    expect(normalizeTeacherName("")).toBe("선생님");
    expect(normalizeTeacherName("국어")).toBe("국어 선생님");
    expect(normalizeTeacherName("수학 선생님")).toBe("수학 선생님");
  });
});
