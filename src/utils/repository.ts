import { PhotoSlot, Prisma } from "@prisma/client";
import { addMonths, format } from "date-fns";

import { prisma } from "@/utils/prisma";
import { getPhotoSlotMeta, sortPhotosBySlot, type PhotoSlotKey } from "@/utils/slot-metadata";
import type { CommentView, PostPhotoView, PostView, ScheduleItemView } from "@/utils/types";

const SLOT_TO_PRISMA: Record<PhotoSlotKey, PhotoSlot> = {
  prep: PhotoSlot.PREP,
  goal: PhotoSlot.GOAL,
  notes: PhotoSlot.NOTES,
  assignment: PhotoSlot.ASSIGNMENT,
};

const PRISMA_TO_SLOT: Record<PhotoSlot, PhotoSlotKey> = {
  [PhotoSlot.PREP]: "prep",
  [PhotoSlot.GOAL]: "goal",
  [PhotoSlot.NOTES]: "notes",
  [PhotoSlot.ASSIGNMENT]: "assignment",
};

type PostRecord = Prisma.PostGetPayload<{
  include: {
    comments: {
      orderBy: {
        createdAt: "asc";
      };
    };
    photos: true;
    student: {
      select: {
        hairKey: true;
      };
    };
  };
}>;

/**
 * Converts a Prisma photo record into the view model used by the UI.
 */
function mapPhotoRecord(record: PostRecord["photos"][number]): PostPhotoView {
  const slot = PRISMA_TO_SLOT[record.slot];

  return {
    slot,
    label: record.label || getPhotoSlotMeta(slot).label,
    imageUrl: record.imageUrl,
  };
}

/**
 * Converts a Prisma comment record into the serialized UI shape.
 */
function mapCommentRecord(record: PostRecord["comments"][number]): CommentView {
  return {
    id: record.id,
    authorName: record.authorName,
    body: record.body,
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * Converts a full Prisma post record into the UI model used by pages.
 */
function mapPostRecord(record: PostRecord): PostView {
  return {
    id: record.id,
    authorName: record.authorName,
    authorRole: record.authorRole,
    avatarUrl: record.avatarUrl,
    authorHairKey: record.student?.hairKey ?? null,
    lessonTitle: record.lessonTitle,
    caption: record.caption,
    transcript: record.transcript,
    createdAt: record.createdAt.toISOString(),
    photos: sortPhotosBySlot(record.photos.map(mapPhotoRecord)),
    comments: record.comments.map(mapCommentRecord),
  };
}

/**
 * Fetches the feed in reverse-chronological order with nested comments and photos.
 */
export async function getFeedPosts(): Promise<PostView[]> {
  const posts = await prisma.post.findMany({
    include: {
      comments: {
        orderBy: {
          createdAt: "asc",
        },
      },
      photos: true,
      student: {
        select: {
          hairKey: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts.map(mapPostRecord);
}

/**
 * Creates a new four-photo classroom post for the demo player.
 */
export async function createPost(input: {
  lessonTitle: string;
  caption: string;
  transcript: string;
  photos: PostPhotoView[];
}): Promise<PostView> {
  const author = await prisma.student.findFirst({
    where: { isMe: true },
    include: { team: true },
  });

  const post = await prisma.post.create({
    data: {
      studentId: author?.id,
      authorName: author?.name ?? "우리반 모험가",
      authorRole: author ? `${author.team.name} · 모험가` : "우리반 퀘스트 성장 기록",
      lessonTitle: input.lessonTitle,
      caption: input.caption,
      transcript: input.transcript,
      photos: {
        create: input.photos.map((photo) => ({
          slot: SLOT_TO_PRISMA[photo.slot],
          label: photo.label,
          imageUrl: photo.imageUrl,
        })),
      },
    },
    include: {
      comments: {
        orderBy: {
          createdAt: "asc",
        },
      },
      photos: true,
      student: {
        select: {
          hairKey: true,
        },
      },
    },
  });

  return mapPostRecord(post);
}

/**
 * Adds a comment to an existing classroom post.
 */
export async function createComment(input: {
  postId: string;
  authorName: string;
  body: string;
}): Promise<CommentView> {
  const comment = await prisma.comment.create({
    data: {
      postId: input.postId,
      authorName: input.authorName,
      body: input.body,
    },
  });

  return {
    id: comment.id,
    authorName: comment.authorName,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

/**
 * Fetches the schedule entries for a specific month (month boundaries follow Asia/Seoul).
 */
export async function getScheduleItemsForMonth(monthDate: Date): Promise<ScheduleItemView[]> {
  const start = new Date(`${format(monthDate, "yyyy-MM")}-01T00:00:00+09:00`);
  const end = new Date(`${format(addMonths(monthDate, 1), "yyyy-MM")}-01T00:00:00+09:00`);
  const items = await prisma.scheduleItem.findMany({
    where: {
      scheduledFor: {
        gte: start,
        lt: end,
      },
    },
    orderBy: {
      scheduledFor: "asc",
    },
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    notes: item.notes,
    scheduledFor: item.scheduledFor.toISOString(),
  }));
}

/**
 * Creates a new schedule entry on the classroom calendar.
 */
export async function createScheduleItem(input: {
  title: string;
  notes?: string;
  scheduledFor: Date;
}): Promise<ScheduleItemView> {
  const item = await prisma.scheduleItem.create({
    data: {
      title: input.title,
      notes: input.notes,
      scheduledFor: input.scheduledFor,
    },
  });

  return {
    id: item.id,
    title: item.title,
    notes: item.notes,
    scheduledFor: item.scheduledFor.toISOString(),
  };
}

/**
 * Finds the newest comment written by a teacher ("...선생님") so scenes can show it as speech.
 */
export async function getLatestTeacherComment(): Promise<{ who: string; body: string } | null> {
  const comment = await prisma.comment.findFirst({
    where: { authorName: { endsWith: "선생님" } },
    orderBy: { createdAt: "desc" },
  });

  return comment ? { who: comment.authorName, body: comment.body } : null;
}
