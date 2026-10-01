import { useState } from "react";
import clsx from "clsx";

import { PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import type { StudentOption } from "@/utils/teacher-repository";

interface LoginPanelProps {
  students: StudentOption[];
  teacherEnabled: boolean;
  pinHint: string | null;
}

/**
 * 입장 화면: 학생은 자기 이름을 고르고, 선생님은 교실 PIN으로 들어온다.
 */
export function LoginPanel({ students, teacherEnabled, pinHint }: LoginPanelProps) {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [teacherName, setTeacherName] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const teams = Array.from(new Set(students.map((student) => student.teamName)));

  /**
   * Sends the login request and opens the first screen for the role on success.
   */
  async function enter(body: Record<string, string>): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; next?: string } | null;
      if (!response.ok || !payload?.next) {
        setMessage(payload?.message ?? "입장하지 못했어요. 다시 해 주세요.");
        return;
      }
      window.location.assign(payload.next);
    } catch {
      setMessage("네트워크 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="login-title" className="panel pf">
      <h2 className="panel__title" id="login-title">
        <PixelIcon name="laurel" />
        <span>
          <span className="panel__eyebrow">우리반 퀘스트</span>
          누구로 입장할까요?
        </span>
        <PixelIcon name="laurel" />
      </h2>

      <div aria-label="입장 방법" className="tabs" role="tablist">
        {(
          [
            ["student", "학생"],
            ["teacher", "선생님"],
          ] as const
        ).map(([key, label]) => (
          <button
            aria-selected={role === key}
            className={clsx("tabs__tab", role === key && "tabs__tab--on")}
            key={key}
            onClick={() => setRole(key)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {role === "student" ? (
        <div className="login-students">
          <p className="muted">내 이름을 누르면 바로 들어가요.</p>
          {teams.map((team) => (
            <div key={team}>
              <h3 className="section-label">{team}</h3>
              <ul className="student-grid">
                {students
                  .filter((student) => student.teamName === team)
                  .map((student) => (
                    <li key={student.id}>
                      <button className="student-pick card pf" disabled={busy} onClick={() => void enter({ role: "student", studentId: student.id })} type="button">
                        <PixelAvatar hairKey={student.hairKey} scale={1.4} />
                        <span>{student.name}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <form
          className="login-teacher"
          onSubmit={(event) => {
            event.preventDefault();
            void enter({ role: "teacher", pin, name: teacherName });
          }}
        >
          {teacherEnabled ? null : <p className="msg msg--error">교사 입장이 아직 설정되지 않았어요. 운영자가 TEACHER_PIN을 정해야 해요.</p>}
          <label className="field">
            <span>선생님 이름 (댓글과 피드백에 표시돼요)</span>
            <input className="input" maxLength={16} onChange={(event) => setTeacherName(event.target.value)} placeholder="예: 국어" value={teacherName} />
          </label>
          <label className="field">
            <span>교실 PIN</span>
            <input
              autoComplete="current-password"
              className="input"
              inputMode="numeric"
              onChange={(event) => setPin(event.target.value)}
              placeholder="PIN을 입력해요"
              type="password"
              value={pin}
            />
          </label>
          {pinHint ? <p className="muted">개발용 PIN: {pinHint}</p> : null}
          <button className="btn btn--block" disabled={busy || !teacherEnabled || pin.length === 0} type="submit">
            <PixelIcon name="check" />
            <span>선생님으로 입장</span>
          </button>
        </form>
      )}

      {message ? (
        <p className="msg msg--error" role="alert">
          {message}
        </p>
      ) : null}
      <p className="panel__foot muted">데모 안내: 학생은 이름만 고르면 입장하고, 선생님은 PIN이 필요해요.</p>
    </section>
  );
}
