/**
 * Arena2DContext — Safe wrapper around CanvasRenderingContext2D.
 *
 * Provides high-level drawing primitives and automatic save/restore
 * state management. Every element's paint() call is sandwiched between
 * save() and restore() — elements never manage canvas state manually.
 *
 * SPEC: §8 — Rendering Wrapper (Arena2DContext)
 */

import type { IGeometry, IRectangle, ICircle, IEllipse, ILine, IPolygon, IArc, IQuadraticCurve, IBezierCurve, IPath } from "../geometry/types";
import type { IElement } from "../core/Element";

// ── Constants ──

const TAU = Math.PI * 2;

// ── Types ──

export type FillStyle = string | CanvasGradient | CanvasPattern;

export interface PaintStyle {
  fillColor?: FillStyle;
  strokeColor?: FillStyle;
  lineWidth?: number;
  alpha?: number;
}

export interface IRenderTextStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  fontStyle?: string;
  fill?: FillStyle;
  textBaseline?: CanvasTextBaseline;
  textAlign?: CanvasTextAlign;
}

export type CanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface IArena2DContext {
  raw: CanvasContext;

  // Shape primitives (6.1)
  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    style?: PaintStyle,
  ): void;
  drawRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number | [number, number, number, number],
    style?: PaintStyle,
  ): void;
  drawCircle(
    cx: number,
    cy: number,
    r: number,
    style?: PaintStyle,
  ): void;
  drawEllipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    style?: PaintStyle,
  ): void;
  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    style?: PaintStyle,
  ): void;
  drawPolygon(
    points: Array<{ x: number; y: number }>,
    style?: PaintStyle,
    closed?: boolean,
  ): void;
  drawPath(path: Path2D, style?: PaintStyle): void;
  drawGeometry(geometry: IGeometry, style?: PaintStyle): void;

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
  drawText(text: string, x: number, y: number, style: IRenderTextStyle): void;
  measureText(
    text: string,
    style: IRenderTextStyle,
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

  // State setters (6.8)
  setFillStyle(style: FillStyle): void;
  setStrokeStyle(style: FillStyle): void;
  setFont(style: IRenderTextStyle): void;
  setTextBaseline(baseline: CanvasTextBaseline): void;
  setTextAlign(align: CanvasTextAlign): void;
  setGlobalAlpha(alpha: number): void;
  setCompositeOperation(op: GlobalCompositeOperation): void;

  // Low-level draw calls — use current canvas state (6.9)
  fillText(text: string, x: number, y: number): void;
  strokeText(text: string, x: number, y: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;

  // State scoping (6.10)
  save(): void;
  restore(): void;
}

// ── Helpers ──

export function buildFontString(style: IRenderTextStyle): string {
  const weight = style.fontWeight ?? "normal";
  const fontStyle = style.fontStyle ?? "normal";
  return `${weight} ${fontStyle} ${style.fontSize}px ${style.fontFamily}`;
}

// ── Arena2DContext Class ──

/**
 * Concrete implementation of IArena2DContext.
 */
export class Arena2DContext implements IArena2DContext {
  /** The underlying canvas rendering context. */
  raw: CanvasContext;

  /**
   * Creates a new Arena2DContext.
   * @param ctx - The canvas rendering context to wrap.
   */
  constructor(ctx: CanvasContext) {
    this.raw = ctx;
  }

  /**
   * Updates the wrapped canvas context. Allows reusing a single Arena2DContext
   * for multiple rendering operations with different canvas contexts.
   * @param ctx - The new canvas rendering context to wrap.
   */
  setContext(ctx: CanvasContext): void {
    this.raw = ctx;
  }

  // ── Shape Primitives (6.1) ──

  private _applyFillStroke(style?: PaintStyle): void {
    const ctx = this.raw;
    if (style?.lineWidth !== undefined) ctx.lineWidth = style.lineWidth;
    if (style?.alpha !== undefined) ctx.globalAlpha = style.alpha;
    if (style === undefined) {
      ctx.fill();  // use current state
    } else if (style.fillColor !== undefined) {
      ctx.fillStyle = style.fillColor;
      ctx.fill();
    }
    if (style?.strokeColor !== undefined) {
      ctx.strokeStyle = style.strokeColor;
      ctx.stroke();
    }
  }

  /**
   * Draws a rectangle with optional fill and stroke.
   * @param x - The top-left X coordinate.
   * @param y - The top-left Y coordinate.
   * @param w - The width.
   * @param h - The height.
   * @param style - Optional paint style (fill, stroke, lineWidth, alpha).
   */
  drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    style?: PaintStyle,
  ): void {
    const ctx = this.raw;
    if (style?.lineWidth !== undefined) ctx.lineWidth = style.lineWidth;
    if (style?.alpha !== undefined) ctx.globalAlpha = style.alpha;
    if (style === undefined) {
      ctx.fillRect(x, y, w, h);  // use current state
    } else {
      if (style.fillColor !== undefined) { ctx.fillStyle = style.fillColor; ctx.fillRect(x, y, w, h); }
      if (style.strokeColor !== undefined) { ctx.strokeStyle = style.strokeColor; ctx.strokeRect(x, y, w, h); }
    }
  }

  /**
   * Draws a rectangle with rounded corners.
   * @param x - The top-left X coordinate.
   * @param y - The top-left Y coordinate.
   * @param w - The width.
   * @param h - The height.
   * @param radius - Corner radius (single value or array of [tl, tr, br, bl]).
   * @param style - Optional paint style (fill, stroke, lineWidth, alpha).
   */
  drawRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number | [number, number, number, number],
    style?: PaintStyle,
  ): void {
    const ctx = this.raw;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    this._applyFillStroke(style);
  }

  /**
   * Draws a circle.
   * @param cx - Center X coordinate.
   * @param cy - Center Y coordinate.
   * @param r - Radius.
   * @param style - Optional paint style (fill, stroke, lineWidth, alpha).
   */
  drawCircle(
    cx: number,
    cy: number,
    r: number,
    style?: PaintStyle,
  ): void {
    const ctx = this.raw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    this._applyFillStroke(style);
  }

  /**
   * Draws an ellipse.
   * @param cx - Center X coordinate.
   * @param cy - Center Y coordinate.
   * @param rx - Horizontal radius.
   * @param ry - Vertical radius.
   * @param style - Optional paint style (fill, stroke, lineWidth, alpha).
   */
  drawEllipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    style?: PaintStyle,
  ): void {
    const ctx = this.raw;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    this._applyFillStroke(style);
  }

  /**
   * Draws a line segment.
   * @param x1 - Start X coordinate.
   * @param y1 - Start Y coordinate.
   * @param x2 - End X coordinate.
   * @param y2 - End Y coordinate.
   * @param style - Optional paint style (stroke, lineWidth, alpha).
   */
  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    style?: PaintStyle,
  ): void {
    const ctx = this.raw;
    if (style?.lineWidth !== undefined) ctx.lineWidth = style.lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    if (style?.strokeColor !== undefined) { ctx.strokeStyle = style.strokeColor; ctx.stroke(); }
    else { ctx.stroke(); }  // use current strokeStyle
  }

  drawPolygon(
    points: Array<{ x: number; y: number }>,
    style?: PaintStyle,
    closed: boolean = true,
  ): void {
    if (points.length === 0) return;
    const ctx = this.raw;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    if (closed) {
      ctx.closePath();
    }
    this._applyFillStroke(style);
  }

  drawPath(path: Path2D, style?: PaintStyle): void {
    const ctx = this.raw;
    if (style?.lineWidth !== undefined) ctx.lineWidth = style.lineWidth;
    if (style === undefined) { ctx.fill(path); }
    else {
      if (style.fillColor !== undefined) { ctx.fillStyle = style.fillColor; ctx.fill(path); }
      if (style.strokeColor !== undefined) { ctx.strokeStyle = style.strokeColor; ctx.stroke(path); }
    }
  }

  drawGeometry(
    geometry: IGeometry,
    style?: PaintStyle,
  ): void {
    const ctx = this.raw;
    const type = geometry.type;

    if (type === "rectangle") {
      const g = geometry as IRectangle;
      this.drawRect(g.rectX, g.rectY, g.width, g.height, style);
    } else if (type === "circle") {
      const g = geometry as ICircle;
      this.drawCircle(g.cx, g.cy, g.radius, style);
    } else if (type === "ellipse") {
      const g = geometry as IEllipse;
      this.drawEllipse(g.cx, g.cy, g.rx, g.ry, style);
    } else if (type === "line") {
      const g = geometry as ILine;
      this.drawLine(g.x1, g.y1, g.x2, g.y2, style);
    } else if (type === "polygon") {
      const g = geometry as IPolygon;
      this.drawPolygon(g.points, style, g.closed);
    } else if (type === "arc") {
      const g = geometry as IArc;
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.radius, g.startAngle, g.endAngle, g.counterclockwise);
      if (style?.strokeColor !== undefined) {
        ctx.strokeStyle = style.strokeColor;
        ctx.stroke();
      }
    } else if (type === "quadraticCurve") {
      const g = geometry as IQuadraticCurve;
      ctx.beginPath();
      ctx.moveTo(g.x0, g.y0);
      ctx.quadraticCurveTo(g.cpx, g.cpy, g.x1, g.y1);
      if (style?.strokeColor !== undefined) {
        ctx.strokeStyle = style.strokeColor;
        ctx.stroke();
      }
    } else if (type === "bezierCurve") {
      const g = geometry as IBezierCurve;
      const cp = g.controlPoints;
      if (cp.length >= 2) {
        if (cp.length === 4) {
          ctx.beginPath();
          ctx.moveTo(cp[0].x, cp[0].y);
          ctx.bezierCurveTo(cp[1].x, cp[1].y, cp[2].x, cp[2].y, cp[3].x, cp[3].y);
        } else {
          ctx.beginPath();
          ctx.moveTo(cp[0].x, cp[0].y);
          const samples = 32;
          for (let i = 1; i <= samples; i++) {
            const pt = g.pointAt(i / samples);
            const local = (g as any).worldToLocal(pt.x, pt.y);
            ctx.lineTo(local.x, local.y);
          }
        }
        if (style?.strokeColor !== undefined) {
          ctx.strokeStyle = style.strokeColor;
          ctx.stroke();
        }
      }
    } else if (type === "path") {
      const g = geometry as IPath;
      ctx.beginPath();
      for (const seg of g.segments) {
        if (seg.type === "moveTo") ctx.moveTo(seg.x, seg.y);
        else if (seg.type === "lineTo") ctx.lineTo(seg.x, seg.y);
        else if (seg.type === "quadraticCurveTo") ctx.quadraticCurveTo(seg.cpx, seg.cpy, seg.x, seg.y);
        else if (seg.type === "bezierCurveTo") ctx.bezierCurveTo(seg.cp1x, seg.cp1y, seg.cp2x, seg.cp2y, seg.x, seg.y);
        else if (seg.type === "arc") ctx.arc(seg.cx, seg.cy, seg.radius, seg.startAngle, seg.endAngle, seg.counterclockwise);
        else if (seg.type === "closePath") ctx.closePath();
      }
      if (style?.strokeColor !== undefined) {
        ctx.strokeStyle = style.strokeColor;
        ctx.stroke();
      }
    } else if (type === "composite") {
      if (geometry.children) {
        for (const child of geometry.children) {
          ctx.save();
          const m = child.localMatrix;
          ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
          this.drawGeometry(child, style);
          ctx.restore();
        }
      }
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

  drawText(text: string, x: number, y: number, style: IRenderTextStyle): void {
    const ctx = this.raw;
    ctx.font = buildFontString(style);
    ctx.fillStyle = style.fill ?? "#000";
    ctx.textBaseline = style.textBaseline ?? "alphabetic";
    ctx.textAlign = style.textAlign ?? "left";
    ctx.fillText(text, x, y);
  }

  measureText(
    text: string,
    style: IRenderTextStyle,
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

  // ── State Setters (6.8) ──

  setFillStyle(style: FillStyle): void {
    this.raw.fillStyle = style;
  }

  setStrokeStyle(style: FillStyle): void {
    this.raw.strokeStyle = style;
  }

  setFont(style: IRenderTextStyle): void {
    this.raw.font = buildFontString(style);
  }

  setTextBaseline(baseline: CanvasTextBaseline): void {
    this.raw.textBaseline = baseline;
  }

  setTextAlign(align: CanvasTextAlign): void {
    this.raw.textAlign = align;
  }

  setGlobalAlpha(alpha: number): void {
    this.raw.globalAlpha = alpha;
  }

  setCompositeOperation(op: GlobalCompositeOperation): void {
    this.raw.globalCompositeOperation = op;
  }

  // ── Low-level Draws (6.9) ──

  fillText(text: string, x: number, y: number): void {
    this.raw.fillText(text, x, y);
  }

  strokeText(text: string, x: number, y: number): void {
    this.raw.strokeText(text, x, y);
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.raw.fillRect(x, y, w, h);
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this.raw.strokeRect(x, y, w, h);
  }

  // ── State Scoping (6.10) ──

  save(): void {
    this.raw.save();
  }

  restore(): void {
    this.raw.restore();
  }

  // ── Auto Save/Restore (6.11) ──

  beginElement(element: IElement): void {
    const ctx = this.raw;
    ctx.save();
    const m = element.worldMatrix;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.globalAlpha = element.effectiveAlpha;
    ctx.globalCompositeOperation = element.blendMode;
  }

  /**
   * Set the transform and setup for hit-buffer rendering.
   * Disables alpha and effects for flat color rendering.
   */
  beginHitElement(element: IElement, hitColor: string): void {
    const ctx = this.raw;
    ctx.save();
    const m = element.worldMatrix;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = hitColor;
    ctx.strokeStyle = hitColor;
  }

  endElement(): void {
    this.raw.restore();
  }
}
