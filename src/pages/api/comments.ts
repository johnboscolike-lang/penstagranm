import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { createScopedLogger } from "@/utils/logger";
import { createComment } from "@/utils/repository";

const logger = createScopedLogger("api/comments");

const commentSchema = z.object({
  postId: z.string().trim().min(1, "게시글 정보가 필요합니다."),
  authorName: z.string().trim().min(1, "이름을 입력해주세요.").max(20),
  body: z.string().trim().min(1, "댓글 내용을 입력해주세요.").max(200),
});

/**
 * Creates a new comment beneath a lesson post.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  try {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
      return;
    }

    const comment = await createComment(parsed.data);
    res.status(201).json({ comment });
  } catch (error: unknown) {
    logger.error("댓글 저장 실패", error);
    res.status(500).json({ message: "댓글 저장 중 오류가 발생했습니다." });
  }
}
