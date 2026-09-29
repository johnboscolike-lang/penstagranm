import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";

import { PixelIcon } from "@/components/pixel/PixelSprite";
import { guardPage } from "@/utils/auth-guard";
import { GameShell } from "@/components/GameShell";
import { SchoolPanel } from "@/components/school/SchoolPanel";
import { SchoolScene } from "@/components/scenes/SchoolScene";
import { getPageBase, getTodayView, getUpcomingSchedule } from "@/utils/quest-repository";
import type { HudView } from "@/utils/quest-types";
import { buildSchoolPanelData, type SchoolPanelData } from "@/utils/school-view";

interface SchoolPageProps {
  hud: HudView;
  school: SchoolPanelData;
  promisesDone: number;
  promisesTotal: number;
  isSchoolDay: boolean;
}

/**
 * Loads the school panel data and a one-line summary of today's promises.
 */
export const getServerSideProps: GetServerSideProps<SchoolPageProps> = async (context) => {
  const guard = guardPage(context, "student");
  if (!guard.ok) {
    return guard.result;
  }

  const { hud, meId, todayKey } = await getPageBase(guard.session.studentId as string);
  const [schedule, today] = await Promise.all([getUpcomingSchedule(todayKey, 4), getTodayView(meId, todayKey)]);

  return {
    props: {
      hud,
      school: buildSchoolPanelData(new Date(), schedule),
      promisesDone: today.promises.filter((promise) => promise.confirmedUnitNos.length === promise.unitCount).length,
      promisesTotal: today.promises.length,
      isSchoolDay: today.isSchoolDay,
    },
  };
};

/**
 * 학교 공간: 공지·시간표·급식·일정을 게임 성과 없이 바로 확인하는 첫 화면.
 */
export default function SchoolPage({
  hud,
  school,
  promisesDone,
  promisesTotal,
  isSchoolDay,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <GameShell
      banner="현실의 학교가 게임 속으로"
      hud={hud}
      pageTitle="학교"
      scene={<SchoolScene bubble="오늘 학교 소식부터 확인해 볼까?" hairKey={hud.hairKey} />}
      space="school"
    >
      <SchoolPanel data={school} />

      <Link className="teaser card card--mint pf" href="/challenge">
        <PixelIcon name="challenge" scale={1.4} />
        <span className="teaser__text">
          <span>
            {isSchoolDay ? (
              <>
                오늘 약속 <strong>{promisesDone} / {promisesTotal}</strong> 완료
              </>
            ) : (
              "주말에는 쉬어가요. 월요일에 새 출발!"
            )}
          </span>
          <small>주간도전에서 약속 칸을 채워요</small>
        </span>
        <PixelIcon name="chevron" />
      </Link>
    </GameShell>
  );
}
