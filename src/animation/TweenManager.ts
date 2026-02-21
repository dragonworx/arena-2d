/**
 * TweenManager — Bridges tweens to the Ticker frame loop.
 *
 * One TweenManager exists per Ticker instance, cached via WeakMap.
 * A lazy shared default Ticker is auto-created if none is provided.
 *
 * @module Animation
 */

import { Element } from "../core/Element";
import { type ITicker, Ticker } from "../core/Ticker";

/** Interface for objects managed by TweenManager. */
export interface IManagedTween {
  /** Advance the tween by `dt` seconds. Returns true if the tween is still active. */
  _update(dt: number): boolean;
}

// WeakMap: one manager per Ticker instance
const managers = new WeakMap<ITicker, TweenManager>();

// Lazy default Ticker singleton
let defaultTicker: Ticker | null = null;

/**
 * Manages a set of active tweens and dispatches `_update(dt)` on each
 * frame tick. Extends `Element` so it can be registered with a Ticker.
 */
export class TweenManager extends Element {
  private _tweens: Set<IManagedTween> = new Set();
  readonly ticker: ITicker;

  private constructor(ticker: ITicker) {
    super("__tween_manager__");
    this.ticker = ticker;
    this.interactive = false;
    ticker.add(this);
  }

  /**
   * Get or create the TweenManager for a given Ticker.
   * If no ticker is provided, uses a shared default Ticker.
   */
  static for(ticker?: ITicker): TweenManager {
    const t = ticker ?? TweenManager.getDefaultTicker();
    let manager = managers.get(t);
    if (!manager) {
      manager = new TweenManager(t);
      managers.set(t, manager);
    }
    return manager;
  }

  /** Get or create the shared default Ticker (auto-started). */
  static getDefaultTicker(): ITicker {
    if (!defaultTicker) {
      defaultTicker = new Ticker();
      defaultTicker.start();
    }
    return defaultTicker;
  }

  /** Register a tween for per-frame updates. */
  add(tween: IManagedTween): void {
    this._tweens.add(tween);
  }

  /** Unregister a tween. */
  remove(tween: IManagedTween): void {
    this._tweens.delete(tween);
  }

  /** Called by the Ticker each frame. Dispatches dt to all active tweens. */
  override update(dt: number): void {
    super.update(dt);
    for (const tween of this._tweens) {
      const active = tween._update(dt);
      if (!active) {
        this._tweens.delete(tween);
      }
    }
  }

  /** Number of active tweens. */
  get count(): number {
    return this._tweens.size;
  }
}
