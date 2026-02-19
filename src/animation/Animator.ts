import { AnimationBlendMode } from "./AnimationBlendMode";
import type { AnimationRegistry } from "./AnimationRegistry";
import type { Clip } from "./Clip";
import type { ITickable, Timeline } from "./Timeline";
import type { IAdapter } from "./adapter/IAdapter";

export interface IAnimation {
  readonly isPlaying: boolean;
  readonly progress: number; // 0–1
  cancel(): void;
  pause(): void;
  resume(): void;
  then<TResult = void>(
    onfulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | null,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<TResult>;
}

export interface AnimateOptions {
  duration: number; // In seconds
  easing?: (t: number) => number; // Applied to all channels
  delay?: number; // Default: 0
  loop?: boolean; // Default: false
  yoyo?: boolean; // Default: false
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
  blendMode?: AnimationBlendMode;
}

export interface AnimatorOptions {
  loop?: boolean;
  yoyo?: boolean;
  delay?: number;
  timeScale?: number;
  onComplete?: () => void;
  onLoop?: () => void;
  onUpdate?: (progress: number) => void;
  registry?: AnimationRegistry;
  blendMode?: AnimationBlendMode;
}

/**
 * A reusable clip played on a specific target.
 */
export class Animator implements ITickable, IAnimation {
  time = 0;
  timeScale = 1;
  paused = false;

  loop = false;
  yoyo = false;
  delay = 0;
  blendMode: AnimationBlendMode = AnimationBlendMode.Override;

  onComplete?: () => void;
  onLoop?: () => void;
  onUpdate?: (progress: number) => void;

  private _direction = 1; // 1 = forward, -1 = backward (for yoyo)
  private _isPlaying = false;
  private _timeline: Timeline | null = null;
  private _registry: AnimationRegistry | null = null;
  private _duration = 0;
  private _delayRemaining = 0;
  private _resolve: (() => void) | null = null;
  private _promise: Promise<void> | null = null;


  constructor(
    public readonly clip: Clip,
    public readonly adapter: IAdapter,
    options?: AnimatorOptions,
  ) {
    this._duration = clip.duration;
    if (options) {
      this.loop = !!options.loop;
      this.yoyo = !!options.yoyo;
      this.delay = options.delay ?? 0;
      this.timeScale = options.timeScale ?? 1;
      this.onComplete = options.onComplete;
      this.onLoop = options.onLoop;
      this.onUpdate = options.onUpdate;
      this._registry = options.registry || null;
      this.blendMode = options.blendMode ?? AnimationBlendMode.Override;
    }
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  play(): void {
    this._isPlaying = true;
    this.paused = false;
    this._delayRemaining = this.delay;

    // Register with conflict registry
    if (this._registry) {
      this._registry.register(
        this.adapter,
        [...this.clip.channels.keys()],
        this,
        this.blendMode,
      );
    }

    // Ensure promise exists if playing
    if (!this._promise) {
      this._promise = new Promise<void>((resolve) => {
        this._resolve = resolve;
      });
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (this.paused) {
      this.paused = false;
    } else if (!this._isPlaying) {
      this.play();
    }
  }

  stop(): void {
    this._unregister();
    this._isPlaying = false;
    this.time = 0;
    this._direction = 1;
    // Apply time 0
    this._apply(0);
  }

  cancel(): void {
    this._unregister();
    this._isPlaying = false;
    this.paused = false;
    this.detach();
    // Resolve promise silently on cancel
    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }

  // PromiseLike implementation
  then<TResult = void>(
    onfulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | null,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<TResult> {
    if (!this._promise) {
      this._promise = new Promise<void>((resolve) => {
        this._resolve = resolve;
      });
    }
    return this._promise.then(onfulfilled, onrejected);
  }

  get progress(): number {
    return this._duration > 0 ? Math.min(1, Math.max(0, this.time / this._duration)) : 0;
  }


  update(dt: number): void {
    if (!this._isPlaying || this.paused) return;

    // Handle delay
    if (this._delayRemaining > 0) {
      this._delayRemaining -= dt * this.timeScale;
      if (this._delayRemaining > 0) return; // Still waiting
      // Delay just finished — use leftover as first delta
      dt = -this._delayRemaining / this.timeScale;
      this._delayRemaining = 0;
    }

    // Apply local time scale
    const delta = dt * this.timeScale * this._direction;
    this.time += delta;

    let finished = false;

    // Handle end of clip (forward)
    if (this._direction === 1 && this.time >= this._duration) {
      if (this.loop) {
        if (this.yoyo) {
          this.time = this._duration;
          this._direction = -1;
        } else {
          this.time %= this._duration; // Wrap around
        }
        if (this.onLoop) this.onLoop();
      } else {
        this.time = this._duration;
        finished = true;
      }
    }
    // Handle start of clip (backward / yoyo)
    else if (this._direction === -1 && this.time <= 0) {
      if (this.loop) {
        this.time = 0;
        this._direction = 1;
        if (this.onLoop) this.onLoop();
      } else {
        this.time = 0;
        finished = true;
      }
    }

    this._apply(this.time);
    if (this.onUpdate) this.onUpdate(this.time / this._duration);

    if (finished) {
      this._isPlaying = false;
      this._unregister();
      if (this.onComplete) this.onComplete();
      this.detach();
      if (this._resolve) {
        this._resolve();
        this._resolve = null;
      }
    }
  }

  private _unregister(): void {
    if (this._registry) {
      this._registry.unregister(
        this.adapter,
        [...this.clip.channels.keys()],
        this,
      );
    }
  }

  /**
   * Evaluate the clip at the given time and apply to the adapter.
   */
  private _apply(time: number): void {
    for (const [prop, channel] of this.clip.channels) {
      const val = channel.evaluate(time);
      if (this._registry) {
        this._registry.accumulate(this.adapter, prop, val, this.blendMode);
      } else {
        // Fallback if no registry (should happen mainly in tests or non-scene usage)
        // Direct application doesn't support additive mixing in the same way,
        // but works for simple cases.
        if (this.blendMode === AnimationBlendMode.Additive && typeof val === "number") {
             const current = this.adapter.getValue(prop);
             if (typeof current === "number") {
                 this.adapter.setValue(prop, current + val);
             } else {
                 this.adapter.setValue(prop, val);
             }
        } else {
            this.adapter.setValue(prop, val);
        }
      }
    }
  }

  // ── Convenience ──

  /**
   * Helper: Attach this animator to a timeline.
   */
  attachTo(timeline: Timeline): void {
    timeline.add(this);
    this._timeline = timeline;
  }

  /**
   * Helper: Detach from its timeline.
   */
  detach(): void {
    if (this._timeline) {
      this._timeline.remove(this);
      this._timeline = null;
    }
  }
}
