import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { handlePostAction } from "@/utils/api-helpers";
import { equipCosmetic } from "@/utils/closet-repository";

const schema = z.object({
  slot: z.enum(["hat", "pet"], { message: "모자인지 펫인지 알려 주세요." }),
  key: z.string().trim().min(1, "무엇을 쓸지 알려 주세요.").nullable(),
});

/**
 * 가지고 있는 모자나 펫을 쓰거나 벗는다. (key 가 null 이면 벗기)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/closet/equip",
    role: "student",
    schema,
    run: async (input, session) => equipCosmetic({ studentId: session.studentId as string, slot: input.slot, key: input.key }),
  });
}
