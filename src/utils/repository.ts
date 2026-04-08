import { PhotoSlot, Prisma } from "@prisma/client";
import { endOfMonth, startOfMonth } from "date-fns";

import { prisma } from "@/utils/prisma";
import { getPhotoSlotMeta, sortPhotosBySlot, type PhotoSlotKey } from "@/utils/slot-metadata";
import type { CommentView, PostPhotoView, PostView, ScheduleItemView } from "@/utils/types";

const DEFAULT_AVATAR =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' x2='100%25' y1='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23ff7a59'/%3E%3Cstop offset='100%25' stop-color='%23f43f5e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='160' height='160' rx='80' fill='url(%23g)'/%3E%3Ctext x='80' y='96' text-anchor='middle' fill='white' font-size='54' font-family='Arial' font-weight='700'%3E펜%3C/text%3E%3C/svg%3E";

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
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts.map(mapPostRecord);
}

/**
 * Creates a new four-photo classroom post.
 */
export async function createPost(input: {
  lessonTitle: string;
  caption: string;
  transcript: string;
  photos: PostPhotoView[];
}): Promise<PostView> {
  const post = await prisma.post.create({
    data: {
      authorName: "펜 선생님",
      authorRole: "응용프로그래밍 수업 아카이브",
      avatarUrl: DEFAULT_AVATAR,
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
 * Fetches the schedule entries for a specific month.
 */
export async function getScheduleItemsForMonth(monthDate: Date): Promise<ScheduleItemView[]> {
  const items = await prisma.scheduleItem.findMany({
    where: {
      scheduledFor: {
        gte: startOfMonth(monthDate),
        lte: endOfMonth(monthDate),
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
