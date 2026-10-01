import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requireApiSession } from "@/utils/auth-guard";
import { createScopedLogger } from "@/utils/logger";
import { createScheduleItem } from "@/utils/repository";

const logger = createScopedLogger("api/schedule");

const scheduleSchema = z.object({
  title: z.string().trim().min(1, "일정 제목을 입력해주세요.").max(60),
  notes: z.string().trim().max(300).optional().default(""),
  scheduledFor: z.string().trim().min(1, "일정 날짜가 필요합니다."),
});

/**
 * Saves one new schedule record for the selected calendar day.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  if (!requireApiSession(req, res, "any")) {
    return;
  }

  try {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
      return;
    }

    const scheduledFor = new Date(parsed.data.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) {
      res.status(400).json({ message: "일정 날짜 형식이 올바르지 않습니다." });
      return;
    }

    const item = await createScheduleItem({
      title: parsed.data.title,
      notes: parsed.data.notes,
      scheduledFor,
    });

    res.status(201).json({ item });
  } catch (error: unknown) {
    logger.error("일정 저장 실패", error);
    res.status(500).json({ message: "일정 저장 중 오류가 발생했습니다." });
  }
}
