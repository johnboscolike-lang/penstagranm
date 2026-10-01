import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { detectImageMime, extensionForMime, type ImageMime } from "@/utils/image-sniff";
import { prisma } from "@/utils/prisma";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Error for uploads that must be refused with a Korean message (wrong type, too big).
 */
export class UploadError extends Error {
  /**
   * Creates an upload error with a message that is safe to show to the user.
   */
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * Chooses where uploaded photos are kept: "local" writes files to public/uploads (default),
 * "db" keeps them in the database for serverless hosting where the disk is not persistent.
 */
export function getUploadStorageMode(env: Record<string, string | undefined> = process.env): "local" | "db" {
  return env.UPLOAD_STORAGE === "db" ? "db" : "local";
}

/**
 * Saves an uploaded image (already written to a temp file by the multipart parser) and returns its relative URL.
 * The temp file is always removed afterwards.
 */
export async function storeUploadedFile(file: { filepath: string; size: number }): Promise<string> {
  try {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new UploadError("사진이 너무 커요. 4MB 이하로 올려 주세요.");
    }

    const bytes = await readFile(file.filepath);
    const mime = detectImageMime(bytes);
    if (!mime) {
      throw new UploadError("JPG, PNG, WEBP, GIF 사진만 올릴 수 있어요.");
    }

    if (getUploadStorageMode() === "db") {
      const saved = await prisma.uploadedFile.create({ data: { mime, size: bytes.length, data: bytes } });

      return `/api/uploads/${saved.id}`;
    }

    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    const fileName = `${Date.now()}-${randomBytes(4).toString("hex")}.${extensionForMime(mime)}`;
    await copyFile(file.filepath, path.join(directory, fileName));

    return `/uploads/${fileName}`;
  } finally {
    await rm(file.filepath, { force: true });
  }
}

/**
 * Reads a photo stored in the database, or null when it does not exist.
 */
export async function readStoredUpload(id: string): Promise<{ mime: ImageMime; data: Buffer } | null> {
  const found = await prisma.uploadedFile.findUnique({ where: { id } });
  if (!found) {
    return null;
  }

  const data = Buffer.from(found.data);
  const mime = detectImageMime(data);

  return mime ? { mime, data } : null;
}
