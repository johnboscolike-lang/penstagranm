import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { createDuel } from "@/utils/arena-repository";
import { handlePostAction } from "@/utils/api-helpers";

const schema = z.object({
  opponentId: z.string().trim().min(1, "도전할 친구를 골라 주세요."),
  category: z.string().trim().min(1, "퀴즈 종류를 골라 주세요."),
});

/**
 * 친구에게 도전장을 내고 도전자가 바로 풀 문제를 받는다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/arena/challenge",
    role: "student",
    schema,
    status: 201,
    run: (input, session) => createDuel({ challengerId: session.studentId as string, opponentId: input.opponentId, category: input.category }),
  });
}
