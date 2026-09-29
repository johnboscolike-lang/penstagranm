import { describe, expect, it } from "vitest";

import { detectImageMime, extensionForMime } from "@/utils/image-sniff";
import { fitWithin } from "@/utils/image-resize";

const bytes = (...values: number[]) => Uint8Array.from(values);

describe("detectImageMime", () => {
  it("recognizes JPEG, PNG, GIF and WebP by their first bytes", () => {
    expect(detectImageMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(detectImageMime(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe("image/gif");
    expect(detectImageMime(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });

  it("refuses SVG, HTML, empty and mislabeled files", () => {
    const text = (value: string) => Uint8Array.from(Buffer.from(value));

    expect(detectImageMime(text("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(detectImageMime(text("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectImageMime(new Uint8Array())).toBeNull();
    expect(detectImageMime(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45))).toBeNull();
  });

  it("maps types to file extensions", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/webp")).toBe("webp");
  });
});

describe("fitWithin", () => {
  it("keeps small images and scales large ones by their longer side", () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
    expect(fitWithin(10000, 10, 1280)).toEqual({ width: 1280, height: 1 });
  });
});
