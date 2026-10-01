import type { NextApiRequest, NextApiResponse } from "next";

import { requireApiSession } from "@/utils/auth-guard";
import { getKstDateKey } from "@/utils/kst";
import { createScopedLogger } from "@/utils/logger";
import { respondWithQuestError } from "@/utils/quest-api";
import { addProof } from "@/utils/quest-repository";
import { parseProofMultipartRequest } from "@/utils/upload";

const logger = createScopedLogger("api/proofs");

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Attaches a proof photo to one of the student's teacher-quest cards.
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

  try {
    const { promiseId, imageUrl } = await parseProofMultipartRequest(req);
    if (!promiseId) {
      res.status(400).json({ message: "약속 정보가 필요합니다." });
      return;
    }

    const card = await addProof({ studentId: session.studentId, promiseId, imageUrl, todayKey: getKstDateKey() });
    res.status(201).json({ card });
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    logger.error("인증 사진 저장 실패", error);
    res.status(500).json({ message: "사진을 올리는 중 오류가 발생했습니다." });
  }
}
