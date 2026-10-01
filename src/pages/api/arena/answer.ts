import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { answerDuel } from "@/utils/arena-repository";
import { handlePostAction } from "@/utils/api-helpers";

const schema = z.object({
  duelId: z.string().trim().min(1, "대결 정보가 필요합니다."),
  index: z.number().int().min(0, "문제 번호가 올바르지 않아요.").max(19, "문제 번호가 올바르지 않아요."),
  choice: z.number().int().nullable(),
  ms: z.number(),
});

/**
 * 문제 하나의 답을 내고 맞았는지 바로 확인한다. 마지막 문제라면 결과까지 받는다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/arena/answer",
    role: "student",
    schema,
    run: (input, session) => answerDuel({ studentId: session.studentId as string, ...input }),
  });
}
