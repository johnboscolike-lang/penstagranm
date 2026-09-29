// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTempDatabase } from "./helpers/temp-db";

type Uploads = typeof import("@/utils/uploads");

let uploads: Uploads;
let disposeDatabase: () => Promise<void>;
let workDir = "";

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4];

/**
 * Writes a temp file the way the multipart parser would and returns the descriptor.
 */
function tempFile(name: string, bytes: Buffer): { filepath: string; size: number } {
  const filepath = path.join(workDir, name);
  writeFileSync(filepath, bytes);

  return { filepath, size: bytes.length };
}

beforeAll(async () => {
  disposeDatabase = (await createTempDatabase()).dispose;
  process.env.UPLOAD_STORAGE = "db";
  uploads = await import("@/utils/uploads");
  workDir = mkdtempSync(path.join(tmpdir(), "penstagram-upload-"));
});

afterAll(async () => {
  delete process.env.UPLOAD_STORAGE;
  rmSync(workDir, { recursive: true, force: true });
  await disposeDatabase();
});

describe("storage mode", () => {
  it("defaults to local files and switches to the database on request", () => {
    expect(uploads.getUploadStorageMode({})).toBe("local");
    expect(uploads.getUploadStorageMode({ UPLOAD_STORAGE: "db" })).toBe("db");
  });
});

describe("storeUploadedFile (database mode)", () => {
  it("stores a real image, returns a relative URL, serves it back, and removes the temp file", async () => {
    const file = tempFile("ok.png", Buffer.from(PNG_HEADER));
    const url = await uploads.storeUploadedFile(file);

    expect(url).toMatch(/^\/api\/uploads\/[a-z0-9]+$/);
    expect(existsSync(file.filepath)).toBe(false);

    const stored = await uploads.readStoredUpload(url.split("/").pop() as string);
    expect(stored?.mime).toBe("image/png");
    expect(stored?.data.length).toBe(PNG_HEADER.length);
  });

  it("refuses anything that is not a supported image, whatever its name says", async () => {
    const svg = tempFile("evil.png", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"));

    await expect(uploads.storeUploadedFile(svg)).rejects.toThrow("사진만");
    expect(existsSync(svg.filepath)).toBe(false);
  });

  it("refuses photos over the size limit", async () => {
    const big = tempFile("big.png", Buffer.concat([Buffer.from(PNG_HEADER), Buffer.alloc(uploads.MAX_UPLOAD_BYTES)]));

    await expect(uploads.storeUploadedFile(big)).rejects.toThrow("너무 커요");
  });

  it("returns null for unknown ids", async () => {
    expect(await uploads.readStoredUpload("doesnotexist000")).toBeNull();
  });
});
