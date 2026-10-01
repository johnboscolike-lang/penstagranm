import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { handlePostAction } from "@/utils/api-helpers";
import { answerWord } from "@/utils/word-repository";

const schema = z.object({
  word: z.string().trim().min(1, "단어 정보가 필요합니다.").max(40),
  choice: z.number({ message: "보기를 골라 주세요." }).int("보기를 골라 주세요."),
});

/**
 * 단어 복습 문제 하나의 답을 채점하고 다음에 만날 날을 정한다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/words/answer",
    role: "student",
    schema,
    run: (input, session) => answerWord({ studentId: session.studentId as string, word: input.word, choice: input.choice }),
  });
}
