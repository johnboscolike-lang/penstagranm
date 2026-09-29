import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

import { readSession, type Session, type SessionRole } from "@/utils/session";

type RedirectResult = { redirect: { destination: string; permanent: false } };

/**
 * Reads the verified session from a request, or null when the visitor has not entered yet.
 */
export function getRequestSession(req: { headers: { cookie?: string } }): Session | null {
  return readSession(req.headers.cookie);
}

/**
 * Guards a page: returns the session when the role matches, or the redirect result to send everyone else to the right place.
 */
export function guardPage(
  context: Pick<GetServerSidePropsContext, "req">,
  role: SessionRole,
): { ok: true; session: Session } | { ok: false; result: RedirectResult } {
  const session = getRequestSession(context.req);

  if (!session) {
    return { ok: false, result: { redirect: { destination: "/login", permanent: false } } };
  }

  if (session.role !== role) {
    return { ok: false, result: { redirect: { destination: session.role === "teacher" ? "/teacher" : "/", permanent: false } } };
  }

  return { ok: true, session };
}

/**
 * Guards an API route. Sends 401/403 with a Korean message and returns null when the caller may not continue.
 */
export function requireApiSession(req: NextApiRequest, res: NextApiResponse, role: SessionRole | "any"): Session | null {
  const session = getRequestSession(req);

  if (!session) {
    res.status(401).json({ message: "먼저 입장해 주세요." });
    return null;
  }

  if (role !== "any" && session.role !== role) {
    res.status(403).json({ message: role === "teacher" ? "선생님만 할 수 있어요." : "학생만 할 수 있어요." });
    return null;
  }

  return session;
}
