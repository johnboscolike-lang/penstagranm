import { describe, expect, it } from "vitest";

import {
  canStudentEdit,
  checkCanReview,
  checkCanSubmit,
  countsTowardScore,
  needsReview,
  statusAfterStudentEdit,
  toReviewStatus,
} from "@/utils/quest-review";
import { calcWeeklyQuestReward } from "@/utils/quest-rules";

describe("review state", () => {
  it("locks confirmed cards and reopens submitted ones when the student edits", () => {
    expect(canStudentEdit("CONFIRMED")).toBe(false);
    expect(canStudentEdit("RETRY")).toBe(true);
    expect(statusAfterStudentEdit("SUBMITTED")).toBe("OPEN");
    expect(statusAfterStudentEdit("RETRY")).toBe("RETRY");
    expect(statusAfterStudentEdit("NONE")).toBe("NONE");
  });

  it("scores everything except cards sent back for a retry", () => {
    expect(countsTowardScore("RETRY")).toBe(false);
    (["NONE", "OPEN", "SUBMITTED", "CONFIRMED", "HELP"] as const).forEach((status) => expect(countsTowardScore(status)).toBe(true));
  });

  it("only reviews teacher quests", () => {
    expect(needsReview("NONE")).toBe(false);
    expect(needsReview("SUBMITTED")).toBe(true);
    expect(toReviewStatus("garbage")).toBe("NONE");
    expect(toReviewStatus("HELP")).toBe("HELP");
  });
});

describe("checkCanSubmit", () => {
  const base = { status: "OPEN" as const, confirmedUnits: 3, requireProof: true, proofCount: 1 };

  it("allows a submission with progress and the required photo", () => {
    expect(checkCanSubmit(base)).toEqual({ ok: true });
    expect(checkCanSubmit({ ...base, status: "RETRY" })).toEqual({ ok: true });
  });

  it("explains every refusal", () => {
    const reason = (input: Parameters<typeof checkCanSubmit>[0]) => {
      const result = checkCanSubmit(input);
      return result.ok ? "OK" : result.reason;
    };

    expect(reason({ ...base, status: "NONE" })).toContain("선생님이 낸");
    expect(reason({ ...base, status: "CONFIRMED" })).toContain("이미 선생님이 확인");
    expect(reason({ ...base, status: "SUBMITTED" })).toContain("이미 제출");
    expect(reason({ ...base, confirmedUnits: 0 })).toContain("칸을 하나");
    expect(reason({ ...base, proofCount: 0 })).toContain("사진 인증");
    expect(reason({ ...base, proofCount: 0, requireProof: false })).toBe("OK");
  });
});

describe("checkCanReview", () => {
  it("requires a reason for retry and refuses self-made promises", () => {
    expect(checkCanReview({ status: "SUBMITTED", decision: "CONFIRMED", feedback: "" })).toEqual({ ok: true });
    expect(checkCanReview({ status: "SUBMITTED", decision: "HELP", feedback: "" })).toEqual({ ok: true });
    expect(checkCanReview({ status: "SUBMITTED", decision: "RETRY", feedback: "  " }).ok).toBe(false);
    expect(checkCanReview({ status: "SUBMITTED", decision: "RETRY", feedback: "사진이 흐려요" })).toEqual({ ok: true });
    expect(checkCanReview({ status: "NONE", decision: "CONFIRMED", feedback: "" }).ok).toBe(false);
  });
});

describe("weekly quest reward", () => {
  it("scales with progress and never exceeds 30 XP / 6 coins", () => {
    expect(calcWeeklyQuestReward({ confirmedUnits: 0, plannedUnits: 40 })).toEqual({ xp: 0, coins: 0 });
    expect(calcWeeklyQuestReward({ confirmedUnits: 20, plannedUnits: 40 })).toEqual({ xp: 15, coins: 3 });
    expect(calcWeeklyQuestReward({ confirmedUnits: 40, plannedUnits: 40 })).toEqual({ xp: 30, coins: 6 });
    expect(calcWeeklyQuestReward({ confirmedUnits: 99, plannedUnits: 40 })).toEqual({ xp: 30, coins: 6 });
  });
});
