import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { LoginPanel } from "@/components/auth/LoginPanel";
import { PublicShell } from "@/components/GameShell";
import { SchoolScene } from "@/components/scenes/SchoolScene";
import { getRequestSession } from "@/utils/auth-guard";
import { getTeacherPin } from "@/utils/session";
import { listStudentOptions, type StudentOption } from "@/utils/teacher-repository";

interface LoginPageProps {
  students: StudentOption[];
  teacherEnabled: boolean;
  pinHint: string | null;
}

/**
 * Sends people who are already inside to their home screen, unless they asked to switch.
 */
export const getServerSideProps: GetServerSideProps<LoginPageProps> = async (context) => {
  const session = getRequestSession(context.req);
  if (session && context.query.switch !== "1") {
    return { redirect: { destination: session.role === "teacher" ? "/teacher" : "/", permanent: false } };
  }

  const pin = getTeacherPin();

  return {
    props: {
      students: await listStudentOptions(),
      teacherEnabled: pin !== null,
      pinHint: process.env.NODE_ENV === "production" ? null : pin,
    },
  };
};

/**
 * 입장 화면.
 */
export default function LoginPage({ students, teacherEnabled, pinHint }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <PublicShell pageTitle="입장" scene={<SchoolScene bubble="오늘도 작은 약속부터 시작해 볼까?" hairKey="silver" />}>
      <LoginPanel pinHint={pinHint} students={students} teacherEnabled={teacherEnabled} />
    </PublicShell>
  );
}
