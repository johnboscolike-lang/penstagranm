import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import type { QuestView } from "@/utils/quest-types";

interface QuestListProps {
  quests: QuestView[];
  studentFilter: string | null;
}

/**
 * 낸 퀘스트 목록: 학생별로 묶어 보여 주고, 일시정지·다시 시작·삭제를 한다.
 */
export function QuestList({ quests, studentFilter }: QuestListProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = studentFilter ? quests.filter((quest) => quest.studentId === studentFilter) : quests;
  const studentNames = Array.from(new Set(visible.map((quest) => quest.studentName)));

  /**
   * Runs pause, resume, or delete and refreshes the list.
   */
  async function update(questId: string, action: "pause" | "resume" | "delete"): Promise<void> {
    if (action === "delete" && !window.confirm("이 퀘스트를 지울까요? 이미 학생이 진행한 기록은 남아요.")) {
      return;
    }

    setBusyId(questId);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/quest-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, action }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(payload?.message ?? "바꾸지 못했어요.");
        return;
      }
      void router.replace(router.asPath, undefined, { scroll: false });
    } catch {
      setMessage("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="quest-list-title" className="panel pf">
      <h2 className="panel__title" id="quest-list-title">
        <PixelIcon name="laurel" />
        <span>
          <span className="panel__eyebrow">{studentFilter ? "선택한 학생만 보는 중" : "모든 학생"}</span>
          낸 퀘스트 {visible.length}개
        </span>
        <PixelIcon name="laurel" />
      </h2>

      {studentFilter ? (
        <button className="btn btn--small btn--cream" onClick={() => void router.replace("/teacher/quests", undefined, { scroll: false })} type="button">
          모든 학생 보기
        </button>
      ) : null}

      {visible.length === 0 ? <p className="muted quest-empty">아직 낸 퀘스트가 없어요. 위에서 첫 퀘스트를 만들어 보세요.</p> : null}

      {studentNames.map((name) => (
        <div className="quest-group" key={name}>
          <h3 className="section-label">{name}</h3>
          <ul className="quest-list">
            {visible
              .filter((quest) => quest.studentName === name)
              .map((quest) => (
                <li className={clsx("quest-item card pf", !quest.active && "quest-item--paused")} key={quest.id}>
                  <div className="quest-item__main">
                    <div className="quest-item__title">
                      <span className="tag tag--sky">{quest.subject}</span>
                      <strong>{quest.title}</strong>
                      <span className="muted">{quest.rangeLabel}</span>
                      <span className={clsx("tag", quest.kind === "WEEKLY" ? "tag--gold" : "tag--teal")}>{quest.kind === "WEEKLY" ? "주간" : "일일"}</span>
                      {quest.active ? null : <span className="tag tag--pink">멈춤</span>}
                    </div>
                    <span className="muted">{quest.scheduleLabel}</span>
                    {quest.note ? <span className="muted">메모: {quest.note}</span> : null}
                  </div>
                  <div className="quest-item__actions">
                    <button className="btn btn--small btn--cream" disabled={busyId === quest.id} onClick={() => void update(quest.id, quest.active ? "pause" : "resume")} type="button">
                      {quest.active ? "멈추기" : "다시 시작"}
                    </button>
                    <button className="btn btn--small btn--pink" disabled={busyId === quest.id} onClick={() => void update(quest.id, "delete")} type="button">
                      삭제
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}

      {message ? (
        <p className="msg msg--error" role="alert">
          {message}
        </p>
      ) : null}
    </section>
  );
}
