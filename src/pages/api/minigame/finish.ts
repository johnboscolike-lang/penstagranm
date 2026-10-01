import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { handlePostAction } from "@/utils/api-helpers";
import { finishMiniGame } from "@/utils/minigame-repository";

const schema = z.object({
  runId: z.string().trim().min(1, "게임 정보가 필요합니다.").max(60),
  score: z.number({ message: "점수가 필요합니다." }),
  hits: z.number({ message: "맞힌 수가 필요합니다." }),
  misses: z.number({ message: "놓친 수가 필요합니다." }),
});

/**
 * 몬스터 사냥이 끝났을 때 결과를 받는다. 서버가 앞뒤를 확인하고 작은 보상을 준다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/minigame/finish",
    role: "student",
    schema,
    run: (input, session) => finishMiniGame({ studentId: session.studentId as string, runId: input.runId, score: input.score, hits: input.hits, misses: input.misses }),
  });
}
