import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/router";

import { LessonRecorder } from "@/components/LessonRecorder";
import { PixelIcon } from "@/components/pixel/PixelSprite";
import { PhotoSlotField } from "@/components/PhotoSlotField";
import { PHOTO_SLOT_META, type PhotoSlotKey } from "@/utils/slot-metadata";
import { validatePostDraft } from "@/utils/post-validation";
import { resizeImageFile } from "@/utils/image-resize";

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

type SelectedPhotoMap = Partial<Record<PhotoSlotKey, SelectedPhoto>>;

/**
 * Collects the four required images and text fields for a new lesson post.
 */
export function PostComposer() {
  const router = useRouter();
  const selectedPhotosRef = useRef<SelectedPhotoMap>({});

  const [lessonTitle, setLessonTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [transcript, setTranscript] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhotoMap>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    selectedPhotosRef.current = selectedPhotos;
  }, [selectedPhotos]);

  useEffect(() => {
    return () => {
      Object.values(selectedPhotosRef.current).forEach((photo) => {
        if (photo?.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
    };
  }, []);

  /**
   * Stores or clears the uploaded image for a fixed slot.
   */
  function handleFileSelected(slotKey: PhotoSlotKey, file: File | null): void {
    setSelectedPhotos((current) => {
      const existing = current[slotKey];
      if (existing?.previewUrl) {
        URL.revokeObjectURL(existing.previewUrl);
      }

      if (!file) {
        const rest = { ...current };
        delete rest[slotKey];
        return rest;
      }

      return {
        ...current,
        [slotKey]: {
          file,
          previewUrl: URL.createObjectURL(file),
        },
      };
    });
  }

  /**
   * Sends the multipart form to the posts API and refreshes the feed on success.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback(null);

    const draftValidation = validatePostDraft({
      lessonTitle,
      caption,
      transcript,
      photos: PHOTO_SLOT_META.flatMap((slot) =>
        selectedPhotos[slot.key]
          ? [
              {
                slot: slot.key,
                fileName: selectedPhotos[slot.key]?.file.name ?? "",
              },
            ]
          : [],
      ),
    });

    if (!draftValidation.success) {
      setFeedback(draftValidation.error);
      return;
    }

    const formData = new FormData();
    formData.append("lessonTitle", lessonTitle);
    formData.append("caption", caption);
    formData.append("transcript", transcript);
    for (const slot of PHOTO_SLOT_META) {
      const selected = selectedPhotos[slot.key];
      if (selected) {
        formData.append(`photo-${slot.key}`, await resizeImageFile(selected.file));
      }
    }

    const response = await fetch("/api/posts", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "게시글 업로드에 실패했습니다.");
      return;
    }

    setLessonTitle("");
    setCaption("");
    setTranscript("");
    Object.values(selectedPhotosRef.current).forEach((photo) => {
      if (photo?.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    });
    setSelectedPhotos({});
    startTransition(() => {
      void router.push("/myroom#records");
    });
  }

  const filledCount = PHOTO_SLOT_META.filter((slot) => selectedPhotos[slot.key]).length;

  return (
    <section aria-labelledby="record-title" className="panel pf">
      <h2 className="panel__title" id="record-title">
        <PixelIcon name="laurel" />
        <span>
          <span className="panel__eyebrow">준비 · 목표 · 필기 · 과제</span>
          오늘 기록하기
        </span>
        <PixelIcon name="laurel" />
      </h2>
      <form className="composer" onSubmit={handleSubmit}>
        <div className="composer__fields">
          <label className="field">
            <span>제목</span>
            <input
              className="input"
              onChange={(event) => setLessonTitle(event.target.value)}
              placeholder="예: 국어 예비 매3문 · 근거 표시하기"
              value={lessonTitle}
            />
          </label>
          <label className="field">
            <span>오늘 한 줄 소감</span>
            <input
              className="input"
              onChange={(event) => setCaption(event.target.value)}
              placeholder="어디가 막혔고 다음엔 무엇을 해 볼지 적어요."
              value={caption}
            />
          </label>
        </div>

        <div className="composer__count">
          <span className="tag tag--gold">네 컷 {filledCount} / {PHOTO_SLOT_META.length}</span>
          <span className="muted">네 칸을 모두 채워야 올릴 수 있어요.</span>
        </div>

        <div className="slot-grid">
          {PHOTO_SLOT_META.map((slot) => (
            <PhotoSlotField
              fileName={selectedPhotos[slot.key]?.file.name}
              key={slot.key}
              onFileSelected={handleFileSelected}
              previewUrl={selectedPhotos[slot.key]?.previewUrl}
              slot={slot}
            />
          ))}
        </div>

        <LessonRecorder onChange={setTranscript} value={transcript} />

        {feedback ? (
          <p className="msg msg--error" role="alert">
            {feedback}
          </p>
        ) : null}

        <button className="btn btn--block" disabled={isPending} type="submit">
          <PixelIcon name="feather" />
          <span>{isPending ? "올리는 중..." : "성장 기록 올리기"}</span>
          <PixelIcon name="chevronLight" />
        </button>
        <p className="panel__foot muted">올리면 내공간의 성장 기록에 쌓이고, 하루 회고 +10 XP가 적립돼요.</p>
      </form>
    </section>
  );
}
