import type { NextApiResponse } from "next";

import { QuestError, type QuestErrorCode } from "@/utils/quest-repository";

const STATUS_BY_CODE: Record<QuestErrorCode, number> = {
  NOT_FOUND: 404,
  LOCKED: 409,
  OUT_OF_RANGE: 400,
  UNKNOWN_ITEM: 400,
  ALREADY_OWNED: 409,
  INSUFFICIENT_COINS: 409,
};

/**
 * Maps a QuestError to an HTTP status. Returns false for unrelated errors so callers can log them.
 */
export function respondWithQuestError(res: NextApiResponse, error: unknown): boolean {
  if (!(error instanceof QuestError)) {
    return false;
  }

  res.status(STATUS_BY_CODE[error.code]).json({ code: error.code, message: error.message });

  return true;
}
