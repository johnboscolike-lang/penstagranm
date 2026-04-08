import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/router";

import { LessonRecorder } from "@/components/LessonRecorder";
import { PhotoSlotField } from "@/components/PhotoSlotField";
import { PHOTO_SLOT_META, type PhotoSlotKey } from "@/utils/slot-metadata";
import { validatePostDraft } from "@/utils/post-validation";

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
        const { [slotKey]: _removed, ...rest } = current;
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
    PHOTO_SLOT_META.forEach((slot) => {
      const selected = selectedPhotos[slot.key];
      if (selected) {
        formData.append(`photo-${slot.key}`, selected.file);
      }
    });

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
      void router.replace(router.asPath);
    });
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="section-heading__eyebrow">POST STUDIO</p>
          <h2>오늘 수업을 네 컷으로 업로드</h2>
        </div>
        <p className="helper-text">네 장이 모두 채워져야 업로드됩니다.</p>
      </div>
      <form className="composer-form" onSubmit={handleSubmit}>
        <div className="input-grid">
          <label className="field">
            <span>수업 제목</span>
            <input
              className="text-input"
              onChange={(event) => setLessonTitle(event.target.value)}
              placeholder="예: 응용프로그래밍 3차시 - 배열 실습"
              value={lessonTitle}
            />
          </label>
          <label className="field">
            <span>캡션</span>
            <input
              className="text-input"
              onChange={(event) => setCaption(event.target.value)}
              placeholder="오늘 수업의 핵심 흐름을 짧게 정리하세요."
              value={caption}
            />
          </label>
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

        {feedback ? <p className="form-message form-message--error">{feedback}</p> : null}

        <div className="composer-form__actions">
          <p className="helper-text">
            준비-목표-필기-과제 네 컷과 전사 텍스트가 함께 저장됩니다.
          </p>
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "업로드 중..." : "게시글 올리기"}
          </button>
        </div>
      </form>
    </section>
  );
}
