import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { startDuel } from "@/utils/arena-repository";
import { handlePostAction } from "@/utils/api-helpers";

const schema = z.object({ duelId: z.string().trim().min(1, "대결 정보가 필요합니다.") });

/**
 * 받은 도전장(또는 내가 이어 풀 대결)의 문제를 받는다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/arena/start",
    role: "student",
    schema,
    run: (input, session) => startDuel({ studentId: session.studentId as string, duelId: input.duelId }),
  });
}
