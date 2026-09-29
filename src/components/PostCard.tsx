import clsx from "clsx";

import { CommentForm } from "@/components/CommentForm";
import { PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import { formatFeedTimestamp } from "@/utils/calendar";
import type { PostView } from "@/utils/types";

interface PostCardProps {
  post: PostView;
}

/**
 * Tells whether a commenter is a teacher so the comment can carry the teacher badge.
 */
function isTeacherName(name: string): boolean {
  return name.endsWith("선생님");
}

/**
 * 성장 기록 한 장: 준비·목표·필기·과제 네 컷, 전사, 친구와 선생님의 응원 댓글.
 */
export function PostCard({ post }: PostCardProps) {
  return (
    <article className="post card pf">
      <header className="post__header">
        <span className="post__avatar">
          <PixelAvatar hairKey={post.authorHairKey ?? "silver"} label={post.authorName} scale={1.1} />
        </span>
        <div className="post__who">
          <strong>{post.authorName}</strong>
          <span className="muted">{post.authorRole}</span>
        </div>
        <time className="muted" dateTime={post.createdAt}>
          {formatFeedTimestamp(post.createdAt)}
        </time>
      </header>

      <div className="post__body">
        <h3>{post.lessonTitle}</h3>
        <p>{post.caption}</p>
        <div className="post__grid">
          {post.photos.map((photo) => (
            <figure className="post__figure" key={`${post.id}-${photo.slot}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 이미지와 시드 도트 이미지를 그대로 보여 준다. */}
              <img alt={photo.label} className="post__image" src={photo.imageUrl} />
              <figcaption>{photo.label}</figcaption>
            </figure>
          ))}
        </div>
        {post.transcript ? (
          <details className="transcript">
            <summary>
              <PixelIcon name="book" /> 녹음 전사 보기
            </summary>
            <p>{post.transcript}</p>
          </details>
        ) : null}
      </div>

      <section aria-label="응원 댓글" className="comments">
        <h4>
          <PixelIcon name="heart" /> 응원 댓글 <span className="muted">{post.comments.length}개</span>
        </h4>
        <ul className="comments__list">
          {post.comments.map((comment) => (
            <li className={clsx("comment", isTeacherName(comment.authorName) && "comment--teacher")} key={comment.id}>
              <div className="comment__head">
                <strong>{comment.authorName}</strong>
                {isTeacherName(comment.authorName) ? <span className="tag tag--teal">교과 선생님</span> : null}
                <span className="muted">{formatFeedTimestamp(comment.createdAt)}</span>
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
          {post.comments.length === 0 ? <li className="muted">첫 응원 댓글을 남겨 주세요.</li> : null}
        </ul>
        <CommentForm postId={post.id} />
      </section>
    </article>
  );
}
