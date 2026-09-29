import type { NextApiRequest, NextApiResponse } from "next";

import { requireApiSession } from "@/utils/auth-guard";
import { createScopedLogger } from "@/utils/logger";
import { respondWithQuestError } from "@/utils/quest-api";
import { questInputSchema } from "@/utils/quest-schedule";
import { createQuests } from "@/utils/teacher-repository";

const logger = createScopedLogger("api/teacher/quests");

/**
 * Creates the same quest for one or more students (an individual record for each).
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

  const parsed = questInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
    return;
  }

  try {
    const result = await createQuests(parsed.data, session.name);
    if (result.created === 0) {
      res.status(409).json({ message: result.skipped[0]?.message ?? "퀘스트를 만들지 못했어요.", skipped: result.skipped });
      return;
    }

    res.status(201).json(result);
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    logger.error("퀘스트 생성 실패", error);
    res.status(500).json({ message: "퀘스트를 만드는 중 오류가 발생했습니다." });
  }
}
