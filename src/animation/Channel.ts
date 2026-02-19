import { Easing } from "./Easing";
import type { Keyframe } from "./Keyframe";

/**
 * Base class for a property channel.
 * Manages a sorted list of keyframes and handles binary search for the active segment.
 */
export abstract class Channel<T> {
  protected _keyframes: Keyframe<T>[] = [];
  protected _duration = 0;

  constructor(keyframes: Keyframe<T>[] = []) {
    this.addKeyframes(keyframes);
  }

  get duration(): number {
    return this._duration;
  }

  addKeyframe(time: number, value: T, ease?: Keyframe<T>["ease"]): void {
    this._keyframes.push({ time, value, ease });
    this._sortAndComputeDuration();
  }

  addKeyframes(frames: Keyframe<T>[]): void {
    this._keyframes.push(...frames);
    this._sortAndComputeDuration();
  }

  private _sortAndComputeDuration(): void {
    this._keyframes.sort((a, b) => a.time - b.time);
    this._duration =
      this._keyframes.length > 0
        ? this._keyframes[this._keyframes.length - 1].time
        : 0;
  }

  /**
   * Evaluate the channel at a specific time.
   */
  evaluate(time: number): T {
    if (this._keyframes.length === 0) {
      throw new Error("Cannot evaluate channel with no keyframes");
    }

    // Before first keyframe
    if (time <= this._keyframes[0].time) {
      return this._keyframes[0].value;
    }

    // After last keyframe
    if (time >= this._duration) {
      return this._keyframes[this._keyframes.length - 1].value;
    }

    // Limit search range
    let start = 0;
    let end = this._keyframes.length - 1;
    let idx = 0;

    // Binary search to find the keyframe just before 'time'
    while (start <= end) {
      const mid = (start + end) >>> 1;
      if (this._keyframes[mid].time <= time) {
        idx = mid;
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }

    const k1 = this._keyframes[idx];
    const k2 = this._keyframes[idx + 1];

    if (!k2) return k1.value;

    // Normalize time between k1 and k2 to [0, 1]
    const segmentDuration = k2.time - k1.time;
    let t = (time - k1.time) / segmentDuration;

    // Apply easing if present on the TARGET keyframe (k2)
    if (k2.ease) {
      t = k2.ease(t);
    } else {
      // Default linear for all channels, unless subclass overrides 'interpolate'
      // effectively making it linear or stepped.
      t = Easing.Linear(t);
    }

    return this.interpolate(k1.value, k2.value, t);
  }

  protected abstract interpolate(v1: T, v2: T, t: number): T;
}

/**
 * Channel for numeric values. Interpolates linearly.
 */
export class NumberChannel extends Channel<number> {
  protected interpolate(v1: number, v2: number, t: number): number {
    return v1 + (v2 - v1) * t;
  }
}

/**
 * Channel for boolean values. Steps (flips value at t >= 0.5 or t >= 1 depending on preference).
 * Typically boolean flags flip immediately at the keyframe time, so we use step-end logic.
 * However, standard animation logic usually holds the START value until the END time is reached
 * for stepped interpolation.
 *
 * Let's implement it such that it holds v1 until t=1.
 */
export class BooleanChannel extends Channel<boolean> {
  protected interpolate(v1: boolean, v2: boolean, t: number): boolean {
    return t < 1 ? v1 : v2;
  }
}

/**
 * Channel for string/enum values. Steps (holds start value until end).
 */
export class StringChannel extends Channel<string> {
  protected interpolate(v1: string, v2: string, t: number): string {
    return t < 1 ? v1 : v2;
  }
}
