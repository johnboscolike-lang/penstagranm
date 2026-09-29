import { PHOTO_SLOT_META } from "@/utils/slot-metadata";
import { validatePostDraft } from "@/utils/post-validation";

describe("validatePostDraft", () => {
  it("accepts a draft that fills all four required slots", () => {
    const result = validatePostDraft({
      lessonTitle: "응용프로그래밍 3차시",
      caption: "배열 실습을 정리했습니다.",
      transcript: "오늘은 반복문과 배열 순회를 정리했습니다.",
      photos: PHOTO_SLOT_META.map((slot) => ({
        slot: slot.key,
        fileName: `${slot.key}.png`,
      })),
    });

    expect(result.success).toBe(true);
  });

  it("rejects drafts that do not include every required slot", () => {
    const result = validatePostDraft({
      lessonTitle: "응용프로그래밍 3차시",
      caption: "배열 실습을 정리했습니다.",
      transcript: "",
      photos: [
        {
          slot: "prep",
          fileName: "prep.png",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.success ? "" : result.error).toContain("4개의 사진");
  });
});
