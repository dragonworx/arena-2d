/**
 * Value interpolation for tween animations.
 *
 * Detects value types once at resolve time and returns a cached interpolator
 * function, so per-frame work is a cheap arithmetic call.
 *
 * @module Animation
 */

/** An interpolator takes a from value, a to value, and progress (0–1), returning the blended result. */
export type Interpolator = (from: unknown, to: unknown, t: number) => unknown;

// ── Color Parsing ──

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

const HEX3_RE = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX6_RE = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB_RE = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;
const HSL_RE = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)$/i;

/** Parse a hex color string (#RGB or #RRGGBB) to RGB components (0–255). */
export function parseHex(hex: string): RGB | null {
  let match = HEX6_RE.exec(hex);
  if (match) {
    return {
      r: Number.parseInt(match[1], 16),
      g: Number.parseInt(match[2], 16),
      b: Number.parseInt(match[3], 16),
    };
  }
  match = HEX3_RE.exec(hex);
  if (match) {
    return {
      r: Number.parseInt(match[1] + match[1], 16),
      g: Number.parseInt(match[2] + match[2], 16),
      b: Number.parseInt(match[3] + match[3], 16),
    };
  }
  return null;
}

/** Parse an `rgb(r, g, b)` string to RGB components (0–255). */
export function parseRgb(str: string): RGB | null {
  const match = RGB_RE.exec(str);
  if (!match) return null;
  return {
    r: Number.parseInt(match[1], 10),
    g: Number.parseInt(match[2], 10),
    b: Number.parseInt(match[3], 10),
  };
}

/** Parse an `hsl(h, s%, l%)` string to HSL components (h: 0–360, s/l: 0–100). */
export function parseHsl(str: string): HSL | null {
  const match = HSL_RE.exec(str);
  if (!match) return null;
  return {
    h: Number.parseFloat(match[1]),
    s: Number.parseFloat(match[2]),
    l: Number.parseFloat(match[3]),
  };
}

/** Convert HSL (h: 0–360, s: 0–100, l: 0–100) to RGB (0–255). */
export function hslToRgb(h: number, s: number, l: number): RGB {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** Convert RGB (0–255) to a hex color string (#rrggbb). */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Try to parse a string as a color, returning RGB or null. */
function parseColor(value: string): RGB | null {
  const hex = parseHex(value);
  if (hex) return hex;

  const rgb = parseRgb(value);
  if (rgb) return rgb;

  const hsl = parseHsl(value);
  if (hsl) return hslToRgb(hsl.h, hsl.s, hsl.l);

  return null;
}

// ── Interpolation Helpers ──

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Color Interpolator (always outputs hex) ──

const colorInterpolator: Interpolator = (from, to, t) => {
  const fromRgb = parseColor(from as string);
  const toRgb = parseColor(to as string);
  if (!fromRgb || !toRgb) return to;
  return rgbToHex(
    lerpNumber(fromRgb.r, toRgb.r, t),
    lerpNumber(fromRgb.g, toRgb.g, t),
    lerpNumber(fromRgb.b, toRgb.b, t),
  );
};

// ── Number Interpolator ──

const numberInterpolator: Interpolator = (from, to, t) =>
  lerpNumber(from as number, to as number, t);

// ── Array Interpolator ──

const arrayInterpolator: Interpolator = (from, to, t) => {
  const a = from as number[];
  const b = to as number[];
  const len = Math.max(a.length, b.length);
  const result: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = lerpNumber(a[i] ?? 0, b[i] ?? 0, t);
  }
  return result;
};

// ── Object Interpolator ──

const objectInterpolator: Interpolator = (from, to, t) => {
  const a = from as Record<string, number>;
  const b = to as Record<string, number>;
  const result: Record<string, number> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    result[key] = lerpNumber(a[key] ?? 0, b[key] ?? 0, t);
  }
  return result;
};

/** Detect the value type and return the appropriate cached interpolator. */
export function createInterpolator(sampleValue: unknown): Interpolator {
  if (typeof sampleValue === "number") return numberInterpolator;
  if (typeof sampleValue === "string") {
    if (parseColor(sampleValue)) return colorInterpolator;
    // Fall back to returning the target value at t >= 1
    return (_from, to, t) => (t >= 1 ? to : _from);
  }
  if (Array.isArray(sampleValue)) return arrayInterpolator;
  if (typeof sampleValue === "object" && sampleValue !== null)
    return objectInterpolator;
  // Fallback: snap at end
  return (_from, to, t) => (t >= 1 ? to : _from);
}
