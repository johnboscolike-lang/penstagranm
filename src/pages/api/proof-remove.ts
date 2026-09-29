import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requireApiSession } from "@/utils/auth-guard";
import { getKstDateKey } from "@/utils/kst";
import { createScopedLogger } from "@/utils/logger";
import { respondWithQuestError } from "@/utils/quest-api";
import { removeProof } from "@/utils/quest-repository";

const logger = createScopedLogger("api/proof-remove");

const removeSchema = z.object({ proofId: z.string().trim().min(1, "사진 정보가 필요합니다.") });

/**
 * Removes one of the student's own proof photos.
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

  const parsed = removeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
    return;
  }

  try {
    const card = await removeProof({ studentId: session.studentId, proofId: parsed.data.proofId, todayKey: getKstDateKey() });
    res.status(200).json({ card });
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    logger.error("인증 사진 삭제 실패", error);
    res.status(500).json({ message: "사진을 지우는 중 오류가 발생했습니다." });
  }
}
