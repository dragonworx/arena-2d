import type { EasingFunction } from "./Easing";

/**
 * A single keyframe in an animation channel.
 */
export interface Keyframe<T> {
  /** Time of the keyframe in seconds. */
  time: number;
  /** Value at this time. */
  value: T;
  /** Easing function to use when interpolating TO this keyframe from the previous one. */
  ease?: EasingFunction;
}
