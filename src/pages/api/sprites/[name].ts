import type { NextApiRequest, NextApiResponse } from "next";

import { renderSprite } from "@/utils/art/registry";

/**
 * Serves a generated pixel-art sprite as an immutable SVG image.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "GET 요청만 허용됩니다." });
    return;
  }

  const rawName = Array.isArray(req.query.name) ? req.query.name[0] : req.query.name;
  const name = (rawName ?? "").replace(/\.svg$/, "");
  const sprite = renderSprite(name);
  if (!sprite) {
    res.status(404).json({ message: "스프라이트를 찾을 수 없습니다." });
    return;
  }

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.status(200).send(sprite.svg);
}
