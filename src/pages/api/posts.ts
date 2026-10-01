import type { NextApiRequest, NextApiResponse } from "next";

import { requireApiSession } from "@/utils/auth-guard";
import { respondWithQuestError } from "@/utils/quest-api";
import { createScopedLogger } from "@/utils/logger";
import { validatePostDraft } from "@/utils/post-validation";
import { createPost } from "@/utils/repository";
import { parsePostMultipartRequest } from "@/utils/upload";

const logger = createScopedLogger("api/posts");

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Stores a new four-photo classroom post.
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
    const parsed = await parsePostMultipartRequest(req);
    const validation = validatePostDraft({
      lessonTitle: parsed.lessonTitle,
      caption: parsed.caption,
      transcript: parsed.transcript,
      photos: parsed.photos.map((photo) => ({
        slot: photo.slot,
        fileName: photo.imageUrl,
      })),
    });

    if (!validation.success) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const post = await createPost(parsed, session.studentId);
    res.status(201).json({ post });
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    logger.error("게시글 저장 실패", error);
    res.status(500).json({ message: "게시글 저장 중 오류가 발생했습니다." });
  }
}
