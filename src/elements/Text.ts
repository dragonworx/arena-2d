/**
 * Text — Read-only text display element with word-wrap support.
 *
 * Implements IText from SPEC §6. Renders via ctx.fillText() using
 * pre-measured character advancements from TextLayout.
 *
 * Integrates with the Layout Engine (Layer 8) via getIntrinsicSize()
 * to provide proper min-content / max-content measurements.
 *
 * SPEC: §6.1–6.3
 */

import { DirtyFlags } from "../core/DirtyFlags";
import { Element } from "../core/Element";
import type {
  IArenaContext,
  ITextStyle as IRenderTextStyle,
} from "../rendering/ArenaContext";
import {
  type ITextLayout,
  computeMaxContentWidth,
  computeMinContentWidth,
  computeTextLayout,
} from "../text/TextLayout";

// ── Text Style ──

/**
 * Text-specific style properties.
 * Maps to SPEC §6.4 ITextStyle.
 */
export interface ITextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
}

/**
 * Create default text style matching SPEC defaults.
 */
export function createDefaultTextStyle(): ITextStyle {
  return {
    fontFamily: "sans-serif",
    fontSize: 14,
    fontWeight: "normal",
    fontStyle: "normal",
    color: "#000000",
    lineHeight: Math.ceil(14 * 1.2),
    textAlign: "left",
  };
}

// ── Text Element ──

export class Text extends Element {
  private _text = "";
  private _textStyle: ITextStyle = createDefaultTextStyle();
  private _textLayout: ITextLayout | null = null;
  private _layoutDirty = true;

  // ── Text content ──

  get text(): string {
    return this._text;
  }

  set text(value: string) {
    if (this._text !== value) {
      this._text = value;
      this._layoutDirty = true;
      this.invalidate(DirtyFlags.Layout | DirtyFlags.Visual);
    }
  }

  // ── Text style ──

  get textStyle(): ITextStyle {
    return this._textStyle;
  }

  set textStyle(value: ITextStyle) {
    this._textStyle = value;
    this._layoutDirty = true;
    this.invalidate(DirtyFlags.Layout | DirtyFlags.Visual);
  }

  /**
   * Merge partial text style changes and trigger layout invalidation.
   */
  updateTextStyle(changes: Partial<ITextStyle>): void {
    Object.assign(this._textStyle, changes);

    // If fontSize changed and lineHeight wasn't explicitly set, update lineHeight
    if (changes.fontSize !== undefined && changes.lineHeight === undefined) {
      this._textStyle.lineHeight = Math.ceil(this._textStyle.fontSize * 1.2);
    }

    this._layoutDirty = true;
    this.invalidate(DirtyFlags.Layout | DirtyFlags.Visual);
  }

  // ── Text layout (computed) ──

  get textLayout(): ITextLayout {
    if (this._layoutDirty || !this._textLayout) {
      this._recomputeLayout();
    }
    return this._textLayout as ITextLayout;
  }

  /**
   * Recompute text layout using the current text, style, and available width.
   */
  private _recomputeLayout(): void {
    const availableWidth =
      this.width > 0 ? this.width : Number.POSITIVE_INFINITY;
    this._textLayout = computeTextLayout(
      this._text,
      this._renderStyle(),
      availableWidth,
    );
    this._layoutDirty = false;
  }

  /**
   * Convert our ITextStyle to the ArenaContext's ITextStyle for measurement and rendering.
   */
  private _renderStyle(): IRenderTextStyle & { lineHeight: number } {
    return {
      fontSize: this._textStyle.fontSize,
      fontFamily: this._textStyle.fontFamily,
      fontWeight: this._textStyle.fontWeight,
      fontStyle: this._textStyle.fontStyle,
      fill: this._textStyle.color,
      textBaseline: "top",
      textAlign: "left",
      lineHeight: this._textStyle.lineHeight,
    };
  }

  // ── Intrinsic sizing (for Layout Engine integration) ──

  /**
   * Reports intrinsic content size to the layout engine.
   * - width: widest line in current layout
   * - height: total height of all lines
   */
  getIntrinsicSize(): { width: number; height: number } {
    const layout = this.textLayout;
    let maxWidth = 0;
    for (const line of layout.lines) {
      if (line.width > maxWidth) maxWidth = line.width;
    }
    return { width: maxWidth, height: layout.totalHeight };
  }

  /**
   * Get min-content width (widest single word).
   */
  getMinContentWidth(): number {
    return computeMinContentWidth(this._text, this._renderStyle());
  }

  /**
   * Get max-content width (full single line, no wrapping).
   */
  getMaxContentWidth(): number {
    return computeMaxContentWidth(this._text, this._renderStyle());
  }

  // ── Frame loop ──

  override update(dt: number): void {
    // If layout is dirty, recompute before parent processes layout
    if (this._layoutDirty) {
      this._recomputeLayout();
    }
    super.update(dt);
  }

  // ── Rendering ──

  override paint(ctx: IArenaContext): void {
    const layout = this.textLayout;
    const style = this._textStyle;
    const lineHeight = style.lineHeight;
    const elementWidth = this.width;
    const raw = ctx.raw;

    // Set font properties
    const weight = style.fontWeight;
    const fontStyle = style.fontStyle;
    raw.font = `${weight} ${fontStyle} ${style.fontSize}px ${style.fontFamily}`;
    raw.fillStyle = style.color;
    raw.textBaseline = "top";

    for (let i = 0; i < layout.lines.length; i++) {
      const line = layout.lines[i];
      const y = i * lineHeight;

      // Compute x offset based on text alignment
      let x = 0;
      if (style.textAlign === "center") {
        x = (elementWidth - line.width) / 2;
      } else if (style.textAlign === "right") {
        x = elementWidth - line.width;
      }

      raw.fillText(line.text, x, y);
    }
  }

  // ── Dirty tracking ──

  override set width(value: number) {
    const oldWidth = this.width;
    super.width = value;
    if (oldWidth !== value) {
      this._layoutDirty = true;
    }
  }

  override get width(): number {
    return super.width;
  }

  override set height(value: number) {
    super.height = value;
  }

  override get height(): number {
    return super.height;
  }
}
