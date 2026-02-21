/**
 * Tween — Declarative keyframe-based property animation.
 *
 * Animates one or more properties on a target object using keyframes with
 * easing, repeat, yoyo, delay, and chaining support. Integrates with the
 * Ticker frame loop via TweenManager.
 *
 * @example
 * ```typescript
 * const tween = new Tween({
 *   target: element,
 *   properties: {
 *     x: [{ toValue: 200, duration: 1, easing: 'easeOutCubic' }],
 *     alpha: [{ toValue: 0.5, duration: 0.5 }, { toValue: 1, duration: 0.5 }],
 *   },
 *   repeat: 2,
 *   yoyo: true,
 * });
 * ```
 *
 * @module Animation
 */

import type { ITicker } from "../core/Ticker";
import { EventEmitter } from "../events/EventEmitter";
import { resolveEasing } from "./Easing";
import { type Interpolator, createInterpolator } from "./Interpolation";
import { type IManagedTween, TweenManager } from "./TweenManager";
import type {
  EasingFunction,
  EasingName,
  IKeyframe,
  ITween,
  ITweenConfig,
  TweenState,
} from "./types";

// ── Resolved internal structures (pre-computed on start) ──

interface ResolvedSegment {
  fromValue: unknown;
  toValue: unknown;
  duration: number;
  /** Cumulative time at the START of this segment. */
  startTime: number;
  easing: EasingFunction;
  interpolator: Interpolator;
}

interface ResolvedProperty {
  key: string;
  segments: ResolvedSegment[];
  totalDuration: number;
}

/**
 * Tween class that animates properties over time using keyframes.
 *
 * Emits events: `start`, `update`, `complete`, `stop`.
 */
export class Tween extends EventEmitter implements ITween, IManagedTween {
  private _state: TweenState = "idle";
  private _elapsed = 0;
  private _delay: number;
  private _delayRemaining: number;
  private _repeat: number;
  private _repeatCount = 0;
  private _yoyo: boolean;
  private _reversed = false;
  private _totalDuration = 0;
  private _autoStart: boolean;
  private _defaultEasing: EasingName | EasingFunction | undefined;

  private _target: Record<string, unknown>;
  private _rawProperties: Record<string, IKeyframe[]>;
  private _resolved: ResolvedProperty[] = [];
  private _manager: TweenManager;
  private _chained: ITween[] = [];
  private _destroyed = false;

  constructor(config: ITweenConfig) {
    super();
    this._target = config.target;
    this._rawProperties = config.properties;
    this._repeat = config.repeat ?? 0;
    this._yoyo = config.yoyo ?? false;
    this._delay = config.delay ?? 0;
    this._delayRemaining = this._delay;
    this._autoStart = config.autoStart ?? true;
    this._defaultEasing = config.easing;

    this._manager = TweenManager.for(config.ticker as ITicker | undefined);

    if (this._autoStart) {
      this.start();
    }
  }

  // ── Public Getters ──

  get state(): TweenState {
    return this._state;
  }

  get elapsed(): number {
    return this._elapsed;
  }

  get totalDuration(): number {
    return this._totalDuration;
  }

  get progress(): number {
    if (this._totalDuration === 0) return 1;
    return Math.min(1, this._elapsed / this._totalDuration);
  }

  // ── Playback Controls ──

  /** Resolve keyframes and begin playback. */
  start(): ITween {
    if (this._destroyed) return this;
    if (this._state === "running") return this;

    this._resolve();
    this._state = "running";
    this._elapsed = 0;
    this._delayRemaining = this._delay;
    this._repeatCount = 0;
    this._reversed = false;
    this._manager.add(this);
    this.emit("start", { target: this._target });
    return this;
  }

  pause(): ITween {
    if (this._state === "running") {
      this._state = "paused";
    }
    return this;
  }

  resume(): ITween {
    if (this._state === "paused") {
      this._state = "running";
    }
    return this;
  }

  stop(): ITween {
    if (this._state === "idle" || this._state === "completed") return this;
    this._state = "idle";
    this._manager.remove(this);
    this.emit("stop", { target: this._target });
    return this;
  }

