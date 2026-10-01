import type { PhotoSlotKey } from "@/utils/slot-metadata";

export interface DraftPhoto {
  slot: PhotoSlotKey;
  fileName: string;
}

export interface PostDraft {
  lessonTitle: string;
  caption: string;
  transcript: string;
  photos: DraftPhoto[];
}

export interface PostPhotoView {
  slot: PhotoSlotKey;
  label: string;
  imageUrl: string;
}

export interface CommentView {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface PostView {
  id: string;
  authorName: string;
  authorRole: string;
  avatarUrl: string | null;
  authorHairKey: string | null;
  lessonTitle: string;
  caption: string;
  transcript: string;
  createdAt: string;
  photos: PostPhotoView[];
  comments: CommentView[];
}

export interface ScheduleItemView {
  id: string;
  title: string;
  notes: string | null;
  scheduledFor: string;
}
