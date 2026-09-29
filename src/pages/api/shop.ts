import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { createScopedLogger } from "@/utils/logger";
import { respondWithQuestError } from "@/utils/quest-api";
import { loadRoster, purchaseItem } from "@/utils/quest-repository";

const logger = createScopedLogger("api/shop");

const purchaseSchema = z.object({
  itemKey: z.string().trim().min(1, "아이템 정보가 필요합니다."),
});

/**
 * Buys one decoration item with coins.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
    return;
  }

  try {
    const { me } = await loadRoster();
    const result = await purchaseItem(me.id, parsed.data.itemKey);

    res.status(201).json(result);
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    logger.error("아이템 구매 실패", error);
    res.status(500).json({ message: "구매 중 오류가 발생했습니다." });
  }
}
