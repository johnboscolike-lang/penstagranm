import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getDuelResult } from "@/utils/arena-repository";
import { handlePostAction } from "@/utils/api-helpers";

const schema = z.object({ duelId: z.string().trim().min(1, "대결 정보가 필요합니다.") });

/**
 * 끝난 대결의 결과와 정답 풀이를 다시 본다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/arena/result",
    role: "student",
    schema,
    run: (input, session) => getDuelResult({ studentId: session.studentId as string, duelId: input.duelId }),
  });
}
