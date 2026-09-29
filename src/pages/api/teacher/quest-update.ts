import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requireApiSession } from "@/utils/auth-guard";
import { createScopedLogger } from "@/utils/logger";
import { respondWithQuestError } from "@/utils/quest-api";
import { deleteQuest, setQuestActive } from "@/utils/teacher-repository";

const logger = createScopedLogger("api/teacher/quest-update");

const updateSchema = z.object({
  questId: z.string().trim().min(1, "퀘스트 정보가 필요합니다."),
  action: z.enum(["pause", "resume", "delete"]),
});

/**
 * Pauses, resumes, or deletes a quest.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  if (!requireApiSession(req, res, "teacher")) {
    return;
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
    return;
  }

  try {
    if (parsed.data.action === "delete") {
      await deleteQuest(parsed.data.questId);
    } else {
      await setQuestActive(parsed.data.questId, parsed.data.action === "resume");
    }

    res.status(200).json({ ok: true });
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    logger.error("퀘스트 변경 실패", error);
    res.status(500).json({ message: "퀘스트를 바꾸는 중 오류가 발생했습니다." });
  }
}
