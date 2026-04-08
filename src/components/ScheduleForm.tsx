import { useState, useTransition } from "react";
import { useRouter } from "next/router";

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
      void router.replace(router.asPath);
    });
  }

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>일정 제목</span>
        <input
          className="text-input"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 과제 제출 체크"
          value={title}
        />
      </label>
      <label className="field">
        <span>시간</span>
        <input
          className="text-input"
          onChange={(event) => setTime(event.target.value)}
          type="time"
          value={time}
        />
      </label>
      <label className="field">
        <span>메모</span>
        <textarea
          className="text-area"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="학생 안내 사항이나 준비물을 적어두세요."
          rows={4}
          value={notes}
        />
      </label>
      {feedback ? <p className="form-message form-message--error">{feedback}</p> : null}
      <button className="primary-button" disabled={isPending} type="submit">
        일정 저장
      </button>
    </form>
  );
}
