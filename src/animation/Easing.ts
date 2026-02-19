/**
 * Easing functions for animation.
 *
 * All functions accept a progress value `t` in [0, 1] and return an eased value.
 *
 * SPEC: §10.2
 */
export type EasingFunction = (t: number) => number;

export const Easing = {
  Linear: (t: number) => t,

  QuadIn: (t: number) => t * t,
  QuadOut: (t: number) => t * (2 - t),
  QuadInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  CubicIn: (t: number) => t * t * t,
  CubicOut: (t: number) => {
    const f = t - 1;
    return f * f * f + 1;
  },
  CubicInOut: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  BackIn: (t: number) => {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  BackOut: (t: number) => {
    const s = 1.70158;
    const f = t - 1;
    return f * f * ((s + 1) * f + s) + 1;
  },
  BackInOut: (t: number) => {
    const s = 1.70158 * 1.525;
    let k = t * 2;
    if (k < 1) return 0.5 * (k * k * ((s + 1) * k - s));
    k -= 2;
    return 0.5 * (k * k * ((s + 1) * k + s) + 2);
  },

  ElasticOut: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const p = 0.3;
    const s = p / 4;
    return 2 ** (-10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;
  },
} as const;

export type EasingName = keyof typeof Easing;
