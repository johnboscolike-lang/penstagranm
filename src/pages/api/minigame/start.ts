import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { handlePostAction } from "@/utils/api-helpers";
import { startMiniGame } from "@/utils/minigame-repository";

const schema = z.object({});

/**
 * 몬스터 사냥 한 판을 시작하고 이번 판의 문제를 받는다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/minigame/start",
    role: "student",
    schema,
    run: (_input, session) => startMiniGame({ studentId: session.studentId as string }),
  });
}
