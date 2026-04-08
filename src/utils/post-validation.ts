import { z } from "zod";

import { PHOTO_SLOT_KEYS } from "@/utils/slot-metadata";
import type { PostDraft } from "@/utils/types";

const photoSchema = z.object({
  slot: z.enum(PHOTO_SLOT_KEYS),
  fileName: z.string().trim().min(1, "사진 파일명이 필요합니다."),
});

const postDraftSchema = z.object({
  lessonTitle: z.string().trim().min(1, "수업 제목을 입력해주세요."),
  caption: z.string().trim().min(1, "캡션을 입력해주세요."),
  transcript: z.string().trim().optional().default(""),
  photos: z.array(photoSchema),
});

type PostDraftParseResult =
  | { success: true; data: PostDraft }
  | { success: false; error: string };

/**
 * Validates a draft post before upload and enforces the four fixed slots.
 */
export function validatePostDraft(input: PostDraft): PostDraftParseResult {
  const parsed = postDraftSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "게시글 입력값이 올바르지 않습니다.",
    };
  }

  const uniqueSlots = new Set(parsed.data.photos.map((photo) => photo.slot));
  if (uniqueSlots.size !== PHOTO_SLOT_KEYS.length) {
    return {
      success: false,
      error: "4개의 사진 틀을 모두 채워주세요.",
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}
