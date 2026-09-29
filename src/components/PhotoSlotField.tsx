import type { ChangeEvent } from "react";
import clsx from "clsx";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import type { PhotoSlotMeta } from "@/utils/slot-metadata";

interface PhotoSlotFieldProps {
  slot: PhotoSlotMeta;
  previewUrl?: string;
  fileName?: string;
  onFileSelected(slotKey: PhotoSlotMeta["key"], file: File | null): void;
}

const SLOT_ICONS: Record<PhotoSlotMeta["key"], string> = {
  prep: "heart",
  goal: "star",
  notes: "book",
  assignment: "check",
};

/**
 * Renders one required upload frame for the four-cut record composer.
 */
export function PhotoSlotField({ slot, previewUrl, fileName, onFileSelected }: PhotoSlotFieldProps) {
  /**
   * Updates the file bound to this fixed slot.
   */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    onFileSelected(slot.key, event.target.files?.[0] ?? null);
  }

  /**
   * Clears the slot and removes its preview.
   */
  function handleClearClick(): void {
    onFileSelected(slot.key, null);
  }

  return (
    <div className={clsx("slot", slot.accentClassName, previewUrl && "slot--filled")}>
      <label className="slot__frame" htmlFor={`photo-${slot.key}`}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 업로드 전 미리보기는 blob URL 이라 최적화 대상이 아니다.
          <img alt={slot.label} className="slot__image" src={previewUrl} />
        ) : (
          <span className="slot__placeholder">
            <span className="tag tag--pink">필수</span>
            <PixelIcon name={SLOT_ICONS[slot.key]} scale={1.6} />
            <strong>{slot.label}</strong>
            <span className="muted">눌러서 사진을 올려요</span>
          </span>
        )}
      </label>
      <input accept="image/*" className="sr-only" id={`photo-${slot.key}`} name={`photo-${slot.key}`} onChange={handleFileChange} type="file" />
      <div className="slot__footer">
        <span className="slot__name">{fileName ?? "아직 고르지 않았어요"}</span>
        <button className="btn btn--small btn--cream" disabled={!previewUrl} onClick={handleClearClick} type="button">
          지우기
        </button>
      </div>
    </div>
  );
}
