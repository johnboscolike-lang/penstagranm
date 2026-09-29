export type PixelPalette = Readonly<Record<string, string>>;

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

export interface PixelSize {
  width: number;
  height: number;
}

/**
 * Measures a pixel-art grid: the widest row decides the width.
 */
export function measurePixelRows(rows: readonly string[]): PixelSize {
  return {
    width: rows.reduce((max, row) => Math.max(max, row.length), 0),
    height: rows.length,
  };
}

/**
 * Converts an ASCII pixel grid into merged rectangles.
 * Each character maps to a palette color; "." and space are transparent.
 * Horizontal runs are merged first, then identical runs on consecutive rows are stacked.
 */
export function rowsToRects(rows: readonly string[], palette: PixelPalette): PixelRect[] {
  const rects: PixelRect[] = [];
  const openRuns = new Map<string, PixelRect>();

  rows.forEach((row, y) => {
    const seenThisRow = new Set<string>();
    let x = 0;

    while (x < row.length) {
      const symbol = row[x];
      const fill = palette[symbol];
      if (symbol === "." || symbol === " " || fill === undefined) {
        x += 1;
        continue;
      }

      let end = x;
      while (end + 1 < row.length && row[end + 1] === symbol) {
        end += 1;
      }

      const width = end - x + 1;
      const runKey = `${x}:${width}:${symbol}`;
      const open = openRuns.get(runKey);
      if (open && open.y + open.h === y) {
        open.h += 1;
      } else {
        const rect: PixelRect = { x, y, w: width, h: 1, fill };
        rects.push(rect);
        openRuns.set(runKey, rect);
      }
      seenThisRow.add(runKey);
      x = end + 1;
    }

    openRuns.forEach((_rect, key) => {
      if (!seenThisRow.has(key)) {
        openRuns.delete(key);
      }
    });
  });

  return rects;
}

/**
 * Renders a pixel grid as standalone SVG markup, e.g. for data-URI placeholder images.
 */
export function rowsToSvgMarkup(
  rows: readonly string[],
  palette: PixelPalette,
  options: { background?: string; padding?: number; intrinsic?: boolean } = {},
): string {
  const { width, height } = measurePixelRows(rows);
  const padding = options.padding ?? 0;
  const totalWidth = width + padding * 2;
  const totalHeight = height + padding * 2;
  const background = options.background
    ? `<rect width="${totalWidth}" height="${totalHeight}" fill="${options.background}"/>`
    : "";
  const body = rowsToRects(rows, palette)
    .map((rect) => `<rect x="${rect.x + padding}" y="${rect.y + padding}" width="${rect.w}" height="${rect.h}" fill="${rect.fill}"/>`)
    .join("");

  const size = options.intrinsic ? ` width="${totalWidth}" height="${totalHeight}"` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg"${size} viewBox="0 0 ${totalWidth} ${totalHeight}" shape-rendering="crispEdges">${background}${body}</svg>`;
}

/**
 * Wraps SVG markup into a data URI that can be used as an image source.
 */
export function svgToDataUri(svgMarkup: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}`;
}
