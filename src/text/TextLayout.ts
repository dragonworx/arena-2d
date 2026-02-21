/**
 * TextLayout — Greedy word-wrap and per-character advancement layout.
 *
 * This is the Inline Layout sub-engine that handles glyph positioning,
 * wrapping, and text metrics. It is opaque to the main Layout Engine
 * (Layer 8) — providing only intrinsic size measurements.
 *
 * SPEC: §6.2–6.3
 */

import {
  type ITextStyle as IRenderTextStyle,
  buildFontString,
} from "../rendering/Arena2DContext";

// ── Types ──

/** Text style for layout computation — extends render style with lineHeight */
export interface ILayoutTextStyle extends IRenderTextStyle {
  lineHeight?: number;
}

export interface ITextLine {
  /** The string content of this line */
  text: string;
  /** Measured width in pixels */
  width: number;
  /** X-offset of each character's left edge, relative to line start */
  advancements: number[];
}

export interface ITextLayout {
  /** Array of laid-out lines */
  lines: ITextLine[];
  /** Sum of all line heights */
  totalHeight: number;
}

// ── Measurement context ──

/**
 * Minimal interface for text measurement — allows injection of mock contexts.
 */
export interface ITextMeasureContext {
  font: string;
  measureText(text: string): { width: number };
}

let _measureCtx: ITextMeasureContext | null = null;

/**
 * Set a custom measurement context (for testing or custom environments).
 * Pass null to reset to the default OffscreenCanvas-based context.
 */
export function setMeasureContext(ctx: ITextMeasureContext | null): void {
  _measureCtx = ctx;
}

function getMeasureContext(): ITextMeasureContext {
  if (!_measureCtx) {
    // Create default OffscreenCanvas-based context
    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error(
        "Failed to create OffscreenCanvas 2D context for text measurement",
      );
    }
    _measureCtx = ctx;
  }
  return _measureCtx;
}

/**
 * Set the measurement context's font to match the given style.
 */
function setMeasureFont(style: IRenderTextStyle): void {
  const ctx = getMeasureContext();
  ctx.font = buildFontString(style);
}

/**
 * Measure a single string's width using the current font.
 */
function measureWidth(text: string): number {
  const ctx = getMeasureContext();
  return ctx.measureText(text).width;
}

/**
 * Compute per-character x-offsets (advancements) for a string.
 * Each entry is the left edge of the character relative to line start.
 */
function computeAdvancements(text: string): number[] {
  const ctx = getMeasureContext();
  const advancements: number[] = [];
  let x = 0;
  for (let i = 0; i < text.length; i++) {
    advancements.push(x);
    x += ctx.measureText(text[i]).width;
  }
  return advancements;
}

// ── Cache ──

interface LayoutCacheEntry {
  text: string;
  fontKey: string;
  availableWidth: number;
  result: ITextLayout;
}

const CACHE_SIZE = 32;
const _cache: LayoutCacheEntry[] = [];

function buildFontKey(style: ILayoutTextStyle): string {
  return `${style.fontWeight ?? "normal"}_${style.fontStyle ?? "normal"}_${style.fontSize}_${style.fontFamily}`;
}

function findCached(
  text: string,
  fontKey: string,
  availableWidth: number,
): ITextLayout | null {
  for (const entry of _cache) {
    if (
      entry.text === text &&
      entry.fontKey === fontKey &&
      entry.availableWidth === availableWidth
    ) {
      return entry.result;
    }
  }
  return null;
}

function addToCache(
  text: string,
  fontKey: string,
  availableWidth: number,
  result: ITextLayout,
): void {
  if (_cache.length >= CACHE_SIZE) {
    _cache.shift();
  }
  _cache.push({ text, fontKey, availableWidth, result });
}

// ── Word-Wrap Algorithm ──

/**
 * Split text into words, preserving whitespace as separators.
 * Hard line breaks (\n) produce "\n" markers.
 */
