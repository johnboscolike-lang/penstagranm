export const MAX_IMAGE_SIDE = 1280;
export const SKIP_RESIZE_BYTES = 350 * 1024;

/**
 * Scales a size down so its longer side is at most maxSide, keeping the aspect ratio. Smaller images stay as they are.
 */
export function fitWithin(width: number, height: number, maxSide: number = MAX_IMAGE_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { width, height };
  }

  const ratio = maxSide / longest;

  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/**
 * Shrinks a phone photo in the browser before upload (max 1280px JPEG), so it fits serverless request limits.
 * If anything goes wrong, the original file is returned and the server decides.
 */
export async function resizeImageFile(file: File, maxSide: number = MAX_IMAGE_SIDE): Promise<File> {
  try {
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      return file;
    }

    const bitmap = await createImageBitmap(file);
    const target = fitWithin(bitmap.width, bitmap.height, maxSide);
    if (file.size <= SKIP_RESIZE_BYTES && target.width === bitmap.width) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
