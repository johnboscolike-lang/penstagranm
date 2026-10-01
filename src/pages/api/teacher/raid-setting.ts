import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { handlePostAction } from "@/utils/api-helpers";
import { setRaidLevel } from "@/utils/boss-repository";
import { RAID_LEVELS } from "@/utils/boss-rules";

const schema = z.object({ level: z.enum(RAID_LEVELS.map((level) => level.key) as [string, ...string[]], { message: "난이도를 골라 주세요." }) });

/**
 * 선생님이 학급 보스의 난이도(쉬움·보통·어려움)를 바꾼다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handlePostAction(req, res, {
    scope: "api/teacher/raid-setting",
    role: "teacher",
    schema,
    run: async (input) => {
      const level = await setRaidLevel(input.level as (typeof RAID_LEVELS)[number]["key"]);

      return { level: level.key };
    },
  });
}
