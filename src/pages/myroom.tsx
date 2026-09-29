import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { GameShell } from "@/components/GameShell";
import { guardPage } from "@/utils/auth-guard";
import { PostCard } from "@/components/PostCard";
import { ProfileCard, RecordsHeader, WeekNewsCard, YardShop } from "@/components/room/RoomPanels";
import { RoomScene } from "@/components/scenes/RoomScene";
import { getFeedPosts } from "@/utils/repository";
import { getLastWeekNewsView, getOwnedItemKeys, getPageBase, loadRoster } from "@/utils/quest-repository";
import type { WeekNews } from "@/utils/quest-board";
import type { HudView } from "@/utils/quest-types";
import type { PostView } from "@/utils/types";

interface MyRoomPageProps {
  hud: HudView;
  emblem: string;
  news: WeekNews;
  ownedItemKeys: string[];
  posts: PostView[];
}

/**
 * Loads the player's profile, last week's news, owned yard items, and the growth-record feed.
 */
export const getServerSideProps: GetServerSideProps<MyRoomPageProps> = async (context) => {
  const guard = guardPage(context, "student");
  if (!guard.ok) {
    return guard.result;
  }

  const { hud, meId, todayKey } = await getPageBase(guard.session.studentId as string);
  const [news, ownedItemKeys, posts, roster] = await Promise.all([
    getLastWeekNewsView(todayKey, meId),
    getOwnedItemKeys(meId),
    getFeedPosts(),
    loadRoster(meId),
  ]);

  return {
    props: {
      hud,
      emblem: roster.teams.find((team) => team.id === roster.me.teamId)?.emblem ?? "star",
      news,
      ownedItemKeys,
      posts,
    },
  };
};

/**
 * 내공간: 아바타와 집, 누적 성장, 앞마당 꾸미기, 그리고 네 컷 성장 기록.
 */
export default function MyRoomPage({
  hud,
  emblem,
  news,
  ownedItemKeys,
  posts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <GameShell
      banner="쌓이는 성장"
      hud={hud}
      pageTitle="내공간"
      scene={<RoomScene hairKey={hud.hairKey} hasMail={news.badge !== null || news.voucherEarned} ownedItemKeys={ownedItemKeys} />}
      space="room"
    >
      <ProfileCard emblem={emblem} hud={hud} />
      <WeekNewsCard news={news} />
      <YardShop coins={hud.coins} ownedItemKeys={ownedItemKeys} />
      <section aria-label="성장 기록" className="records" id="records">
        <RecordsHeader count={posts.length} />
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </GameShell>
  );
}
