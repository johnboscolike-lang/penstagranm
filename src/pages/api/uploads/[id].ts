import type { NextApiRequest, NextApiResponse } from "next";

import { createScopedLogger } from "@/utils/logger";
import { readStoredUpload } from "@/utils/uploads";

const logger = createScopedLogger("api/uploads");

/**
 * Serves a photo that is stored in the database (UPLOAD_STORAGE=db).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "GET 요청만 허용됩니다." });
    return;
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id || !/^[a-z0-9]{10,40}$/i.test(id)) {
    res.status(404).json({ message: "사진을 찾을 수 없습니다." });
    return;
  }

  try {
    const upload = await readStoredUpload(id);
    if (!upload) {
      res.status(404).json({ message: "사진을 찾을 수 없습니다." });
      return;
    }

    res.setHeader("Content-Type", upload.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.status(200).send(upload.data);
  } catch (error: unknown) {
    logger.error("사진 읽기 실패", error);
    res.status(500).json({ message: "사진을 불러오지 못했습니다." });
  }
}
