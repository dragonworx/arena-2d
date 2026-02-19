import { describe, expect, test } from "bun:test";
import { Element } from "../src/core/Element";
import { Ticker } from "../src/core/Ticker";

// ── Helper: simulate frames by calling _tick() with synthetic timestamps ──

function simulateFrames(
  ticker: Ticker,
  count: number,
  intervalMs: number,
  startMs = 0,
): number {
  let t = startMs;
  for (let i = 0; i < count; i++) {
    ticker._tick(t);
    t += intervalMs;
  }
  return t;
}

// ── Construction ──

describe("Ticker — defaults", () => {
  test("default globalFPS is 60", () => {
    const t = new Ticker();
    expect(t.globalFPS).toBe(60);
  });

  test("default maxDeltaTime is 0.1", () => {
    const t = new Ticker();
    expect(t.maxDeltaTime).toBe(0.1);
  });

  test("initial deltaTime is 0", () => {
    const t = new Ticker();
    expect(t.deltaTime).toBe(0);
  });

  test("initial elapsedTime is 0", () => {
    const t = new Ticker();
    expect(t.elapsedTime).toBe(0);
  });

  test("initial running is false", () => {
    const t = new Ticker();
    expect(t.running).toBe(false);
  });
});

// ── DeltaTime computation ──

describe("Ticker — deltaTime", () => {
  test("computes deltaTime in seconds", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY; // No throttling
    t._tick(0); // First frame (init)
    t._tick(16); // 16ms later → real tick
    expect(t.deltaTime).toBeCloseTo(0.016, 3);
  });

  test("deltaTime is clamped to maxDeltaTime", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;
    t.maxDeltaTime = 0.1;
    t._tick(0);
    t._tick(500); // 500ms gap → should clamp
    expect(t.deltaTime).toBe(0.1);
  });

  test("custom maxDeltaTime is respected", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;
    t.maxDeltaTime = 0.05;
    t._tick(0);
    t._tick(200);
    expect(t.deltaTime).toBe(0.05);
  });

  test("negative delta is clamped to 0", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;
    t._tick(100);
    t._tick(50); // Time went backwards
    expect(t.deltaTime).toBe(0);
  });

  test("normal delta at 60fps", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;
    t._tick(0);
    t._tick(16.667);
    expect(t.deltaTime).toBeCloseTo(0.016667, 4);
  });
});

// ── Elapsed time ──

describe("Ticker — elapsedTime", () => {
  test("accumulates clamped deltas", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;
    t._tick(0); // init
    t._tick(16); // dt=0.016
    t._tick(32); // dt=0.016
    t._tick(48); // dt=0.016
    // 3 × 0.016 = 0.048
    expect(t.elapsedTime).toBeCloseTo(0.048, 3);
  });

  test("clamped frames contribute maxDeltaTime to elapsed", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;
    t.maxDeltaTime = 0.1;
    t._tick(0); // init
    t._tick(500); // 500ms → clamped to 0.1
    expect(t.elapsedTime).toBeCloseTo(0.1, 3);
  });

  test("elapsed does not increase during pause", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;
    t._tick(0);
    t._tick(16);
    const before = t.elapsedTime;
    t.globalFPS = 0;
    t._tick(32);
    t._tick(48);
    expect(t.elapsedTime).toBe(before);
  });
});

// ── FPS throttling ──

describe("Ticker — FPS throttling", () => {
  test("globalFPS=30 on 60Hz skips roughly half the frames", () => {
    const t = new Ticker();
    t.globalFPS = 30;

    let tickCount = 0;
    const el = new Element("counter");
    el.update = () => {
      tickCount++;
    };
    t.add(el);

    // Simulate 61 calls at ~16.67ms intervals (60Hz display)
    // 1 init + 60 frames. At 30fps → ~30 ticks
    simulateFrames(t, 61, 16.667, 0);
    expect(tickCount).toBeGreaterThanOrEqual(28);
    expect(tickCount).toBeLessThanOrEqual(32);
  });

  test("globalFPS=0 pauses — no updates fire", () => {
    const t = new Ticker();
    t.globalFPS = 0;

    let tickCount = 0;
    const el = new Element("counter");
    el.update = () => {
      tickCount++;
    };
    t.add(el);

    simulateFrames(t, 10, 16.667, 0);
    expect(tickCount).toBe(0);
  });

  test("globalFPS=Infinity runs every frame", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;

    let tickCount = 0;
    const el = new Element("counter");
    el.update = () => {
      tickCount++;
    };
    t.add(el);

    // 11 calls: 1 init + 10 frames
    simulateFrames(t, 11, 16.667, 0);
    expect(tickCount).toBe(10);
  });

  test("dt matches target interval when throttled (low FPS)", () => {
    const t = new Ticker();
    // 10 FPS = 100ms interval
    t.globalFPS = 10;
    t.maxDeltaTime = 1.0; 

    const dts: number[] = [];
    const el = new Element("tracker");
    el.update = (dt) => dts.push(dt);
    t.add(el);

    let time = 0;
    t._tick(time); // Init

    // Simulate 60Hz rAF (approx 16.667ms)
    // We need ~6 frames to reach 100ms
    // Frame 0: 0ms (init)
    // Frame 6: 100.0ms -> acc=100.0 -> FIRE
    
    // Step forward in 16.667ms increments
    for(let i=0; i<6; i++) {
        time += 16.667;
        t._tick(time);
    }

    // Expecting 1 tick
    expect(dts.length).toBe(1);
    // The dt should be close to 0.1 (100ms), NOT 0.016 (16ms)
    // If it fails (current bug), it will be close to 0.016
    expect(dts[0]).toBeCloseTo(0.1, 1);
  });
});

