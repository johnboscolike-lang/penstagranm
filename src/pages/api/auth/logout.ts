import type { NextApiRequest, NextApiResponse } from "next";

import { buildSessionCookie } from "@/utils/session";

/**
 * Ends the session by clearing the cookie.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  res.setHeader("Set-Cookie", buildSessionCookie(null, process.env.NODE_ENV === "production"));
  res.status(200).json({ next: "/login" });
}
