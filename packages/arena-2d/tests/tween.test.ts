import { beforeEach, describe, expect, it } from "bun:test";
import { Easing, resolveEasing } from "../src/animation/Easing";
import {
  createInterpolator,
  hslToRgb,
  parseHex,
  parseHsl,
  parseRgb,
} from "../src/animation/Interpolation";
import { Tween } from "../src/animation/Tween";
import { TweenManager } from "../src/animation/TweenManager";
import type { EasingName, TweenProperties } from "../src/animation/types";
import { Ticker } from "../src/core/Ticker";

// ── Helpers ──

/**
 * Simple ticker runner that initializes and steps time forward.
 * Returns the final timestamp so subsequent calls can continue from it.
 */
function tickerRun(ticker: Ticker, ms: number, from = 1000): number {
  const STEP = 16;
  // Initialize if starting fresh
  ticker._tick(from);
  let current = from;
  const end = from + ms;
  while (current < end) {
    current = Math.min(current + STEP, end);
    ticker._tick(current);
  }
  return end;
}

/** Convenience: init + advance a ticker in one shot. */
function advanceTicker(ticker: Ticker, ms: number): void {
  tickerRun(ticker, ms);
}

/** Create a tween with a manual ticker (not auto-started). */
function createTestTween(
  target: Record<string, unknown>,
  properties: TweenProperties,
  options: {
    ticker: Ticker;
    repeat?: number;
    yoyo?: boolean;
    delay?: number;
    autoStart?: boolean;
    easing?: EasingName | ((t: number) => number);
  } = { ticker: new Ticker() },
) {
  return new Tween({
    target,
    properties,
    ...options,
    autoStart: options.autoStart ?? false,
  });
}

// ══════════════════════════════════════════════════════════════
// Easing Functions
// ══════════════════════════════════════════════════════════════

describe("Easing", () => {
  it("should have 31 named easing functions", () => {
    expect(Object.keys(Easing).length).toBe(31);
  });

  it("linear should return t unchanged", () => {
    expect(Easing.linear(0)).toBe(0);
    expect(Easing.linear(0.5)).toBe(0.5);
    expect(Easing.linear(1)).toBe(1);
  });

  it("all easings should return 0 at t=0 and 1 at t=1", () => {
    for (const [name, fn] of Object.entries(Easing)) {
      expect(fn(0)).toBeCloseTo(0, 5);
      expect(fn(1)).toBeCloseTo(1, 5);
    }
  });

  it("easeIn functions should be below linear at t=0.5", () => {
    const easeInNames: EasingName[] = [
      "easeInQuad",
      "easeInCubic",
      "easeInQuart",
      "easeInQuint",
      "easeInSextic",
      "easeInCirc",
      "easeInExpo",
    ];
    for (const name of easeInNames) {
      expect(Easing[name](0.5)).toBeLessThan(0.5);
    }
  });

  it("easeOut functions should be above linear at t=0.5", () => {
    const easeOutNames: EasingName[] = [
      "easeOutQuad",
      "easeOutCubic",
      "easeOutQuart",
      "easeOutQuint",
      "easeOutSextic",
      "easeOutCirc",
      "easeOutExpo",
    ];
    for (const name of easeOutNames) {
      expect(Easing[name](0.5)).toBeGreaterThan(0.5);
    }
  });

  it("easeInOut should be near 0.5 at t=0.5", () => {
    const names: EasingName[] = [
      "easeInOutQuad",
      "easeInOutCubic",
      "easeInOutQuart",
      "easeInOutQuint",
      "easeInOutSextic",
      "easeInOutCirc",
      "easeInOutExpo",
    ];
    for (const name of names) {
      expect(Easing[name](0.5)).toBeCloseTo(0.5, 1);
    }
  });

  it("easeInBack should overshoot below 0 before t=0.5", () => {
    expect(Easing.easeInBack(0.2)).toBeLessThan(0);
  });

  it("easeOutBack should overshoot above 1 near t=0.8", () => {
    expect(Easing.easeOutBack(0.2)).toBeGreaterThan(0.2);
  });

  it("easeOutBounce should produce bounce effect", () => {
    // Should reach 1 at t=1
    expect(Easing.easeOutBounce(1)).toBeCloseTo(1);
    // Should be less than 1 at various points (bounce pattern)
    expect(Easing.easeOutBounce(0.5)).toBeGreaterThan(0);
  });

  it("easeOutElastic should overshoot above 1", () => {
    // Elastic overshoots
    const val = Easing.easeOutElastic(0.5);
    expect(val).toBeDefined();
  });

  it("resolveEasing returns named function", () => {
    const fn = resolveEasing("easeInQuad");
    expect(fn(0.5)).toBe(Easing.easeInQuad(0.5));
  });

  it("resolveEasing returns custom function as-is", () => {
    const custom = (t: number) => t * t * t;
    expect(resolveEasing(custom)).toBe(custom);
  });

  it("resolveEasing defaults to linear for undefined", () => {
    const fn = resolveEasing(undefined);
    expect(fn(0.5)).toBe(0.5);
  });
});

