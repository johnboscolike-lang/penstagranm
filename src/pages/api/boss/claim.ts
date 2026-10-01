import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { handlePostAction } from "@/utils/api-helpers";
import { claimRaidReward } from "@/utils/boss-repository";
import { getKstDateKey } from "@/utils/kst";

const schema = z.object({ weekKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "보스 주차가 올바르지 않습니다.") });

/**
 * 쓰러뜨린 학급 보스의 보상(경험치·코인)을 한 번 받는다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/boss/claim",
    role: "student",
    schema,
    run: async (input, session) => claimRaidReward({ studentId: session.studentId as string, weekKey: input.weekKey, todayKey: getKstDateKey() }),
  });
}
