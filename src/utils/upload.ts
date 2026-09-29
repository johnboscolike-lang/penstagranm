import path from "node:path";
import { mkdir } from "node:fs/promises";

import formidable, { type Fields, type File as FormidableFile } from "formidable";
import type { NextApiRequest, PageConfig } from "next";

import { PHOTO_SLOT_META, type PhotoSlotKey } from "@/utils/slot-metadata";
import type { PostPhotoView } from "@/utils/types";

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
 * Parses a multipart post-creation request with the four fixed classroom slots.
 */
export async function parsePostMultipartRequest(req: NextApiRequest): Promise<{
  lessonTitle: string;
  caption: string;
  transcript: string;
  photos: PostPhotoView[];
}> {
  const uploadDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDirectory, { recursive: true });

  const form = formidable({
    keepExtensions: true,
    multiples: true,
    uploadDir: uploadDirectory,
    maxFiles: PHOTO_SLOT_META.length,
    filename(name, extension, part): string {
      const safeBaseName = (part.originalFilename ?? name ?? "slot")
        .replace(/[^\w\-가-힣]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      return `${Date.now()}-${safeBaseName || "slot"}${extension}`;
    },
  });

  const [fields, files] = await form.parse(req);

  return {
    lessonTitle: getStringField(fields, "lessonTitle"),
    caption: getStringField(fields, "caption"),
    transcript: getStringField(fields, "transcript"),
    photos: PHOTO_SLOT_META.flatMap((slot) => {
      const file = getUploadedFile(
        files[`photo-${slot.key}`] as FormidableFile | FormidableFile[] | undefined,
      );

      if (!file) {
        return [];
      }

      return [
        {
          slot: slot.key as PhotoSlotKey,
          label: slot.label,
          imageUrl: `/uploads/${path.basename(file.filepath)}`,
        },
      ];
    }),
  };
}
