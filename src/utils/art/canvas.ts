import type { PixelPalette } from "@/utils/pixel";

export interface ArtSpec {
  rows: string[];
  palette: PixelPalette;
}

/**
 * Creates a small deterministic random generator (mulberry32) so procedural art is identical on every run.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A character grid used to paint pixel art with simple shapes before it is turned into SVG.
 * "." is transparent. Every other character is looked up in a palette later.
 */
export class PixelCanvas {
  readonly width: number;
  readonly height: number;
  private readonly cells: string[][];

  /**
   * Creates an empty (transparent) canvas.
   */
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = Array.from({ length: height }, () => Array.from({ length: width }, () => "."));
  }

  /**
   * Tells whether a coordinate lies inside the canvas.
   */
  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /**
   * Reads one cell, returning "." outside the canvas.
   */
  get(x: number, y: number): string {
    return this.inside(x, y) ? this.cells[y][x] : ".";
  }

  /**
   * Paints one cell if it is inside the canvas.
   */
  set(x: number, y: number, symbol: string): this {
    if (this.inside(x, y)) {
      this.cells[y][x] = symbol;
    }

    return this;
  }

  /**
   * Fills a rectangle.
   */
  rect(x: number, y: number, w: number, h: number, symbol: string): this {
    for (let row = y; row < y + h; row += 1) {
      for (let column = x; column < x + w; column += 1) {
        this.set(column, row, symbol);
      }
    }

    return this;
  }

  /**
   * Draws a one-cell-wide rectangle outline.
   */
  frame(x: number, y: number, w: number, h: number, symbol: string): this {
    this.rect(x, y, w, 1, symbol);
    this.rect(x, y + h - 1, w, 1, symbol);
    this.rect(x, y, 1, h, symbol);
    this.rect(x + w - 1, y, 1, h, symbol);

    return this;
  }

  /**
   * Fills an ellipse centered on a point. The radii get a small bias so small circles look round in pixels.
   */
  ellipse(cx: number, cy: number, rx: number, ry: number, symbol: string): this {
    const biasedRx = rx + 0.4;
    const biasedRy = ry + 0.4;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x - cx) / biasedRx;
        const dy = (y - cy) / biasedRy;
        if (dx * dx + dy * dy <= 1) {
          this.set(x, y, symbol);
        }
      }
    }

    return this;
  }

  /**
   * Draws a straight line with Bresenham's algorithm.
   */
  line(x0: number, y0: number, x1: number, y1: number, symbol: string): this {
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;

    for (;;) {
      this.set(x, y, symbol);
      if (x === x1 && y === y1) {
        break;
      }
      const doubled = 2 * error;
      if (doubled >= dy) {
        error += dy;
        x += sx;
      }
      if (doubled <= dx) {
        error += dx;
        y += sy;
      }
    }

    return this;
  }

  /**
   * Copies another ASCII grid onto this canvas at an offset ("." is skipped).
   */
  stamp(x: number, y: number, rows: readonly string[]): this {
    rows.forEach((row, rowIndex) => {
      Array.from(row).forEach((symbol, columnIndex) => {
        if (symbol !== "." && symbol !== " ") {
          this.set(x + columnIndex, y + rowIndex, symbol);
        }
      });
    });

    return this;
  }

  /**
   * Repaints cells that currently hold one of the given symbols by calling a chooser.
   */
  repaint(matches: string, choose: (x: number, y: number) => string | null): this {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (matches.includes(this.cells[y][x])) {
          const next = choose(x, y);
          if (next !== null) {
            this.cells[y][x] = next;
          }
        }
      }
    }

    return this;
  }

  /**
   * Adds a one-cell outline around every painted shape (4-neighbour), the chunky sticker look.
   */
  outline(symbol: string): this {
    const marks: [number, number][] = [];
    for (let y = -1; y <= this.height; y += 1) {
      for (let x = -1; x <= this.width; x += 1) {
        if (this.get(x, y) !== ".") {
          continue;
        }
        const touches =
          this.get(x + 1, y) !== "." || this.get(x - 1, y) !== "." || this.get(x, y + 1) !== "." || this.get(x, y - 1) !== ".";
        if (touches) {
          marks.push([x, y]);
        }
      }
    }
    marks.forEach(([x, y]) => this.set(x, y, symbol));

    return this;
  }

  /**
   * Returns the canvas as ASCII rows.
   */
  toRows(): string[] {
    return this.cells.map((row) => row.join(""));
  }
}

/**
 * Creates a canvas that is larger than its content so an outline fits, drawn by a callback.
 */
export function paint(width: number, height: number, draw: (canvas: PixelCanvas) => void): string[] {
  const canvas = new PixelCanvas(width, height);
  draw(canvas);

  return canvas.toRows();
}
