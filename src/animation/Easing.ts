/**
 * Easing functions for tween animations.
 *
 * Each function takes a linear progress `t` (0–1) and returns an eased value.
 * Organized by family: power, circular, elastic, back, bounce, exponential.
 *
 * @module Animation
 */

import type { EasingFunction, EasingName } from "./types";

// ── Power Easings ──

const easeInQuad: EasingFunction = (t) => t * t;
const easeOutQuad: EasingFunction = (t) => t * (2 - t);
const easeInOutQuad: EasingFunction = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

const easeInCubic: EasingFunction = (t) => t * t * t;
const easeOutCubic: EasingFunction = (t) => {
  const u = t - 1;
  return u * u * u + 1;
};
const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

const easeInQuart: EasingFunction = (t) => t * t * t * t;
const easeOutQuart: EasingFunction = (t) => {
  const u = t - 1;
  return 1 - u * u * u * u;
};
const easeInOutQuart: EasingFunction = (t) => {
  if (t < 0.5) return 8 * t * t * t * t;
  const u = t - 1;
  return 1 - 8 * u * u * u * u;
};

const easeInQuint: EasingFunction = (t) => t * t * t * t * t;
const easeOutQuint: EasingFunction = (t) => {
  const u = t - 1;
  return 1 + u * u * u * u * u;
};
const easeInOutQuint: EasingFunction = (t) => {
  if (t < 0.5) return 16 * t * t * t * t * t;
  const u = t - 1;
  return 1 + 16 * u * u * u * u * u;
};

const easeInSextic: EasingFunction = (t) => t ** 6;
const easeOutSextic: EasingFunction = (t) => 1 - (1 - t) ** 6;
const easeInOutSextic: EasingFunction = (t) =>
  t < 0.5 ? 32 * t ** 6 : 1 - (-2 * t + 2) ** 6 / 2;

// ── Circular ──

const easeInCirc: EasingFunction = (t) => 1 - Math.sqrt(1 - t * t);
const easeOutCirc: EasingFunction = (t) => {
  const u = t - 1;
  return Math.sqrt(1 - u * u);
};
const easeInOutCirc: EasingFunction = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2
    : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2;

// ── Elastic ──

const C4 = (2 * Math.PI) / 3;
const C5 = (2 * Math.PI) / 4.5;

const easeInElastic: EasingFunction = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * C4);
const easeOutElastic: EasingFunction = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * C4) + 1;
const easeInOutElastic: EasingFunction = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * C5)) / 2
        : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * C5)) / 2 + 1;

// ── Back ──

const S = 1.70158;
const S2 = S * 1.525;

const easeInBack: EasingFunction = (t) => (S + 1) * t * t * t - S * t * t;
const easeOutBack: EasingFunction = (t) => {
  const u = t - 1;
  return 1 + (S + 1) * u * u * u + S * u * u;
};
const easeInOutBack: EasingFunction = (t) =>
  t < 0.5
    ? ((2 * t) ** 2 * ((S2 + 1) * 2 * t - S2)) / 2
    : ((2 * t - 2) ** 2 * ((S2 + 1) * (t * 2 - 2) + S2) + 2) / 2;

// ── Bounce ──

const easeOutBounce: EasingFunction = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  let u = t;
  if (u < 1 / d1) return n1 * u * u;
  if (u < 2 / d1) {
    u -= 1.5 / d1;
    return n1 * u * u + 0.75;
  }
  if (u < 2.5 / d1) {
    u -= 2.25 / d1;
    return n1 * u * u + 0.9375;
  }
  u -= 2.625 / d1;
  return n1 * u * u + 0.984375;
};
const easeInBounce: EasingFunction = (t) => 1 - easeOutBounce(1 - t);
const easeInOutBounce: EasingFunction = (t) =>
  t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2;

// ── Exponential ──

const easeInExpo: EasingFunction = (t) => (t === 0 ? 0 : 2 ** (10 * t - 10));
const easeOutExpo: EasingFunction = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));
const easeInOutExpo: EasingFunction = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? 2 ** (20 * t - 10) / 2
        : (2 - 2 ** (-20 * t + 10)) / 2;

/** All named easing functions indexed by name. */
export const Easing: Record<EasingName, EasingFunction> = {
  linear: (t) => t,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSextic,
  easeOutSextic,
  easeInOutSextic,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
};

/**
 * Resolves an easing name or function to an EasingFunction.
 * If a function is passed, it is returned as-is.
 * If a string is passed, it is looked up in the Easing table.
 * Defaults to linear if not found.
 */
export function resolveEasing(
  easing: EasingName | EasingFunction | undefined,
): EasingFunction {
  if (typeof easing === "function") return easing;
  if (typeof easing === "string" && easing in Easing) return Easing[easing];
  return Easing.linear;
}
