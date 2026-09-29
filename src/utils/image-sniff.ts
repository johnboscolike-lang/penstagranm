export type ImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const EXTENSIONS: Readonly<Record<ImageMime, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Checks the file's first bytes and returns its real image type, or null when it is not a supported image.
 * The browser-supplied type is never trusted, and SVG is intentionally not accepted.
 */
export function detectImageMime(bytes: Uint8Array): ImageMime | null {
  const startsWith = (signature: number[], offset = 0) => signature.every((value, index) => bytes[offset + index] === value);

  if (startsWith([0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if (startsWith([0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return "image/gif";
  }

  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }

  return null;
}

/**
 * Returns the file extension used when a detected image is saved.
 */
export function extensionForMime(mime: ImageMime): string {
  return EXTENSIONS[mime];
}
