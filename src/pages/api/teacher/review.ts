import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requireApiSession } from "@/utils/auth-guard";
import { createScopedLogger } from "@/utils/logger";
import { respondWithQuestError } from "@/utils/quest-api";
import { REVIEW_DECISIONS } from "@/utils/quest-review";
import { reviewCard } from "@/utils/teacher-repository";

const logger = createScopedLogger("api/teacher/review");

const reviewSchema = z.object({
  promiseId: z.string().trim().min(1, "약속 정보가 필요합니다."),
  decision: z.enum(REVIEW_DECISIONS),
  feedback: z.string().trim().max(200, "피드백은 200자까지예요.").optional().default(""),
});

/**
 * Saves the teacher's decision (confirm, retry, or needs help) with a short feedback.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  const session = requireApiSession(req, res, "teacher");
  if (!session) {
    return;
  }

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
    return;
  }

  try {
    await reviewCard({ ...parsed.data, reviewerName: session.name });
    res.status(200).json({ ok: true });
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    logger.error("확인 처리 실패", error);
    res.status(500).json({ message: "확인 처리 중 오류가 발생했습니다." });
  }
}
