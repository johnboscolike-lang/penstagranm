import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requireApiSession } from "@/utils/auth-guard";
import { getKstDateKey } from "@/utils/kst";
import { createScopedLogger } from "@/utils/logger";
import { respondWithQuestError } from "@/utils/quest-api";
import { setUnitConfirmed } from "@/utils/quest-repository";

const logger = createScopedLogger("api/promise-units");

const unitSchema = z.object({
  promiseId: z.string().trim().min(1, "약속 정보가 필요합니다."),
  unitNo: z.number().int().min(0).max(100000),
  done: z.boolean(),
});

/**
 * Confirms or clears one page/word/lecture unit of the student's own card.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  const session = requireApiSession(req, res, "student");
  if (!session?.studentId) {
    return;
  }

  const parsed = unitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
    return;
  }

  try {
    const card = await setUnitConfirmed({
      studentId: session.studentId,
      promiseId: parsed.data.promiseId,
      unitNo: parsed.data.unitNo,
      done: parsed.data.done,
      todayKey: getKstDateKey(),
    });

    res.status(200).json({ card });
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    logger.error("약속 칸 저장 실패", error);
    res.status(500).json({ message: "약속 기록 중 오류가 발생했습니다." });
  }
}
