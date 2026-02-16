/**
 * CanvasUIContext — Safe wrapper around CanvasRenderingContext2D.
 *
 * Provides high-level drawing primitives and automatic save/restore
 * state management. Every element's paint() call is sandwiched between
 * save() and restore() — elements never manage canvas state manually.
 *
 * SPEC: §8 — Rendering Wrapper (CanvasUIContext)
 */

import type { IElement } from "../core/Element";

// ── Constants ──

const TAU = Math.PI * 2;

// ── Types ──

export type FillStyle = string | CanvasGradient | CanvasPattern;

export interface ITextStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  fontStyle?: string;
  fill?: FillStyle;
  textBaseline?: CanvasTextBaseline;
  textAlign?: CanvasTextAlign;
}

export interface ICanvasUIContext {
  readonly raw: CanvasRenderingContext2D;

  // Shape primitives (6.1)
  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void;
  drawRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number | [number, number, number, number],
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void;
  drawCircle(
    cx: number,
    cy: number,
    r: number,
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void;
  drawEllipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void;
  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke: FillStyle,
    lineWidth?: number,
  ): void;
  drawPolygon(
    points: Array<{ x: number; y: number }>,
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void;
  drawPath(path: Path2D, fill?: FillStyle, stroke?: FillStyle): void;

  // Image (6.2)
  drawImage(
    image: CanvasImageSource,
    x: number,
    y: number,
    w?: number,
    h?: number,
  ): void;
  drawImageRegion(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;

  // Text (6.3)
  drawText(text: string, x: number, y: number, style: ITextStyle): void;
  measureText(
    text: string,
    style: ITextStyle,
  ): { width: number; height: number };

  // Effects (6.4)
  setShadow(
    color: string,
    blur: number,
    offsetX: number,
    offsetY: number,
  ): void;
  clearShadow(): void;

  // Clipping (6.5)
  clipRect(x: number, y: number, w: number, h: number): void;
  clipRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
  ): void;

  // Gradients (6.6)
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    stops: Array<{ offset: number; color: string }>,
  ): CanvasGradient;
  createRadialGradient(
    cx: number,
    cy: number,
    r: number,
    stops: Array<{ offset: number; color: string }>,
  ): CanvasGradient;

  // Line style (6.7)
  setLineWidth(width: number): void;
  setLineDash(segments: number[]): void;
}

// ── Helpers ──

export function buildFontString(style: ITextStyle): string {
  const weight = style.fontWeight ?? "normal";
  const fontStyle = style.fontStyle ?? "normal";
  return `${weight} ${fontStyle} ${style.fontSize}px ${style.fontFamily}`;
}

// ── CanvasUIContext Class ──

export class CanvasUIContext implements ICanvasUIContext {
  readonly raw: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.raw = ctx;
  }

  // ── Shape Primitives (6.1) ──

  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void {
    const ctx = this.raw;

    if (fill !== undefined) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    }
    if (stroke !== undefined) {
      ctx.strokeStyle = stroke;
      ctx.strokeRect(x, y, w, h);
    }
  }

  drawRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number | [number, number, number, number],
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void {
    const ctx = this.raw;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill !== undefined) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke !== undefined) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  drawCircle(
    cx: number,
    cy: number,
    r: number,
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void {
    const ctx = this.raw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    if (fill !== undefined) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke !== undefined) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  drawEllipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void {
    const ctx = this.raw;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    if (fill !== undefined) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke !== undefined) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke: FillStyle,
    lineWidth?: number,
  ): void {
    const ctx = this.raw;
    if (lineWidth !== undefined) {
      ctx.lineWidth = lineWidth;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  drawPolygon(
    points: Array<{ x: number; y: number }>,
    fill?: FillStyle,
    stroke?: FillStyle,
  ): void {
    if (points.length === 0) return;
    const ctx = this.raw;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    if (fill !== undefined) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke !== undefined) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  drawPath(path: Path2D, fill?: FillStyle, stroke?: FillStyle): void {
    const ctx = this.raw;
    if (fill !== undefined) {
      ctx.fillStyle = fill;
      ctx.fill(path);
    }
    if (stroke !== undefined) {
      ctx.strokeStyle = stroke;
      ctx.stroke(path);
    }
  }

  // ── Image Drawing (6.2) ──

  drawImage(
    image: CanvasImageSource,
    x: number,
    y: number,
    w?: number,
    h?: number,
  ): void {
    if (w !== undefined && h !== undefined) {
      this.raw.drawImage(image, x, y, w, h);
    } else {
      this.raw.drawImage(image, x, y);
    }
  }

  drawImageRegion(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    this.raw.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  // ── Text Drawing (6.3) ──

  drawText(text: string, x: number, y: number, style: ITextStyle): void {
    const ctx = this.raw;
    ctx.font = buildFontString(style);
    ctx.fillStyle = style.fill ?? "#000";
    ctx.textBaseline = style.textBaseline ?? "alphabetic";
    ctx.textAlign = style.textAlign ?? "left";
    ctx.fillText(text, x, y);
  }

  measureText(
    text: string,
    style: ITextStyle,
  ): { width: number; height: number } {
    const ctx = this.raw;
    ctx.font = buildFontString(style);
    const metrics = ctx.measureText(text);
    const width = metrics.width;

    // Use font metrics if available, otherwise fallback to fontSize * 1.2
    let height: number;
    if (
      metrics.fontBoundingBoxAscent !== undefined &&
      metrics.fontBoundingBoxDescent !== undefined
    ) {
      height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    } else {
      height = style.fontSize * 1.2;
    }

    return { width, height };
  }

  // ── Effects (6.4) ──

  setShadow(
    color: string,
    blur: number,
    offsetX: number,
    offsetY: number,
  ): void {
    const ctx = this.raw;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;
  }

  clearShadow(): void {
    const ctx = this.raw;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Clipping (6.5) ──

  clipRect(x: number, y: number, w: number, h: number): void {
    const ctx = this.raw;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
  }

  clipRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
  ): void {
    const ctx = this.raw;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
  }

  // ── Gradients (6.6) ──

  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    stops: Array<{ offset: number; color: string }>,
  ): CanvasGradient {
    const grad = this.raw.createLinearGradient(x0, y0, x1, y1);
    for (const stop of stops) {
      grad.addColorStop(stop.offset, stop.color);
    }
    return grad;
  }

  createRadialGradient(
    cx: number,
    cy: number,
    r: number,
    stops: Array<{ offset: number; color: string }>,
  ): CanvasGradient {
    const grad = this.raw.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const stop of stops) {
      grad.addColorStop(stop.offset, stop.color);
    }
    return grad;
  }

  // ── Line Style (6.7) ──

  setLineWidth(width: number): void {
    this.raw.lineWidth = width;
  }

  setLineDash(segments: number[]): void {
    this.raw.setLineDash(segments);
  }

  // ── Auto Save/Restore (6.8) ──

  beginElement(element: IElement): void {
    const ctx = this.raw;
    ctx.save();
    const m = element.worldMatrix;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.globalAlpha = element.effectiveAlpha;
    ctx.globalCompositeOperation = element.blendMode;
  }

  endElement(): void {
    this.raw.restore();
  }
}
