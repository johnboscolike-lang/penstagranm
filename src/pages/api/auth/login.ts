import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { createScopedLogger } from "@/utils/logger";
import { prisma } from "@/utils/prisma";
import {
  buildSessionCookie,
  checkTeacherPin,
  createSessionToken,
  getSessionSecret,
  getTeacherPin,
  normalizeTeacherName,
} from "@/utils/session";

const logger = createScopedLogger("api/auth/login");

const loginSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("student"), studentId: z.string().trim().min(1, "이름을 골라 주세요.") }),
  z.object({
    role: z.literal("teacher"),
    pin: z.string().trim().min(1, "PIN을 입력해 주세요.").max(40),
    name: z.string().trim().max(16).optional().default(""),
  }),
]);

/**
 * Starts a session: students pick their name, teachers enter the classroom PIN.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
    return;
  }

  try {
    const secure = process.env.NODE_ENV === "production";
    const secret = getSessionSecret();

    if (parsed.data.role === "student") {
      const student = await prisma.student.findUnique({ where: { id: parsed.data.studentId } });
      if (!student) {
        res.status(404).json({ message: "학생을 찾을 수 없어요." });
        return;
      }

      const token = createSessionToken({ role: "student", studentId: student.id, name: student.name }, secret);
      res.setHeader("Set-Cookie", buildSessionCookie(token, secure));
      res.status(200).json({ next: "/" });
      return;
    }

    if (getTeacherPin() === null) {
      res.status(503).json({ message: "교사 입장이 아직 설정되지 않았어요. TEACHER_PIN 환경 변수를 정해 주세요." });
      return;
    }

    if (!checkTeacherPin(parsed.data.pin)) {
      res.status(401).json({ message: "PIN이 맞지 않아요." });
      return;
    }

    const name = normalizeTeacherName(parsed.data.name);
    const token = createSessionToken({ role: "teacher", studentId: null, name }, secret);
    res.setHeader("Set-Cookie", buildSessionCookie(token, secure));
    res.status(200).json({ next: "/teacher" });
  } catch (error: unknown) {
    logger.error("입장 처리 실패", error);
    res.status(500).json({ message: "입장 중 오류가 발생했습니다." });
  }
}