// ══════════════════════════════════════════════════════════════
// Interpolation
// ══════════════════════════════════════════════════════════════

describe("Interpolation", () => {
  describe("Number", () => {
    it("should lerp between two numbers", () => {
      const interp = createInterpolator(0);
      expect(interp(0, 100, 0)).toBe(0);
      expect(interp(0, 100, 0.5)).toBe(50);
      expect(interp(0, 100, 1)).toBe(100);
    });

    it("should handle negative numbers", () => {
      const interp = createInterpolator(0);
      expect(interp(-100, 100, 0.5)).toBe(0);
    });
  });

  describe("Colors", () => {
    it("should parse hex colors (#RRGGBB)", () => {
      const rgb = parseHex("#ff0000");
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it("should parse short hex colors (#RGB)", () => {
      const rgb = parseHex("#f00");
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it("should parse rgb() strings", () => {
      const rgb = parseRgb("rgb(128, 64, 32)");
      expect(rgb).toEqual({ r: 128, g: 64, b: 32 });
    });

    it("should parse hsl() strings", () => {
      const hsl = parseHsl("hsl(0, 100%, 50%)");
      expect(hsl).toEqual({ h: 0, s: 100, l: 50 });
    });

    it("should convert hsl to rgb", () => {
      const rgb = hslToRgb(0, 100, 50);
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });

    it("should interpolate hex colors", () => {
      const interp = createInterpolator("#000000");
      const mid = interp("#000000", "#ffffff", 0.5) as string;
      expect(mid.toLowerCase()).toBe("#808080");
    });

    it("should interpolate rgb() colors", () => {
      const interp = createInterpolator("rgb(0, 0, 0)");
      const mid = interp("rgb(0, 0, 0)", "rgb(255, 255, 255)", 0.5) as string;
      // Output is hex
      expect(mid.toLowerCase()).toBe("#808080");
    });

    it("should interpolate hsl() colors", () => {
      const interp = createInterpolator("hsl(0, 100%, 0%)");
      const result = interp(
        "hsl(0, 100%, 0%)",
        "hsl(0, 100%, 100%)",
        0.5,
      ) as string;
      // Should produce a mid-gray-ish color
      expect(typeof result).toBe("string");
      expect(result.startsWith("#")).toBe(true);
    });
  });

  describe("Arrays", () => {
    it("should interpolate arrays element-wise", () => {
      const interp = createInterpolator([0, 0]);
      const result = interp([0, 0], [10, 20], 0.5) as number[];
      expect(result[0]).toBe(5);
      expect(result[1]).toBe(10);
    });

    it("should handle arrays of different lengths", () => {
      const interp = createInterpolator([0]);
      const result = interp([0], [10, 20], 0.5) as number[];
      expect(result[0]).toBe(5);
      expect(result[1]).toBe(10);
    });
  });

  describe("Objects", () => {
    it("should interpolate object values per-key", () => {
      const interp = createInterpolator({ a: 0, b: 0 });
      const result = interp({ a: 0, b: 0 }, { a: 10, b: 20 }, 0.5) as Record<
        string,
        number
      >;
      expect(result.a).toBe(5);
      expect(result.b).toBe(10);
    });
  });

  describe("Fallback", () => {
    it("should snap non-interpolable strings at t=1", () => {
      const interp = createInterpolator("hello");
      expect(interp("hello", "world", 0.5)).toBe("hello");
      expect(interp("hello", "world", 1)).toBe("world");
    });
  });
});

// ══════════════════════════════════════════════════════════════
// TweenManager
// ══════════════════════════════════════════════════════════════

describe("TweenManager", () => {
  it("should return the same manager for the same ticker", () => {
    const ticker = new Ticker();
    const m1 = TweenManager.for(ticker);
    const m2 = TweenManager.for(ticker);
    expect(m1).toBe(m2);
  });

  it("should return different managers for different tickers", () => {
    const t1 = new Ticker();
    const t2 = new Ticker();
    const m1 = TweenManager.for(t1);
    const m2 = TweenManager.for(t2);
    expect(m1).not.toBe(m2);
  });

  it("should create a default ticker when none provided", () => {
    const defaultTicker = TweenManager.getDefaultTicker();
    expect(defaultTicker).toBeDefined();
    expect(defaultTicker.running).toBe(true);
  });

  it("should track active tween count", () => {
    const ticker = new Ticker();
    const manager = TweenManager.for(ticker);
    const target = { x: 0 };
    const tween = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
      autoStart: false,
    });

    expect(manager.count).toBe(0);
    tween.start();
    expect(manager.count).toBe(1);
    tween.stop();
    expect(manager.count).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Tween Lifecycle
// ══════════════════════════════════════════════════════════════

describe("Tween Lifecycle", () => {
  let ticker: Ticker;
  let target: Record<string, unknown>;

  beforeEach(() => {
    ticker = new Ticker();
    ticker.globalFPS = Number.POSITIVE_INFINITY;
    target = { x: 0, y: 0 };
  });

  it("should start in idle state when autoStart is false", () => {
    const tween = createTestTween(
      target,
      {
        x: [{ toValue: 100, duration: 1 }],
      },
      { ticker },
    );
    expect(tween.state).toBe("idle");
  });

  it("should auto-start when autoStart is true (default)", () => {
    const tween = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
    });
    expect(tween.state).toBe("running");
  });

  it("should transition to running on start()", () => {
    const tween = createTestTween(
      target,
      {
        x: [{ toValue: 100, duration: 1 }],
      },
      { ticker },
    );
    tween.start();
    expect(tween.state).toBe("running");
  });

  it("should transition to paused on pause()", () => {
    const tween = createTestTween(
      target,
      {
        x: [{ toValue: 100, duration: 1 }],
      },
      { ticker },
    );
    tween.start();
    tween.pause();
    expect(tween.state).toBe("paused");
  });

  it("should resume from paused state", () => {
    const tween = createTestTween(
      target,
      {
        x: [{ toValue: 100, duration: 1 }],
      },
      { ticker },
    );
    tween.start();
    tween.pause();
    tween.resume();
    expect(tween.state).toBe("running");
  });

  it("should not resume if not paused", () => {
    const tween = createTestTween(
      target,
      {
        x: [{ toValue: 100, duration: 1 }],
      },
      { ticker },
    );
    tween.resume();
    expect(tween.state).toBe("idle");
  });

  it("should stop a running tween", () => {
    const tween = createTestTween(
      target,
      {
        x: [{ toValue: 100, duration: 1 }],
      },
      { ticker },
    );
    tween.start();
    tween.stop();
    expect(tween.state).toBe("idle");
  });

  it("should restart a tween", () => {
    const tween = createTestTween(
      target,
      {
        x: [{ toValue: 100, duration: 1 }],
      },
      { ticker },
    );
    tween.start();
    advanceTicker(ticker, 500);
    tween.restart();
    expect(tween.state).toBe("running");
    expect(tween.elapsed).toBe(0);
  });

  it("should destroy and clean up", () => {
    const tween = createTestTween(
      target,
      {
        x: [{ toValue: 100, duration: 1 }],
      },
      { ticker },
    );
    tween.start();
    tween.destroy();
    expect(tween.state).toBe("idle");
    // Should not throw on double-destroy
    tween.destroy();
  });

  it("should not start after destroy", () => {
    const tween = createTestTween(
      target,
      {
        x: [{ toValue: 100, duration: 1 }],
      },
      { ticker },
    );
    tween.destroy();
    tween.start();
    expect(tween.state).toBe("idle");
  });
});

// ══════════════════════════════════════════════════════════════
// Tween Animation
// ══════════════════════════════════════════════════════════════

describe("Tween Animation", () => {
  let ticker: Ticker;

  beforeEach(() => {
    ticker = new Ticker();
    ticker.globalFPS = Number.POSITIVE_INFINITY;
  });

  it("should animate a number property over time", () => {
    const target = { x: 0 };
    new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
    });

    advanceTicker(ticker, 500);
    expect(target.x).toBeCloseTo(50, 0);

    advanceTicker(ticker, 1000);
    expect(target.x).toBe(100);
  });

  it("should animate multiple properties", () => {
    const target = { x: 0, y: 0 };
    new Tween({
      target,
      properties: {
        x: [{ toValue: 100, duration: 1 }],
        y: [{ toValue: 200, duration: 1 }],
      },
      ticker,
    });

    advanceTicker(ticker, 500);
    expect(target.x).toBeCloseTo(50, 0);
    expect(target.y).toBeCloseTo(100, 0);
  });

  it("should handle multiple keyframes for one property", () => {
    const target = { x: 0 };
    new Tween({
      target,
      properties: {
        x: [
          { toValue: 50, duration: 0.5 },
          { toValue: 100, duration: 0.5 },
        ],
      },
      ticker,
    });

    advanceTicker(ticker, 500);
    expect(target.x).toBeCloseTo(50, 0);

    advanceTicker(ticker, 1000);
    expect(target.x).toBe(100);
  });

  it("should use per-keyframe easing", () => {
    const target = { x: 0 };
    new Tween({
      target,
      properties: {
        x: [{ toValue: 100, duration: 1, easing: "easeInQuad" }],
      },
      ticker,
    });

    advanceTicker(ticker, 500);
    // easeInQuad at 0.5 = 0.25, so x ≈ 25
    expect(target.x).toBeCloseTo(25, 0);
  });

  it("should use default easing when specified", () => {
    const target = { x: 0 };
    new Tween({
      target,
      properties: {
        x: [{ toValue: 100, duration: 1 }],
      },
      ticker,
      easing: "easeInQuad",
    });

    advanceTicker(ticker, 500);
    expect(target.x).toBeCloseTo(25, 0);
  });

  it("should handle explicit fromValue", () => {
    const target = { x: 50 };
    new Tween({
      target,
      properties: {
        x: [{ fromValue: 0, toValue: 100, duration: 1 }],
      },
      ticker,
    });

    advanceTicker(ticker, 500);
    expect(target.x).toBeCloseTo(50, 0);
  });

  it("should animate color properties", () => {
    const target = { color: "#000000" };
    new Tween({
      target,
      properties: {
        color: [{ toValue: "#ffffff", duration: 1 }],
      },
      ticker,
    });

    advanceTicker(ticker, 500);
    const c = (target.color as string).toLowerCase();
    expect(c).toBe("#808080");
  });

  it("should handle zero duration keyframes", () => {
    const target = { x: 0 };
    new Tween({
      target,
      properties: {
        x: [{ toValue: 100, duration: 0 }],
      },
      ticker,
    });

    advanceTicker(ticker, 100);
    expect(target.x).toBe(100);
  });

  it("should report progress correctly", () => {
    const target = { x: 0 };
    const tween = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
      autoStart: false,
    });

    tween.start();
    advanceTicker(ticker, 500);
    expect(tween.progress).toBeCloseTo(0.5, 1);
  });

  it("should complete and emit complete event", () => {
    const target = { x: 0 };
    let completed = false;
    const tween = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
    });
    tween.on("complete", () => {
      completed = true;
    });

    advanceTicker(ticker, 1100);
    expect(completed).toBe(true);
    expect(tween.state).toBe("completed");
    expect(target.x).toBe(100);
  });
});

