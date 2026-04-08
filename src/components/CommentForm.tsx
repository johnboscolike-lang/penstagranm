import { useState, useTransition } from "react";
import { useRouter } from "next/router";

interface CommentFormProps {
  postId: string;
}

/**
 * Submits a new comment under a feed post and reloads the page data.
 */
export function CommentForm({ postId }: CommentFormProps) {
  const router = useRouter();
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Posts the comment body and author name to the comments API.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback(null);

    const response = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        authorName,
        body,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setFeedback(payload?.message ?? "댓글 저장에 실패했습니다.");
      return;
    }

    setAuthorName("");
    setBody("");
    startTransition(() => {
      void router.replace(router.asPath);
    });
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <div className="comment-form__row">
        <input
          className="text-input"
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="이름"
          value={authorName}
        />
        <input
          className="text-input"
          onChange={(event) => setBody(event.target.value)}
          placeholder="수업 피드백을 남겨보세요."
          value={body}
        />
        <button className="primary-button" disabled={isPending} type="submit">
          등록
        </button>
      </div>
      {feedback ? <p className="form-message form-message--error">{feedback}</p> : null}
    </form>
  );
}
