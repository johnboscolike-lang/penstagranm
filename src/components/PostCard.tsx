import { CommentForm } from "@/components/CommentForm";
import { formatFeedTimestamp } from "@/utils/calendar";
import type { PostView } from "@/utils/types";

interface PostCardProps {
  post: PostView;
}

/**
 * Shows one classroom post with its four photos, transcript, and comments.
 */
export function PostCard({ post }: PostCardProps) {
  return (
    <article className="post-card">
      <header className="post-card__header">
        <div className="post-card__profile">
          {post.avatarUrl ? (
            <img alt={post.authorName} className="avatar" src={post.avatarUrl} />
          ) : (
            <div className="avatar avatar--fallback">{post.authorName.slice(0, 1)}</div>
          )}
          <div>
            <strong>{post.authorName}</strong>
            <p>{post.authorRole}</p>
          </div>
        </div>
        <span className="timestamp">{formatFeedTimestamp(post.createdAt)}</span>
      </header>

      <div className="post-card__body">
        <div>
          <p className="post-card__eyebrow">LESSON SNAPSHOT</p>
          <h3>{post.lessonTitle}</h3>
          <p className="post-card__caption">{post.caption}</p>
        </div>
        <div className="post-card__grid">
          {post.photos.map((photo) => (
            <figure className="post-card__figure" key={`${post.id}-${photo.slot}`}>
              <img alt={photo.label} className="post-card__image" src={photo.imageUrl} />
              <figcaption>{photo.label}</figcaption>
            </figure>
          ))}
        </div>
        {post.transcript ? (
          <details className="transcript-box">
            <summary>녹음 전사 보기</summary>
            <p>{post.transcript}</p>
          </details>
        ) : null}
      </div>

      <section className="comment-section">
        <div className="section-heading section-heading--tight">
          <div>
            <p className="section-heading__eyebrow">COMMENTS</p>
            <h4>댓글</h4>
          </div>
          <span className="comment-count">{post.comments.length}개</span>
        </div>
        <ul className="comment-list">
          {post.comments.map((comment) => (
            <li className="comment-item" key={comment.id}>
              <div className="comment-item__header">
                <strong>{comment.authorName}</strong>
                <span>{formatFeedTimestamp(comment.createdAt)}</span>
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
          {post.comments.length === 0 ? (
            <li className="comment-item comment-item--empty">첫 댓글을 남겨 수업 반응을 모아보세요.</li>
          ) : null}
        </ul>
        <CommentForm postId={post.id} />
      </section>
    </article>
  );
}
