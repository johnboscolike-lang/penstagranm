import { useState, useTransition } from "react";
import { useRouter } from "next/router";

interface CommentFormProps {
  postId: string;
}

/**
 * Submits a new cheer comment under a growth record and reloads the page data.
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
      void router.replace(router.asPath, undefined, { scroll: false });
    });
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <div className="comment-form__row">
        <label className="sr-only" htmlFor={`comment-name-${postId}`}>
          이름
        </label>
        <input
          className="input"
          id={`comment-name-${postId}`}
          maxLength={20}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="이름"
          value={authorName}
        />
        <label className="sr-only" htmlFor={`comment-body-${postId}`}>
          응원 한마디
        </label>
        <input
          className="input"
          id={`comment-body-${postId}`}
          maxLength={200}
          onChange={(event) => setBody(event.target.value)}
          placeholder="응원 한마디를 남겨요"
          value={body}
        />
        <button className="btn btn--small" disabled={isPending} type="submit">
          등록
        </button>
      </div>
      {feedback ? (
        <p className="msg msg--error" role="alert">
          {feedback}
        </p>
      ) : null}
    </form>
  );
}
