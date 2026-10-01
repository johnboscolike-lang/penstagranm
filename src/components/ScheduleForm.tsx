import { useState, useTransition } from "react";
import { useRouter } from "next/router";

import { PixelIcon } from "@/components/pixel/PixelSprite";

interface ScheduleFormProps {
  selectedDateKey: string;
}

/**
 * Saves a new schedule item for the currently selected day.
 */
export function ScheduleForm({ selectedDateKey }: ScheduleFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("08:30");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Posts the selected-day schedule entry to the API.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback(null);

    const response = await fetch("/api/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        notes,
        scheduledFor: `${selectedDateKey}T${time}:00+09:00`,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "일정 저장에 실패했습니다.");
      return;
    }

    setTitle("");
    setNotes("");
    startTransition(() => {
      void router.replace(router.asPath, undefined, { scroll: false });
    });
  }

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>일정 제목</span>
        <input className="input" maxLength={60} onChange={(event) => setTitle(event.target.value)} placeholder="예: 과제 제출 체크" value={title} />
      </label>
      <label className="field">
        <span>시간</span>
        <input className="input" onChange={(event) => setTime(event.target.value)} type="time" value={time} />
      </label>
      <label className="field">
        <span>메모</span>
        <textarea
          className="textarea"
          maxLength={300}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="준비물이나 안내 사항을 적어 두세요."
          rows={3}
          value={notes}
        />
      </label>
      {feedback ? (
        <p className="msg msg--error" role="alert">
          {feedback}
        </p>
      ) : null}
      <button className="btn btn--block" disabled={isPending} type="submit">
        <PixelIcon name="calendar" />
        <span>{selectedDateKey} 일정 저장</span>
      </button>
    </form>
  );
}
