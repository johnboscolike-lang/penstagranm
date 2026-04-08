import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { AppShell } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { getFeedPosts } from "@/utils/repository";
import type { PostView } from "@/utils/types";

interface HomePageProps {
  posts: PostView[];
}

/**
 * Loads the main feed from the database on each request.
 */
export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  const posts = await getFeedPosts();

  return {
    props: {
      posts,
    },
  };
};

/**
 * Renders the Instagram-style classroom feed and post composer.
 */
export default function HomePage({
  posts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <AppShell currentPath="feed">
      <section className="hero-grid">
        <div className="hero-card">
          <p className="hero-card__eyebrow">INSTA-STYLE FOR CLASSROOMS</p>
          <h2>준비-목표-필기-과제를 한 번에 기록하는 네 컷 수업 피드</h2>
          <p>
            수업 장면을 빠르게 아카이빙하고, 녹음 전사와 댓글로 맥락을 보강하는 교실용
            소셜 피드입니다.
          </p>
        </div>
        <div className="hero-side">
          <div className="metric-card">
            <strong>{posts.length}</strong>
            <span>업로드된 수업 기록</span>
          </div>
          <div className="metric-card">
            <strong>4</strong>
            <span>고정 사진 프레임</span>
          </div>
        </div>
      </section>

      <div className="content-grid">
        <div className="stack-column">
          <PostComposer />
          <section className="feed-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </section>
        </div>

        <aside className="panel panel--sidebar">
          <div className="section-heading">
            <div>
              <p className="section-heading__eyebrow">WORKFLOW</p>
              <h3>권장 업로드 순서</h3>
            </div>
          </div>
          <ol className="guide-list">
            <li>수업준비사진(자신 포함)으로 시작 장면을 남깁니다.</li>
            <li>수업목표사진으로 오늘의 목표를 보여줍니다.</li>
            <li>필기사진으로 설명 흐름을 남깁니다.</li>
            <li>과제사진으로 마무리 과제를 정리합니다.</li>
          </ol>
          <p className="helper-text">
            브라우저가 지원하면 녹음 내용이 한국어로 전사되어 게시글에 함께 저장됩니다.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