  reverse(): ITween {
    this._reversed = !this._reversed;
    return this;
  }

  restart(): ITween {
    this._state = "idle";
    this._manager.remove(this);
    return this.start();
  }

  chain(...tweens: ITween[]): ITween {
    this._chained.push(...tweens);
    return this;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._state = "idle";
    this._manager.remove(this);
    this._resolved = [];
    this._chained = [];
    this.removeAllListeners();
  }

  // ── Internal: Called by TweenManager each frame ──

  /** @private */
  _update(dt: number): boolean {
    if (this._state !== "running") return this._state === "paused";

    let frameDt = dt;

    // Handle delay
    if (this._delayRemaining > 0) {
      this._delayRemaining -= frameDt;
      if (this._delayRemaining > 0) return true;
      // Consume leftover dt
      frameDt = -this._delayRemaining;
      this._delayRemaining = 0;
    }

    this._elapsed += frameDt;

    // Apply property values
    const progress = this._reversed
      ? Math.max(0, 1 - this._elapsed / this._totalDuration)
      : Math.min(1, this._elapsed / this._totalDuration);

    this._applyProperties(progress * this._totalDuration);

    this.emit("update", {
      target: this._target,
      elapsed: this._elapsed,
      progress: this.progress,
    });

    // Check completion
    if (this._elapsed >= this._totalDuration) {
      // Ensure final values are applied exactly
      if (this._reversed) {
        this._applyProperties(0);
      } else {
        this._applyProperties(this._totalDuration);
      }

      // Handle repeat
      if (
        this._repeat === Number.POSITIVE_INFINITY ||
        this._repeatCount < this._repeat
      ) {
        this._repeatCount++;
        this._elapsed = 0;
        if (this._yoyo) {
          this._reversed = !this._reversed;
        }
        return true;
      }

      // Complete
      this._state = "completed";
      this.emit("complete", { target: this._target });

      // Trigger chained tweens
      for (const chained of this._chained) {
        chained.start();
      }

      return false;
    }

    return true;
  }

  // ── Internal: Resolve keyframes into pre-computed segments ──

  /** @private */
  private _resolve(): void {
    this._resolved = [];
    let maxDuration = 0;

    for (const [key, keyframes] of Object.entries(this._rawProperties)) {
      const segments: ResolvedSegment[] = [];
      let cumulativeTime = 0;

      for (let i = 0; i < keyframes.length; i++) {
        const kf = keyframes[i];

        // Determine fromValue
        let fromValue: unknown;
        if (kf.fromValue !== undefined) {
          fromValue = kf.fromValue;
        } else if (i > 0) {
          fromValue = keyframes[i - 1].toValue;
        } else {
          fromValue = this._target[key];
        }

        const interpolator = createInterpolator(kf.toValue);
        const easing = resolveEasing(kf.easing ?? this._defaultEasing);

        segments.push({
          fromValue,
          toValue: kf.toValue,
          duration: kf.duration,
          startTime: cumulativeTime,
          easing,
          interpolator,
        });

        cumulativeTime += kf.duration;
      }

      if (cumulativeTime > maxDuration) {
        maxDuration = cumulativeTime;
      }

      this._resolved.push({
        key,
        segments,
        totalDuration: cumulativeTime,
      });
    }

    this._totalDuration = maxDuration;
  }

  // ── Internal: Apply interpolated values at a given time ──

  /** @private */
  private _applyProperties(time: number): void {
    for (const prop of this._resolved) {
      const { key, segments, totalDuration } = prop;

      // Clamp time to property's own duration
      const t = Math.max(0, Math.min(time, totalDuration));

      // Find active segment
      let seg = segments[segments.length - 1];
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        if (t < s.startTime + s.duration || i === segments.length - 1) {
          seg = s;
          break;
        }
      }

      // Compute local progress within segment
      let localT: number;
      if (seg.duration === 0) {
        localT = 1;
      } else {
        localT = Math.max(0, Math.min(1, (t - seg.startTime) / seg.duration));
      }

      // Apply easing
      const easedT = seg.easing(localT);

      // Interpolate and assign
      this._target[key] = seg.interpolator(seg.fromValue, seg.toValue, easedT);
    }
  }
}