function splitIntoSegments(text: string): string[] {
  const segments: string[] = [];
  let current = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") {
      if (current.length > 0) {
        segments.push(current);
        current = "";
      }
      segments.push("\n");
    } else if (ch === " " || ch === "\t") {
      if (current.length > 0) {
        segments.push(current);
        current = "";
      }
      segments.push(" ");
    } else {
      current += ch;
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

/**
 * Compute text layout using a greedy word-wrap algorithm.
 *
 * @param text - The text content to lay out
 * @param style - Text style for font measurement
 * @param availableWidth - Maximum width for wrapping. Infinity = no wrapping.
 * @returns The computed text layout
 */
export function computeTextLayout(
  text: string,
  style: ILayoutTextStyle,
  availableWidth: number,
): ITextLayout {
  const lineHeight = style.lineHeight ?? Math.ceil(style.fontSize * 1.2);

  // Handle empty string
  if (text.length === 0) {
    return {
      lines: [{ text: "", width: 0, advancements: [] }],
      totalHeight: lineHeight,
    };
  }

  // Check cache
  const fontKey = buildFontKey(style);
  const cached = findCached(text, fontKey, availableWidth);
  if (cached) return cached;

  // Set font for measurement
  setMeasureFont(style);

  const segments = splitIntoSegments(text);
  const lines: ITextLine[] = [];

  let currentLineText = "";
  let currentLineWidth = 0;
  const spaceWidth = measureWidth(" ");

  function finishLine(): void {
    const content = currentLineText;
    const advancements = computeAdvancements(content);
    const width = content.length > 0 ? measureWidth(content) : 0;
    lines.push({ text: content, width, advancements });
    currentLineText = "";
    currentLineWidth = 0;
  }

  for (const segment of segments) {
    if (segment === "\n") {
      finishLine();
      continue;
    }

    if (segment === " ") {
      // Spaces ALWAYS stay on the current line (they can overflow)
      // This is crucial for caret positioning at the end of a line.
      currentLineText += " ";
      currentLineWidth += spaceWidth;
      continue;
    }

    // It's a word
    const wordWidth = measureWidth(segment);

    if (currentLineText.length === 0) {
      // First word on the line — always place it
      currentLineText = segment;
      currentLineWidth = wordWidth;
    } else {
      // Check if adding this word fits
      if (currentLineWidth + wordWidth <= availableWidth) {
        currentLineText += segment;
        currentLineWidth += wordWidth;
      } else {
        // Doesn't fit, start a new line
        finishLine();
        currentLineText = segment;
        currentLineWidth = wordWidth;
      }
    }
  }

  // Finish last line
  finishLine();

  const result: ITextLayout = {
    lines,
    totalHeight: lines.length * lineHeight,
  };

  addToCache(text, fontKey, availableWidth, result);
  return result;
}

/**
 * Compute the min-content width: the widest single word.
 */
export function computeMinContentWidth(
  text: string,
  style: ILayoutTextStyle,
): number {
  if (text.length === 0) return 0;

  setMeasureFont(style);
  const segments = splitIntoSegments(text);
  let maxWidth = 0;

  for (const segment of segments) {
    if (segment === "\n" || segment === " ") continue;
    const w = measureWidth(segment);
    if (w > maxWidth) maxWidth = w;
  }

  return maxWidth;
}

/**
 * Compute the max-content width: the full text on a single line (no wrapping).
 */
export function computeMaxContentWidth(
  text: string,
  style: ILayoutTextStyle,
): number {
  if (text.length === 0) return 0;

  setMeasureFont(style);

  const hardLines = text.split("\n");
  let maxWidth = 0;

  for (const line of hardLines) {
    const w = measureWidth(line);
    if (w > maxWidth) maxWidth = w;
  }

  return maxWidth;
}

/**
 * Clear the layout cache. Useful for testing.
 */
export function clearLayoutCache(): void {
  _cache.length = 0;
}
