/**
 * Type definitions for the Arena-2D tween animation system.
 * @module Animation
 */

/** A function that maps a linear progress `t` (0–1) to an eased value. */
export type EasingFunction = (t: number) => number;

/** Named easing presets. */
export type EasingName =
  | "linear"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInQuart"
  | "easeOutQuart"
  | "easeInOutQuart"
  | "easeInQuint"
  | "easeOutQuint"
  | "easeInOutQuint"
  | "easeInSextic"
  | "easeOutSextic"
  | "easeInOutSextic"
  | "easeInCirc"
  | "easeOutCirc"
  | "easeInOutCirc"
  | "easeInElastic"
  | "easeOutElastic"
  | "easeInOutElastic"
  | "easeInBack"
  | "easeOutBack"
  | "easeInOutBack"
  | "easeInBounce"
  | "easeOutBounce"
  | "easeInOutBounce"
  | "easeInExpo"
  | "easeOutExpo"
  | "easeInOutExpo";

/** A single keyframe in a property animation sequence. */
export interface IKeyframe {
  /** Target value at the end of this keyframe segment. */
  toValue: number | string | number[] | Record<string, number>;
  /** Duration of this segment in seconds. */
  duration: number;
  /** Easing for this segment. Defaults to the tween-level easing. */
  easing?: EasingName | EasingFunction;
  /** Explicit start value. If omitted, uses the current value or previous keyframe's toValue. */
  fromValue?: number | string | number[] | Record<string, number>;
}

/** Per-property keyframe list keyed by property name. */
export type TweenProperties = Record<string, IKeyframe[]>;

/** Configuration for creating a Tween. */
export interface ITweenConfig {
  /** The object whose properties will be animated. */
  target: Record<string, unknown>;
  /** Map of property names to keyframe arrays. */
  properties: TweenProperties;
  /** Number of times to repeat (0 = play once). Use Infinity for endless. */
  repeat?: number;
  /** If true, alternates direction on each repeat (ping-pong). */
  yoyo?: boolean;
  /** Delay in seconds before the tween starts. */
  delay?: number;
  /** Ticker instance. If omitted, uses a shared default Ticker. */
  ticker?: unknown;
  /** If true (default), the tween starts immediately on construction. */
  autoStart?: boolean;
  /** Default easing for keyframes that don't specify one. */
  easing?: EasingName | EasingFunction;
}

/** Current playback state of a Tween. */
export type TweenState = "idle" | "running" | "paused" | "completed";

/** Public interface for Tween instances. */
export interface ITween {
  readonly state: TweenState;
  readonly elapsed: number;
  readonly totalDuration: number;
  readonly progress: number;

  start(): ITween;
  pause(): ITween;
  resume(): ITween;
  stop(): ITween;
  reverse(): ITween;
  restart(): ITween;
  chain(...tweens: ITween[]): ITween;
  destroy(): void;
}
