/**
 * Defines the fixed four-photo structure required for every classroom post.
 */
export const PHOTO_SLOT_KEYS = ["prep", "goal", "notes", "assignment"] as const;

export type PhotoSlotKey = (typeof PHOTO_SLOT_KEYS)[number];

export interface PhotoSlotMeta {
  key: PhotoSlotKey;
  label: string;
  accentClassName: string;
}

export interface SlotPhotoLike {
  slot: PhotoSlotKey;
}

/**
 * Provides display metadata for each required photo slot.
 */
export const PHOTO_SLOT_META: readonly PhotoSlotMeta[] = [
  {
    key: "prep",
    label: "수업준비사진(자신이나오게)",
    accentClassName: "slot-card--prep",
  },
  {
    key: "goal",
    label: "수업목표사진",
    accentClassName: "slot-card--goal",
  },
  {
    key: "notes",
    label: "필기사진",
    accentClassName: "slot-card--notes",
  },
  {
    key: "assignment",
    label: "과제사진",
    accentClassName: "slot-card--assignment",
  },
] as const;

const SLOT_META_BY_KEY = Object.fromEntries(
  PHOTO_SLOT_META.map((slot, index) => [slot.key, { ...slot, order: index }]),
) as Record<PhotoSlotKey, PhotoSlotMeta & { order: number }>;

/**
 * Looks up metadata for a given slot key.
 */
export function getPhotoSlotMeta(slot: PhotoSlotKey): PhotoSlotMeta {
  return SLOT_META_BY_KEY[slot];
}

/**
 * Sorts any photo-like collection into the fixed classroom order.
 */
export function sortPhotosBySlot<T extends SlotPhotoLike>(photos: T[]): T[] {
  return [...photos].sort(
    (left, right) => SLOT_META_BY_KEY[left.slot].order - SLOT_META_BY_KEY[right.slot].order,
  );
}
