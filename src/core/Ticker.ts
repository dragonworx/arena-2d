/**
 * Ticker — Single requestAnimationFrame loop driving the frame pipeline.
 *
 * Provides stable deltaTime (clamped), FPS throttling, and elapsed time
 * accumulation. Orchestrates update calls on registered elements.
 *
 * SPEC: §7 (Hierarchical Ticker System)
 */

import type { IElement } from "./Element";

// ── ITicker Interface ──

export interface ITicker {
  /** Target frames per second. Default: 60. 0 = paused. */
  globalFPS: number;
  /** Clamp ceiling for deltaTime in seconds. Default: 0.1 */
  maxDeltaTime: number;
  /** Seconds since last frame (after clamping). */
  readonly deltaTime: number;
  /** Total accumulated seconds since start(). */
  readonly elapsedTime: number;
  /** Whether the ticker is currently running. */
  readonly running: boolean;

  add(element: IElement): void;
  remove(element: IElement): void;
  start(): void;
  stop(): void;

  /** Set a callback to be invoked after the update phase (for rendering). */
  setRenderCallback(callback: (() => void) | null): void;

  /** @internal Manual tick for testing. Do not use in production. */
  _tick(timestamp: number): void;
}

// ── Ticker Class ──

export class Ticker implements ITicker {
  globalFPS = 60;
  maxDeltaTime = 0.1;

  private _deltaTime = 0;
  private _elapsedTime = 0;
  private _lastTime = -1;
  private _lastTickTime = -1;
  private _initialized = false;
  private _rafId: number | null = null;
  private _running = false;
  private _elements: Set<IElement> = new Set();
  private _renderCallback: (() => void) | null = null;
  private _rafCallback = (t: number) => this._tick(t);

  /**
   * Accumulated time since last tick in ms.
   * Used for FPS throttling — we only fire a tick when this
   * exceeds the minimum frame interval.
   */
  private _accumulator = 0;

  get deltaTime(): number {
    return this._deltaTime;
  }

  get elapsedTime(): number {
    return this._elapsedTime;
  }

  /** Whether the ticker loop is currently running. */
  get running(): boolean {
    return this._running;
  }

  // ── Element registration ──

  add(element: IElement): void {
    this._elements.add(element);
  }

  remove(element: IElement): void {
    this._elements.delete(element);
  }

  setRenderCallback(callback: (() => void) | null): void {
    this._renderCallback = callback;
  }

  // ── Loop control ──

  start(): void {
    if (this._running) return;
    this._running = true;
    this._initialized = false; // Reset to prevent delta spike
    this._accumulator = 0;
    this._requestFrame();
  }

  stop(): void {
    if (!this._running) return;
    this._running = false;
    if (this._rafId !== null) {
      if (typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(this._rafId);
      }
      this._rafId = null;
    }
  }

  // ── Internal: the frame callback ──

  /**
   * Core tick function. Called by requestAnimationFrame with a DOMHighResTimestamp,
   * or called manually in tests with synthetic timestamps.
   *
   * @param timestamp - Time in milliseconds (same unit as performance.now())
   */
  _tick(timestamp: number): void {
    // First frame: just record the time, no delta to compute
    if (!this._initialized) {
      this._initialized = true;
      this._lastTime = timestamp;
      this._lastTickTime = timestamp;
      if (this._running) this._requestFrame();
      return;
    }

    const rawDeltaMs = timestamp - this._lastTime;

    // FPS throttling: if globalFPS > 0 and finite, skip frames that come too early
    if (this.globalFPS > 0 && Number.isFinite(this.globalFPS)) {
      this._accumulator += rawDeltaMs;
      const minInterval = 1000 / this.globalFPS;

      if (this._accumulator < minInterval) {
        // Not enough time has passed — skip this frame
        this._lastTime = timestamp;
        if (this._running) this._requestFrame();
        return;
      }

      // Reset accumulator (consume one interval)
      this._accumulator -= minInterval;
      // Prevent accumulator from growing unbounded (e.g. after tab switch)
      if (this._accumulator > minInterval) {
        this._accumulator = 0;
      }
    } else if (this.globalFPS === 0) {
      // Paused: update lastTime but don't tick
      this._lastTime = timestamp;
      this._lastTickTime = timestamp;
      if (this._running) this._requestFrame();
      return;
    }
    // else: globalFPS is Infinity or non-finite → no throttling, run every frame

    this._lastTime = timestamp;

    // Compute deltaTime in seconds, clamp to maxDeltaTime
    const dtMs = timestamp - this._lastTickTime;
    this._lastTickTime = timestamp;

    let dt = dtMs / 1000;
    if (dt > this.maxDeltaTime) {
      dt = this.maxDeltaTime;
    }
    if (dt < 0) {
      dt = 0;
    }

    this._deltaTime = dt;
    this._elapsedTime += dt;

    // Pipeline step: Update registered elements
    for (const element of this._elements) {
      element.update(dt);
    }

    // Pipeline step: Render (if callback registered)
    if (this._renderCallback) {
      this._renderCallback();
    }

    // Request next frame
    if (this._running) this._requestFrame();
  }

  private _requestFrame(): void {
    if (typeof requestAnimationFrame !== "undefined") {
      this._rafId = requestAnimationFrame(this._rafCallback);
    }
  }
}
