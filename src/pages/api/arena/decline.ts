import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { declineDuel } from "@/utils/arena-repository";
import { handlePostAction } from "@/utils/api-helpers";

const schema = z.object({ duelId: z.string().trim().min(1, "대결 정보가 필요합니다.") });

/**
 * 받은 도전장을 정중히 거절한다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/arena/decline",
    role: "student",
    schema,
    run: async (input, session) => {
      await declineDuel({ studentId: session.studentId as string, duelId: input.duelId });

      return { ok: true };
    },
  });
}
