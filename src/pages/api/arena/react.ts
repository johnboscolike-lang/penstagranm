import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { handlePostAction } from "@/utils/api-helpers";
import { reactToDuel } from "@/utils/arena-repository";

const schema = z.object({
  duelId: z.string().trim().min(1, "대결 정보가 필요합니다."),
  emote: z.string().trim().min(1, "보낼 이모트를 골라 주세요."),
});

/**
 * 끝난 대결에서 친구에게 응원 이모트를 보낸다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/arena/react",
    role: "student",
    schema,
    run: (input, session) => reactToDuel({ studentId: session.studentId as string, duelId: input.duelId, emote: input.emote }),
  });
}
