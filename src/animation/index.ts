/**
 * Animation module — Tween system for Arena-2D.
 * @module Animation
 */

export type {
  EasingFunction,
  EasingName,
  IKeyframe,
  ITweenConfig,
  TweenState,
  ITween,
  TweenProperties,
} from "./types";

export { Easing, resolveEasing } from "./Easing";
export {
  createInterpolator,
  parseHex,
  parseRgb,
  parseHsl,
  hslToRgb,
} from "./Interpolation";
export type { Interpolator } from "./Interpolation";
export { TweenManager } from "./TweenManager";
export type { IManagedTween } from "./TweenManager";
export { Tween } from "./Tween";
