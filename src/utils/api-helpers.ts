import type { NextApiRequest, NextApiResponse } from "next";
import type { ZodType } from "zod";

import { requireApiSession } from "@/utils/auth-guard";
import { createScopedLogger } from "@/utils/logger";
import { respondWithQuestError } from "@/utils/quest-api";
import type { Session, SessionRole } from "@/utils/session";

interface ActionOptions<Input, Output> {
  /** 로그에 찍을 이름 */
  scope: string;
  role: SessionRole;
  schema: ZodType<Input>;
  /** 성공했을 때의 HTTP 상태 (기본 200) */
  status?: number;
  run: (input: Input, session: Session) => Promise<Output>;
}

/**
 * POST 전용 API 한 개를 공통 규칙으로 처리한다: 방식 검사 → 입장 확인 → 입력 검사 → 실행 → 오류를 알맞은 상태 코드로.
 */
export async function handlePostAction<Input, Output>(req: NextApiRequest, res: NextApiResponse, options: ActionOptions<Input, Output>): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST 요청만 허용됩니다." });
    return;
  }

  const session = requireApiSession(req, res, options.role);
  if (!session) {
    return;
  }

  const parsed = options.schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." });
    return;
  }

  try {
    const output = await options.run(parsed.data, session);

    res.status(options.status ?? 200).json(output ?? { ok: true });
  } catch (error: unknown) {
    if (respondWithQuestError(res, error)) {
      return;
    }

    createScopedLogger(options.scope).error("요청 처리 실패", error);
    res.status(500).json({ message: "처리 중 오류가 발생했습니다." });
  }
}
