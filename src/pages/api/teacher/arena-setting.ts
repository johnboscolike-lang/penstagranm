import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { setArenaEnabled } from "@/utils/arena-repository";
import { handlePostAction } from "@/utils/api-helpers";

const schema = z.object({ enabled: z.boolean({ message: "열림 여부가 필요합니다." }) });

/**
 * 선생님이 대결장을 열거나 닫는다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/teacher/arena-setting",
    role: "teacher",
    schema,
    run: async (input) => {
      await setArenaEnabled(input.enabled);

      return { enabled: input.enabled };
    },
  });
}
