import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { markAchievementsSeen } from "@/utils/achievement-repository";
import { handlePostAction } from "@/utils/api-helpers";

const schema = z.object({ keys: z.array(z.string().trim().min(1).max(60)).min(1, "알린 업적이 없어요.").max(30) });

/**
 * 알림으로 알려 준 업적을 "봤음"으로 바꾼다. 다음 화면에서 같은 알림이 또 뜨지 않게 한다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/achievements/seen",
    role: "student",
    schema,
    run: async (input, session) => ({ updated: await markAchievementsSeen(session.studentId as string, input.keys) }),
  });
}
