export const REVIEW_STATUSES = ["NONE", "OPEN", "SUBMITTED", "CONFIRMED", "RETRY", "HELP"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_DECISIONS = ["CONFIRMED", "RETRY", "HELP"] as const;

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const REVIEW_LABELS: Readonly<Record<ReviewStatus, string>> = {
  NONE: "내가 정한 약속",
  OPEN: "진행 중",
  SUBMITTED: "확인 대기",
  CONFIRMED: "수행 확인됨",
  RETRY: "다시 시도",
  HELP: "도움 필요",
};

export const DECISION_LABELS: Readonly<Record<ReviewDecision, string>> = {
  CONFIRMED: "수행 확인",
  RETRY: "다시 시도",
  HELP: "도움 필요",
};

export const MAX_PROOFS_PER_CARD = 4;

/**
 * Normalizes any stored string to a known review status (unknown values fall back to NONE).
 */
export function toReviewStatus(value: string): ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(value) ? (value as ReviewStatus) : "NONE";
}

/**
 * A card can be edited by the student until the teacher confirms it.
 */
export function canStudentEdit(status: ReviewStatus): boolean {
  return status !== "CONFIRMED";
}

/**
 * Editing a submitted card pulls it back to "in progress"; retry/help keep their flag until resubmission.
 */
export function statusAfterStudentEdit(status: ReviewStatus): ReviewStatus {
  return status === "SUBMITTED" ? "OPEN" : status;
}

/**
 * Only cards that came from a teacher quest go through review.
 */
export function needsReview(status: ReviewStatus): boolean {
  return status !== "NONE";
}

/**
 * Cards sent back for retry count zero until the student submits again; everything else counts (provisionally until confirmed).
 */
export function countsTowardScore(status: ReviewStatus): boolean {
  return status !== "RETRY";
}

/**
 * Checks whether the student may submit the card for review, and explains why not in Korean.
 */
export function checkCanSubmit(input: {
  status: ReviewStatus;
  confirmedUnits: number;
  requireProof: boolean;
  proofCount: number;
}): { ok: true } | { ok: false; reason: string } {
  if (input.status === "NONE") {
    return { ok: false, reason: "선생님이 낸 퀘스트만 제출할 수 있어요." };
  }

  if (input.status === "CONFIRMED") {
    return { ok: false, reason: "이미 선생님이 확인한 퀘스트예요." };
  }

  if (input.status === "SUBMITTED") {
    return { ok: false, reason: "이미 제출했어요. 선생님의 확인을 기다려요." };
  }

  if (input.confirmedUnits < 1) {
    return { ok: false, reason: "칸을 하나 이상 채운 뒤에 제출해요." };
  }

  if (input.requireProof && input.proofCount < 1) {
    return { ok: false, reason: "사진 인증을 먼저 올려 주세요." };
  }

  return { ok: true };
}

/**
 * Checks the teacher's decision. A retry request must explain what to redo.
 */
export function checkCanReview(input: {
  status: ReviewStatus;
  decision: ReviewDecision;
  feedback: string;
}): { ok: true } | { ok: false; reason: string } {
  if (!needsReview(input.status)) {
    return { ok: false, reason: "학생이 스스로 정한 약속은 확인 대상이 아니에요." };
  }

  if (input.decision === "RETRY" && input.feedback.trim().length === 0) {
    return { ok: false, reason: "다시 시도를 부탁할 때는 무엇을 다시 할지 한 줄 적어 주세요." };
  }

  return { ok: true };
}
