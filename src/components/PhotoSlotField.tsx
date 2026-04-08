import type { ChangeEvent } from "react";

import type { PhotoSlotMeta } from "@/utils/slot-metadata";

interface PhotoSlotFieldProps {
  slot: PhotoSlotMeta;
  previewUrl?: string;
  fileName?: string;
  onFileSelected(slotKey: PhotoSlotMeta["key"], file: File | null): void;
}

/**
 * Renders one required upload frame for the classroom feed composer.
 */
export function PhotoSlotField({
  slot,
  previewUrl,
  fileName,
  onFileSelected,
}: PhotoSlotFieldProps) {
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
    <div className={`slot-card ${slot.accentClassName}`}>
      <label className="slot-card__label" htmlFor={`photo-${slot.key}`}>
        {previewUrl ? (
          <img alt={slot.label} className="slot-card__image" src={previewUrl} />
        ) : (
          <div className="slot-card__placeholder">
            <span className="slot-card__badge">필수</span>
            <strong>{slot.label}</strong>
            <span>클릭해서 이미지를 올리세요.</span>
          </div>
        )}
      </label>
      <input
        accept="image/*"
        className="sr-only"
        id={`photo-${slot.key}`}
        name={`photo-${slot.key}`}
        onChange={handleFileChange}
        type="file"
      />
      <div className="slot-card__footer">
        <p>{fileName ?? "아직 선택되지 않았습니다."}</p>
        <button className="ghost-button" onClick={handleClearClick} type="button">
          지우기
        </button>
      </div>
    </div>
  );
}
