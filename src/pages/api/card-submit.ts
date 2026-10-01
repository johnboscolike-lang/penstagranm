import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requireApiSession } from "@/utils/auth-guard";
import { getKstDateKey } from "@/utils/kst";
import { createScopedLogger } from "@/utils/logger";
import { respondWithQuestError } from "@/utils/quest-api";
import { submitCard } from "@/utils/quest-repository";

const logger = createScopedLogger("api/card-submit");

const submitSchema = z.object({ promiseId: z.string().trim().min(1, "약속 정보가 필요합니다.") });

/**
 * Sends one teacher-quest card to the teacher for confirmation.
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

  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
    return;
  }

  try {
    const card = await submitCard({ studentId: session.studentId, promiseId: parsed.data.promiseId, todayKey: getKstDateKey() });
    res.status(200).json({ card });
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    logger.error("제출 실패", error);
    res.status(500).json({ message: "제출 중 오류가 발생했습니다." });
  }
}