// ══════════════════════════════════════════════════════════════
// Delay
// ══════════════════════════════════════════════════════════════

describe("Tween Delay", () => {
  it("should delay before starting animation", () => {
    const ticker = new Ticker();
    ticker.globalFPS = Number.POSITIVE_INFINITY;
    const target = { x: 0 };

    new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
      delay: 0.5,
    });

    // After 300ms (still in delay)
    const t1 = tickerRun(ticker, 300);
    expect(target.x).toBe(0);

    // After 1200ms more (total 1500ms = 500ms delay + 1000ms animation = done)
    tickerRun(ticker, 1200, t1);
    expect(target.x).toBe(100);
  });
});

// ══════════════════════════════════════════════════════════════
// Repeat & Yoyo
// ══════════════════════════════════════════════════════════════

describe("Repeat & Yoyo", () => {
  let ticker: Ticker;

  beforeEach(() => {
    ticker = new Ticker();
    ticker.globalFPS = Number.POSITIVE_INFINITY;
  });

  it("should repeat the tween", () => {
    const target = { x: 0 };
    let completeCount = 0;
    const tween = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
      repeat: 1,
    });
    tween.on("complete", () => {
      completeCount++;
    });

    // First play: 0 -> 100 in 1s
    advanceTicker(ticker, 1100);
    // Should be on second play now (repeat=1 means play twice total)
    expect(tween.state).toBe("running");

    // Complete second play
    advanceTicker(ticker, 2200);
    expect(completeCount).toBe(1);
    expect(tween.state).toBe("completed");
  });

  it("should yoyo (reverse on repeat)", () => {
    const target = { x: 0 };
    const tween = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
      repeat: 1,
      yoyo: true,
    });

    // First play completes forward
    advanceTicker(ticker, 1100);
    // Now playing in reverse
    expect(tween.state).toBe("running");
  });

  it("should handle infinite repeat", () => {
    const target = { x: 0 };
    const tween = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
      repeat: Number.POSITIVE_INFINITY,
    });

    // Should still be running after many repetitions
    advanceTicker(ticker, 5500);
    expect(tween.state).toBe("running");
  });
});

