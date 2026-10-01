import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import { UNIT_KIND_LABELS, UNIT_KINDS, type UnitKind } from "@/utils/quest-plan";
import { normalizeWeekdays } from "@/utils/quest-schedule";
import type { StudentOption } from "@/utils/teacher-repository";

interface QuestFormProps {
  students: StudentOption[];
  todayKey: string;
  presetStudentId: string | null;
}

const WEEKDAY_CHOICES = [
  ["1", "월"],
  ["2", "화"],
  ["3", "수"],
  ["4", "목"],
  ["5", "금"],
] as const;

const SUBJECT_SUGGESTIONS = ["국어", "수학", "영어", "영단어", "과학", "사회", "인강", "수업 준비"];

/**
 * 퀘스트 만들기: 학생 여러 명을 고르고, 일일 반복 또는 주간 목표와 분량·요일·기간·사진 인증을 정한다.
 * 같은 내용이라도 학생마다 개별 기록으로 저장돼서 나중에 학생별로 멈추거나 지울 수 있다.
 */
export function QuestForm({ students, todayKey, presetStudentId }: QuestFormProps) {
  const router = useRouter();
  const [kind, setKind] = useState<"DAILY" | "WEEKLY">("DAILY");
  const [selected, setSelected] = useState<string[]>(presetStudentId ? [presetStudentId] : []);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [unitKind, setUnitKind] = useState<UnitKind>("PAGE");
  const [unitStart, setUnitStart] = useState("1");
  const [unitCount, setUnitCount] = useState("5");
  const [advance, setAdvance] = useState(false);
  const [weekdays, setWeekdays] = useState("12345");
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState("");
  const [requireProof, setRequireProof] = useState(true);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const teams = Array.from(new Set(students.map((student) => student.teamName)));
  const usesRange = unitKind === "PAGE" || unitKind === "LECTURE";

  /**
   * Adds or removes one student from the selection.
   */
  function toggleStudent(studentId: string): void {
    setSelected((current) => (current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]));
  }

  /**
   * Selects or clears a whole team (or everyone when the team is null).
   */
  function toggleTeam(team: string | null): void {
    const ids = students.filter((student) => team === null || student.teamName === team).map((student) => student.id);
    const allSelected = ids.every((id) => selected.includes(id));
    setSelected((current) => (allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids]))));
  }

  /**
   * Flips one weekday on or off.
   */
  function toggleWeekday(digit: string): void {
    setWeekdays((current) => normalizeWeekdays(current.includes(digit) ? current.replace(digit, "") : current + digit));
  }

  /**
   * Sends the quest to the server and refreshes the list.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/teacher/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selected,
          kind,
          subject,
          title,
          note,
          unitKind,
          unitStart: usesRange ? Number(unitStart) || 1 : 1,
          unitCount: Number(unitCount) || 0,
          advance: kind === "DAILY" && usesRange ? advance : false,
          weekdays: kind === "DAILY" ? weekdays : "12345",
          startDate,
          endDate: endDate || null,
          requireProof,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; created?: number; skipped?: { studentName: string; message: string }[]; notToday?: string[] }
        | null;

      if (!response.ok) {
        setMessage({ tone: "error", text: payload?.message ?? "퀘스트를 만들지 못했어요." });
        return;
      }

      const skipped = payload?.skipped ?? [];
      const notToday = payload?.notToday ?? [];
      setMessage({
        tone: "ok",
        text: [
          `${payload?.created ?? 0}명에게 퀘스트를 냈어요.`,
          notToday.length > 0 ? `${notToday.join(", ")}은(는) 오늘 이미 진행한 약속이 있어서 다음 수업일부터 나타나요.` : "",
          skipped.length > 0 ? `건너뜀: ${skipped.map((item) => `${item.studentName}(${item.message})`).join(" / ")}` : "",
        ]
          .filter(Boolean)
          .join(" "),
      });
      setTitle("");
      setNote("");
      void router.replace(router.asPath, undefined, { scroll: false });
    } catch {
      setMessage({ tone: "error", text: "네트워크 연결을 확인해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="quest-form-title" className="panel pf">
      <h2 className="panel__title" id="quest-form-title">
        <PixelIcon name="laurel" />
        <span>
          <span className="panel__eyebrow">학생별 일일·주간 퀘스트</span>
          퀘스트 만들기
        </span>
        <PixelIcon name="laurel" />
      </h2>

      <form className="quest-form" onSubmit={handleSubmit}>
        <div aria-label="퀘스트 종류" className="tabs" role="tablist">
          {(
            [
              ["DAILY", "일일 반복"],
              ["WEEKLY", "주간 목표"],
            ] as const
          ).map(([key, label]) => (
            <button aria-selected={kind === key} className={clsx("tabs__tab", kind === key && "tabs__tab--on")} key={key} onClick={() => setKind(key)} role="tab" type="button">
              {label}
            </button>
          ))}
        </div>
        <p className="muted">
          {kind === "DAILY"
            ? "고른 요일마다 학생의 '오늘 약속' 칸에 자동으로 나타나요. 학생당 요일마다 최대 3개까지예요."
            : "한 주(월~금) 동안 채울 목표예요. 하루 점수에는 넣지 않고, 완성하면 보너스 XP·코인을 받아요."}
        </p>

        <fieldset className="quest-form__group">
          <legend>
            누구에게 낼까요? <b>{selected.length}명</b>
          </legend>
          <div className="quest-form__quick">
            <button className="btn btn--small btn--cream" onClick={() => toggleTeam(null)} type="button">
              전체
            </button>
            {teams.map((team) => (
              <button className="btn btn--small btn--cream" key={team} onClick={() => toggleTeam(team)} type="button">
                {team}
              </button>
            ))}
            <button className="btn btn--small btn--cream" onClick={() => setSelected([])} type="button">
              선택 해제
            </button>
          </div>
          <ul className="pick-grid">
            {students.map((student) => (
              <li key={student.id}>
                <label className={clsx("pick", selected.includes(student.id) && "pick--on")}>
                  <input checked={selected.includes(student.id)} onChange={() => toggleStudent(student.id)} type="checkbox" />
                  <PixelAvatar hairKey={student.hairKey} scale={0.9} />
                  <span>{student.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="quest-form__row">
          <label className="field">
            <span>과목</span>
            <input className="input" list="subject-suggestions" maxLength={12} onChange={(event) => setSubject(event.target.value)} placeholder="예: 수학" value={subject} />
            <datalist id="subject-suggestions">
              {SUBJECT_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>퀘스트 이름</span>
            <input className="input" maxLength={40} onChange={(event) => setTitle(event.target.value)} placeholder="예: 올림포스 풀이" value={title} />
          </label>
        </div>

        <div className="quest-form__row">
          <label className="field">
            <span>분량 단위</span>
            <select className="input" onChange={(event) => setUnitKind(event.target.value as UnitKind)} value={unitKind}>
              {UNIT_KINDS.map((item) => (
                <option key={item} value={item}>
                  {UNIT_KIND_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          {usesRange ? (
            <label className="field">
              <span>시작 번호</span>
              <input className="input" inputMode="numeric" onChange={(event) => setUnitStart(event.target.value)} value={unitStart} />
            </label>
          ) : null}
          <label className="field">
            <span>{kind === "DAILY" ? "하루 분량" : "이번 주 전체 분량"}</span>
            <input className="input" inputMode="numeric" onChange={(event) => setUnitCount(event.target.value)} value={unitCount} />
          </label>
        </div>

        {kind === "DAILY" ? (
          <fieldset className="quest-form__group">
            <legend>반복 요일</legend>
            <div className="weekday-row">
              {WEEKDAY_CHOICES.map(([digit, label]) => (
                <button aria-pressed={weekdays.includes(digit)} className={clsx("weekday", weekdays.includes(digit) && "weekday--on")} key={digit} onClick={() => toggleWeekday(digit)} type="button">
                  {label}
                </button>
              ))}
            </div>
            {usesRange ? (
              <label className="check">
                <input checked={advance} onChange={(event) => setAdvance(event.target.checked)} type="checkbox" />
                <span>다음 날은 이어서 (오늘 p.12~17 → 내일 p.18~23)</span>
              </label>
            ) : null}
          </fieldset>
        ) : null}

        <div className="quest-form__row">
          <label className="field">
            <span>{kind === "DAILY" ? "시작일" : "시작일(그 주부터)"}</span>
            <input className="input" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>
          <label className="field">
            <span>마감일 (비우면 계속)</span>
            <input className="input" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </label>
        </div>

        <label className="check">
          <input checked={requireProof} onChange={(event) => setRequireProof(event.target.checked)} type="checkbox" />
          <span>
            <PixelIcon name="heart" /> 사진 인증 필수 (학생이 사진을 찍어 올려야 제출할 수 있어요)
          </span>
        </label>

        <label className="field">
          <span>학생에게 보일 메모 (선택)</span>
          <textarea className="textarea" maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="예: 풀이 과정이 보이게 공책 사진을 찍어 주세요." rows={2} value={note} />
        </label>

        {message ? (
          <p className={clsx("msg", message.tone === "error" ? "msg--error" : "msg--ok")} role="status">
            {message.text}
          </p>
        ) : null}

        <button className="btn btn--block" disabled={busy || selected.length === 0} type="submit">
          <PixelIcon name="feather" />
          <span>{busy ? "내는 중..." : `퀘스트 내기 (${selected.length}명)`}</span>
          <PixelIcon name="chevronLight" />
        </button>
      </form>
    </section>
  );
}