// ── Start / Stop ──

describe("Ticker — start/stop", () => {
  test("stop then start does not produce delta spike", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;

    // Simulate a few frames
    t._tick(0);
    t._tick(16);
    expect(t.deltaTime).toBeCloseTo(0.016, 3);

    // Simulate stop + start (without rAF, just reset init flag)
    t.stop();
    t.start();

    // After start(), _initialized is false. First _tick is init frame.
    t._tick(5000); // 5 seconds later — init frame, no delta spike
    expect(t.deltaTime).toBeCloseTo(0.016, 3); // Still old value

    t._tick(5016); // Real frame: 16ms since 5000
    expect(t.deltaTime).toBeCloseTo(0.016, 3); // Normal delta
  });

  test("running is true after start, false after stop", () => {
    const t = new Ticker();
    expect(t.running).toBe(false);
    t.start();
    expect(t.running).toBe(true);
    t.stop();
    expect(t.running).toBe(false);
  });

  test("double start is no-op", () => {
    const t = new Ticker();
    t.start();
    t.start(); // should not throw
    expect(t.running).toBe(true);
    t.stop();
  });

  test("double stop is no-op", () => {
    const t = new Ticker();
    t.stop();
    expect(t.running).toBe(false);
  });
});

// ── Add / Remove ──

describe("Ticker — element registration", () => {
  test("added elements receive update(dt)", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;

    const updates: number[] = [];
    const el = new Element("test");
    el.update = (dt: number) => {
      updates.push(dt);
    };

    t.add(el);
    t._tick(0); // init
    t._tick(16); // tick 1
    t._tick(32); // tick 2

    expect(updates.length).toBe(2);
    expect(updates[0]).toBeCloseTo(0.016, 3);
    expect(updates[1]).toBeCloseTo(0.016, 3);
  });

  test("removed elements stop receiving updates", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;

    const updates: number[] = [];
    const el = new Element("test");
    el.update = (dt: number) => {
      updates.push(dt);
    };

    t.add(el);
    t._tick(0); // init
    t._tick(16); // tick → 1 update
    expect(updates.length).toBe(1);

    t.remove(el);
    t._tick(32); // tick → no update
    expect(updates.length).toBe(1);
  });

  test("adding same element twice is idempotent", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;

    let count = 0;
    const el = new Element("test");
    el.update = () => {
      count++;
    };

    t.add(el);
    t.add(el); // Duplicate
    t._tick(0); // init
    t._tick(16); // tick
    expect(count).toBe(1); // Only one update
  });
});

// ── First frame behavior ──

describe("Ticker — first frame", () => {
  test("first _tick sets lastTime but does not fire updates", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;

    let count = 0;
    const el = new Element("test");
    el.update = () => {
      count++;
    };
    t.add(el);

    t._tick(1000); // init frame
    expect(count).toBe(0);
    expect(t.deltaTime).toBe(0);
  });

  test("first _tick with timestamp 0 works correctly", () => {
    const t = new Ticker();
    t.globalFPS = Number.POSITIVE_INFINITY;

    let count = 0;
    const el = new Element("test");
    el.update = () => {
      count++;
    };
    t.add(el);

    t._tick(0); // init frame at t=0
    expect(count).toBe(0);
    t._tick(16); // real frame
    expect(count).toBe(1);
    expect(t.deltaTime).toBeCloseTo(0.016, 3);
  });
});