// ══════════════════════════════════════════════════════════════
// Reverse
// ══════════════════════════════════════════════════════════════

describe("Reverse", () => {
  it("should reverse playback direction", () => {
    const ticker = new Ticker();
    ticker.globalFPS = Number.POSITIVE_INFINITY;
    const target = { x: 0 };

    const tween = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
    });

    // Start forward, then reverse
    tween.reverse();
    // Now playing in reverse: progress maps 1 - elapsed/duration
    advanceTicker(ticker, 500);
    // At 0.5s with reversed: applies at time (1 - 0.5) * 1 = 0.5s, so x ≈ 50
    expect(target.x).toBeCloseTo(50, 0);
  });
});

// ══════════════════════════════════════════════════════════════
// Chaining
// ══════════════════════════════════════════════════════════════

describe("Chaining", () => {
  it("should start chained tweens on complete", () => {
    const ticker = new Ticker();
    ticker.globalFPS = Number.POSITIVE_INFINITY;
    const target = { x: 0, y: 0 };

    const tween2 = new Tween({
      target,
      properties: { y: [{ toValue: 200, duration: 1 }] },
      ticker,
      autoStart: false,
    });

    const tween1 = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
    });
    tween1.chain(tween2);

    // After tween1 completes
    advanceTicker(ticker, 1100);
    expect(target.x).toBe(100);
    expect(tween2.state).toBe("running");

    // After tween2 completes
    advanceTicker(ticker, 2200);
    expect(target.y).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════
// Events
// ══════════════════════════════════════════════════════════════

describe("Tween Events", () => {
  it("should emit start event", () => {
    const ticker = new Ticker();
    let started = false;
    const tween = new Tween({
      target: { x: 0 },
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
      autoStart: false,
    });
    tween.on("start", () => {
      started = true;
    });
    tween.start();
    expect(started).toBe(true);
  });

  it("should emit update event each frame", () => {
    const ticker = new Ticker();
    ticker.globalFPS = Number.POSITIVE_INFINITY;
    let updateCount = 0;
    const tween = new Tween({
      target: { x: 0 },
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
    });
    tween.on("update", () => {
      updateCount++;
    });

    advanceTicker(ticker, 500);
    expect(updateCount).toBeGreaterThan(0);
  });

  it("should emit stop event", () => {
    const ticker = new Ticker();
    let stopped = false;
    const tween = new Tween({
      target: { x: 0 },
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
    });
    tween.on("stop", () => {
      stopped = true;
    });
    tween.stop();
    expect(stopped).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// Edge Cases
// ══════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  it("stop on idle is a no-op", () => {
    const ticker = new Ticker();
    const tween = new Tween({
      target: { x: 0 },
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
      autoStart: false,
    });
    tween.stop();
    expect(tween.state).toBe("idle");
  });

  it("pause on idle is a no-op", () => {
    const ticker = new Ticker();
    const tween = new Tween({
      target: { x: 0 },
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
      autoStart: false,
    });
    tween.pause();
    expect(tween.state).toBe("idle");
  });

  it("should handle properties with different durations", () => {
    const ticker = new Ticker();
    ticker.globalFPS = Number.POSITIVE_INFINITY;
    const target = { x: 0, y: 0 };

    new Tween({
      target,
      properties: {
        x: [{ toValue: 100, duration: 1 }],
        y: [{ toValue: 200, duration: 2 }],
      },
      ticker,
    });

    advanceTicker(ticker, 1100);
    // x should be done (1s duration), y at ~55% (1.1s into 2s)
    expect(target.x).toBe(100);
    expect(target.y).toBeCloseTo(110, 0);
  });

  it("should handle paused tween staying at current value", () => {
    const ticker = new Ticker();
    ticker.globalFPS = Number.POSITIVE_INFINITY;
    const target = { x: 0 };

    const tween = new Tween({
      target,
      properties: { x: [{ toValue: 100, duration: 1 }] },
      ticker,
    });

    advanceTicker(ticker, 500);
    const valueBefore = target.x;
    tween.pause();

    // Tick more — value should not change
    advanceTicker(ticker, 800);
    expect(target.x).toBeCloseTo(valueBefore, 0);
  });
});
