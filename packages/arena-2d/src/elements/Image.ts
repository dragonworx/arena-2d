/**
 * Image — Element for displaying bitmaps with optional nine-slice scaling
 * and sprite sheet sub-regions.
 *
 * SPEC: §9 — Image & Texture Elements
 */

import { DirtyFlags } from "../core/DirtyFlags";
import { Element } from "../core/Element";
import type { IRect } from "../math/aabb";
import type { IArena2DContext } from "../rendering/Arena2DContext";

// ── Image Element ──

export class Image extends Element {
  private _source: CanvasImageSource | null = null;
  private _sourceRect: IRect | undefined;
  private _nineSlice: [number, number, number, number] | undefined;
  private _tint: string | undefined;

  // ── Source ──

  get source(): CanvasImageSource | null {
    return this._source;
  }

  set source(value: CanvasImageSource | null) {
    if (this._source !== value) {
      this._source = value;
      this.invalidate(DirtyFlags.Visual | DirtyFlags.Layout);
    }
  }

  // ── Source rect (sprite sheet sub-region) ──

  get sourceRect(): IRect | undefined {
    return this._sourceRect;
  }

  set sourceRect(value: IRect | undefined) {
    this._sourceRect = value;
    this.invalidate(DirtyFlags.Visual);
  }

  // ── Nine-slice insets ──

  get nineSlice(): [number, number, number, number] | undefined {
    return this._nineSlice;
  }

  set nineSlice(value: [number, number, number, number] | undefined) {
    this._nineSlice = value;
    this.invalidate(DirtyFlags.Visual);
  }

  // ── Tint ──

  get tint(): string | undefined {
    return this._tint;
  }

  set tint(value: string | undefined) {
    if (this._tint !== value) {
      this._tint = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  // ── Intrinsic sizing ──

  /**
   * Returns the natural dimensions of the source image (or sourceRect if set).
   * Used by the layout engine for auto-sizing.
   */
  getIntrinsicSize(): { width: number; height: number } {
    if (!this._source) {
      return { width: 0, height: 0 };
    }

    if (this._sourceRect) {
      return {
        width: this._sourceRect.width,
        height: this._sourceRect.height,
      };
    }

    return {
      width: getNaturalWidth(this._source),
      height: getNaturalHeight(this._source),
    };
  }

  getMinContentWidth(): number {
    return this.getIntrinsicSize().width;
  }

  getMaxContentWidth(): number {
    return this.getIntrinsicSize().width;
  }

  // ── Rendering ──

  override paint(ctx: IArena2DContext): void {
    if (!this._source) return;

    const w = this.width;
    const h = this.height;
    if (w <= 0 || h <= 0) return;

    if (this._nineSlice) {
      this._paintNineSlice(ctx, w, h);
    } else if (this._sourceRect) {
      const sr = this._sourceRect;
      ctx.drawImageRegion(
        this._source,
        sr.x,
        sr.y,
        sr.width,
        sr.height,
        0,
        0,
        w,
        h,
      );
    } else {
      ctx.drawImage(this._source, 0, 0, w, h);
    }

    // Apply tint via compositing
    if (this._tint) {
      ctx.save();
      ctx.setCompositeOperation("source-atop");
      ctx.drawRect(0, 0, w, h, { fillColor: this._tint });
      ctx.restore();
    }
  }

  /**
   * Nine-slice rendering: divides the source image into 9 regions using
   * [top, right, bottom, left] insets. Corners render at natural size,
   * edges stretch on one axis, center fills the remaining space.
   */
  private _paintNineSlice(ctx: IArena2DContext, w: number, h: number): void {
    const source = this._source as CanvasImageSource;
    const [top, right, bottom, left] = this._nineSlice as [
      number,
      number,
      number,
      number,
    ];

    // Source dimensions (from sourceRect or natural size)
    let sx = 0;
    let sy = 0;
    let sw: number;
    let sh: number;
    if (this._sourceRect) {
      sx = this._sourceRect.x;
      sy = this._sourceRect.y;
      sw = this._sourceRect.width;
      sh = this._sourceRect.height;
    } else {
      sw = getNaturalWidth(source);
      sh = getNaturalHeight(source);
    }

    // Center region of source
    const srcCenterW = sw - left - right;
    const srcCenterH = sh - top - bottom;

    // Center region of destination
    const dstCenterW = w - left - right;
    const dstCenterH = h - top - bottom;

    // Skip degenerate cases
    if (dstCenterW < 0 || dstCenterH < 0) {
      ctx.drawImageRegion(source, sx, sy, sw, sh, 0, 0, w, h);
      return;
    }

    // Draw 9 regions:
    // Top-left corner
    if (left > 0 && top > 0) {
      ctx.drawImageRegion(source, sx, sy, left, top, 0, 0, left, top);
    }
    // Top edge
    if (srcCenterW > 0 && top > 0 && dstCenterW > 0) {
      ctx.drawImageRegion(
        source,
        sx + left,
        sy,
        srcCenterW,
        top,
        left,
        0,
        dstCenterW,
        top,
      );
    }
    // Top-right corner
    if (right > 0 && top > 0) {
      ctx.drawImageRegion(
        source,
        sx + sw - right,
        sy,
        right,
        top,
        w - right,
        0,
        right,
        top,
      );
    }

    // Left edge
    if (left > 0 && srcCenterH > 0 && dstCenterH > 0) {
      ctx.drawImageRegion(
        source,
        sx,
        sy + top,
        left,
        srcCenterH,
        0,
        top,
        left,
        dstCenterH,
      );
    }
    // Center
    if (srcCenterW > 0 && srcCenterH > 0 && dstCenterW > 0 && dstCenterH > 0) {
      ctx.drawImageRegion(
        source,
        sx + left,
        sy + top,
        srcCenterW,
        srcCenterH,
        left,
        top,
        dstCenterW,
        dstCenterH,
      );
    }
    // Right edge
    if (right > 0 && srcCenterH > 0 && dstCenterH > 0) {
      ctx.drawImageRegion(
        source,
        sx + sw - right,
        sy + top,
        right,
        srcCenterH,
        w - right,
        top,
        right,
        dstCenterH,
      );
    }

    // Bottom-left corner
    if (left > 0 && bottom > 0) {
      ctx.drawImageRegion(
        source,
        sx,
        sy + sh - bottom,
        left,
        bottom,
        0,
        h - bottom,
        left,
        bottom,
      );
    }
    // Bottom edge
    if (srcCenterW > 0 && bottom > 0 && dstCenterW > 0) {
      ctx.drawImageRegion(
        source,
        sx + left,
        sy + sh - bottom,
        srcCenterW,
        bottom,
        left,
        h - bottom,
        dstCenterW,
        bottom,
      );
    }
    // Bottom-right corner
    if (right > 0 && bottom > 0) {
      ctx.drawImageRegion(
        source,
        sx + sw - right,
        sy + sh - bottom,
        right,
        bottom,
        w - right,
        h - bottom,
        right,
        bottom,
      );
    }
  }
}

// ── Helpers ──

/**
 * Get the natural width of a CanvasImageSource.
 */
function getNaturalWidth(source: CanvasImageSource): number {
  if ("naturalWidth" in source) {
    return (source as HTMLImageElement).naturalWidth;
  }
  if ("width" in source) {
    return source.width as number;
  }
  return 0;
}

/**
 * Get the natural height of a CanvasImageSource.
 */
function getNaturalHeight(source: CanvasImageSource): number {
  if ("naturalHeight" in source) {
    return (source as HTMLImageElement).naturalHeight;
  }
  if ("height" in source) {
    return source.height as number;
  }
  return 0;
}
