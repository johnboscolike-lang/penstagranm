import os from "node:os";

import formidable, { type Fields, type File as FormidableFile, type Files } from "formidable";
import type { NextApiRequest, PageConfig } from "next";

import { PHOTO_SLOT_META, type PhotoSlotKey } from "@/utils/slot-metadata";
import type { PostPhotoView } from "@/utils/types";
import { MAX_UPLOAD_BYTES, storeUploadedFile, UploadError } from "@/utils/uploads";

export const multipartApiConfig: PageConfig = {
  api: {
    bodyParser: false,
  },
};

/**
 * Reads the first string field from a parsed multipart payload.
 */
function getStringField(fields: Fields, fieldName: string): string {
  const rawValue = fields[fieldName];
  if (Array.isArray(rawValue)) {
    return `${rawValue[0] ?? ""}`.trim();
  }

  return `${rawValue ?? ""}`.trim();
}

/**
 * Normalizes a formidable file entry into a single file reference.
 */
function getUploadedFile(entry: FormidableFile | FormidableFile[] | undefined): FormidableFile | null {
  if (!entry) {
    return null;
  }

  return Array.isArray(entry) ? entry[0] ?? null : entry;
}

/**
 * Parses a multipart request into text fields and temp files. Files land in the OS temp folder first
 * because serverless hosts only allow writing there.
 */
async function parseMultipart(req: NextApiRequest, maxFiles: number): Promise<{ fields: Fields; files: Files }> {
  const form = formidable({
    keepExtensions: true,
    multiples: true,
    uploadDir: os.tmpdir(),
    maxFiles,
    maxFileSize: MAX_UPLOAD_BYTES,
  });

  try {
    const [fields, files] = await form.parse(req);

    return { fields, files };
  } catch (error: unknown) {
    const code = (error as { code?: number }).code;
    if (code === 1009) {
      throw new UploadError("사진이 너무 커요. 4MB 이하로 올려 주세요.");
    }
    if (code === 1015) {
      throw new UploadError("사진은 한 번에 정해진 장수만 올릴 수 있어요.");
    }
    throw error;
  }
}

/**
 * Parses a multipart post-creation request with the four fixed classroom slots.
 */
export async function parsePostMultipartRequest(req: NextApiRequest): Promise<{
  lessonTitle: string;
  caption: string;
  transcript: string;
  photos: PostPhotoView[];
}> {
  const { fields, files } = await parseMultipart(req, PHOTO_SLOT_META.length);
  const photos: PostPhotoView[] = [];

  for (const slot of PHOTO_SLOT_META) {
    const file = getUploadedFile(files[`photo-${slot.key}`] as FormidableFile | FormidableFile[] | undefined);
    if (file) {
      photos.push({ slot: slot.key as PhotoSlotKey, label: slot.label, imageUrl: await storeUploadedFile(file) });
    }
  }

  return {
    lessonTitle: getStringField(fields, "lessonTitle"),
    caption: getStringField(fields, "caption"),
    transcript: getStringField(fields, "transcript"),
    photos,
  };
}

/**
 * Parses a proof-photo request: one card id and one photo.
 */
export async function parseProofMultipartRequest(req: NextApiRequest): Promise<{ promiseId: string; imageUrl: string }> {
  const { fields, files } = await parseMultipart(req, 1);
  const file = getUploadedFile(files.photo as FormidableFile | FormidableFile[] | undefined);
  if (!file) {
    throw new UploadError("사진을 골라 주세요.");
  }

  return { promiseId: getStringField(fields, "promiseId"), imageUrl: await storeUploadedFile(file) };
}
