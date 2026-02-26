import { describe, expect, mock, test } from "bun:test";
import { DirtyFlags } from "../src/core/DirtyFlags";
import { Element } from "../src/core/Element";
import { identity } from "../src/math/matrix";

// ── DirtyFlags ──

describe("DirtyFlags", () => {
  test("None is 0", () => {
    expect(DirtyFlags.None).toBe(0);
  });

  test("individual flags are distinct bit positions", () => {
    expect(DirtyFlags.Transform).toBe(1);
    expect(DirtyFlags.Visual).toBe(2);
    expect(DirtyFlags.Layout).toBe(4);
    expect(DirtyFlags.Spatial).toBe(8);
  });

  test("All covers all flags", () => {
    expect(DirtyFlags.All).toBe(
      DirtyFlags.Transform |
        DirtyFlags.Visual |
        DirtyFlags.Layout |
        DirtyFlags.Spatial |
        DirtyFlags.Order,
    );
  });

  test("bitwise OR combines flags", () => {
    const combined = DirtyFlags.Transform | DirtyFlags.Visual;
    expect(combined & DirtyFlags.Transform).toBeTruthy();
    expect(combined & DirtyFlags.Visual).toBeTruthy();
    expect(combined & DirtyFlags.Layout).toBeFalsy();
  });
});

// ── Element: Defaults ──

describe("Element — defaults", () => {
  test("has auto-generated id", () => {
    const el = new Element();
    expect(el.id).toMatch(/^el_\d+$/);
  });

  test("accepts custom id", () => {
    const el = new Element("my-element");
    expect(el.id).toBe("my-element");
  });

  test("default visual properties", () => {
    const el = new Element();
    expect(el.visible).toBe(true);
    expect(el.alpha).toBe(1);
    expect(el.zIndex).toBe(0);
    expect(el.blendMode).toBe("source-over");
    expect(el.cacheAsBitmap).toBe(false);
  });

  test("default transform properties", () => {
    const el = new Element();
    expect(el.x).toBe(0);
    expect(el.y).toBe(0);
    expect(el.rotation).toBe(0);
    expect(el.scaleX).toBe(1);
    expect(el.scaleY).toBe(1);
    expect(el.skewX).toBe(0);
    expect(el.skewY).toBe(0);
    expect(el.pivotX).toBe(0);
    expect(el.pivotY).toBe(0);
  });

  test("default parent/scene/layer are null", () => {
    const el = new Element();
    expect(el.parent).toBeNull();
    expect(el.scene).toBeNull();
    expect(el.layer).toBeNull();
  });

  test("starts with All dirty flags", () => {
    const el = new Element();
    expect(el.dirtyFlags & DirtyFlags.All).toBe(DirtyFlags.All);
  });
});

// ── Element: Transform invalidation ──

describe("Element — transform invalidation", () => {
  test("setting x marks Transform dirty", () => {
    const el = new Element();
    el.update(0); // clear initial flags
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeFalsy();

    el.x = 10;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
  });

  test("setting y marks Transform dirty", () => {
    const el = new Element();
    el.update(0);
    el.y = 20;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
  });

  test("setting rotation marks Transform dirty", () => {
    const el = new Element();
    el.update(0);
    el.rotation = Math.PI / 4;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
  });

  test("setting scaleX marks Transform dirty", () => {
    const el = new Element();
    el.update(0);
    el.scaleX = 2;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
  });

  test("setting scaleY marks Transform dirty", () => {
    const el = new Element();
    el.update(0);
    el.scaleY = 0.5;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
  });

  test("setting pivotX marks Transform dirty", () => {
    const el = new Element();
    el.update(0);
    el.pivotX = 50;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
  });

  test("setting pivotY marks Transform dirty", () => {
    const el = new Element();
    el.update(0);
    el.pivotY = 50;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
  });

  test("setting skewX marks Transform dirty", () => {
    const el = new Element();
    el.update(0);
    el.skewX = 0.1;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
  });

  test("setting skewY marks Transform dirty", () => {
    const el = new Element();
    el.update(0);
    el.skewY = 0.2;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
  });

  test("setting same value does NOT re-flag", () => {
    const el = new Element();
    el.update(0);
    el.x = 0; // same as default
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeFalsy();
  });
});

// ── Element: Visual invalidation ──

describe("Element — visual invalidation", () => {
  test("setting alpha marks Visual dirty", () => {
    const el = new Element();
    el.update(0);
    el.alpha = 0.5;
    expect(el.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
  });

  test("setting visible marks Visual dirty", () => {
    const el = new Element();
    el.update(0);
    el.visible = false;
    expect(el.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
  });

  test("setting zIndex marks Visual dirty", () => {
    const el = new Element();
    el.update(0);
    el.zIndex = 5;
    expect(el.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
  });

  test("setting blendMode marks Visual dirty", () => {
    const el = new Element();
    el.update(0);
    el.blendMode = "multiply";
    expect(el.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
  });
});

// ── Element: Flag coalescing ──

describe("Element — flag coalescing", () => {
  test("multiple property sets produce combined flags", () => {
    const el = new Element();
    el.update(0);

    el.x = 10; // → Transform
    el.alpha = 0.5; // → Visual
    el.invalidate(DirtyFlags.Layout); // → Layout

    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();
    expect(el.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
    expect(el.dirtyFlags & DirtyFlags.Layout).toBeTruthy();
  });

  test("duplicate invalidations don't duplicate flags", () => {
    const el = new Element();
    // Clear all initial flags by running update then manually clearing Visual/Layout/Spatial
    el.update(0);
    // Manually trigger and clear remaining flags by direct invalidate pattern
    // For this test, create a fresh element and immediately clear flags
    const el2 = new Element();
    el2.update(0); // clears Transform
    // Element still has Visual|Layout|Spatial from initial All
    // Let's test that setting transform 3 times only adds Transform flag once
    // The key invariant: ORing the same flag multiple times = same result
    const before = el2.dirtyFlags;
    el2.x = 10;
    el2.y = 20;
    el2.rotation = 1;

    // Transform was set 3 times but the flag value should be before | Transform
    expect(el2.dirtyFlags).toBe(before | DirtyFlags.Transform);
  });
});

// ── Element: update() ──

describe("Element — update()", () => {
  test("update clears Transform flag", () => {
    const el = new Element();
    el.x = 50;
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeTruthy();

    el.update(0);
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeFalsy();
  });

  test("update recomputes worldMatrix for root element", () => {
    const el = new Element();
    el.x = 100;
    el.y = 50;
    el.update(0);

    // For a root element with no parent, worldMatrix = localMatrix
    // Translation: tx = 100, ty = 50
    expect(el.worldMatrix[4]).toBeCloseTo(100, 5);
    expect(el.worldMatrix[5]).toBeCloseTo(50, 5);
  });

  test("update recomputes worldMatrix with parent", () => {
    const parent = new Element();
    parent.x = 10;
    parent.y = 20;
    parent.update(0);

    const child = new Element();
    child.parent = parent;
    child.x = 5;
    child.y = 3;
    child.update(0);

    // worldMatrix = parent.worldMatrix × child.localMatrix
    // parent translates (10, 20), child translates (5, 3)
    // result should be (15, 23)
    expect(child.worldMatrix[4]).toBeCloseTo(15, 5);
    expect(child.worldMatrix[5]).toBeCloseTo(23, 5);
  });

  test("update does not clear non-Transform flags", () => {
    const el = new Element();
    el.update(0); // clear initial
    el.invalidate(DirtyFlags.Visual | DirtyFlags.Transform);

    el.update(0);
    // Transform should be cleared, Visual should remain
    expect(el.dirtyFlags & DirtyFlags.Transform).toBeFalsy();
    expect(el.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
  });
});

// ── Element: Alpha chain ──

describe("Element — alpha chain", () => {
  test("effectiveAlpha is alpha for root element", () => {
    const el = new Element();
    el.alpha = 0.8;
    expect(el.effectiveAlpha).toBeCloseTo(0.8, 5);
  });

  test("effectiveAlpha is multiplicative through parent", () => {
    const parent = new Element();
    parent.alpha = 0.5;

    const child = new Element();
    child.parent = parent;
    child.alpha = 0.6;

    expect(child.effectiveAlpha).toBeCloseTo(0.3, 5);
  });

  test("effectiveAlpha chains through multiple levels", () => {
    const grandparent = new Element();
    grandparent.alpha = 0.5;

    const parent = new Element();
    parent.parent = grandparent;
    parent.alpha = 0.5;

    const child = new Element();
    child.parent = parent;
    child.alpha = 0.5;

    expect(child.effectiveAlpha).toBeCloseTo(0.125, 5);
  });

  test("alpha is clamped to [0, 1]", () => {
    const el = new Element();
    el.alpha = 2;
    expect(el.alpha).toBe(1);

    el.alpha = -1;
    expect(el.alpha).toBe(0);
  });

  test("effectiveAlpha is 0 when parent alpha is 0", () => {
    const parent = new Element();
    parent.alpha = 0;

    const child = new Element();
    child.parent = parent;
    child.alpha = 1;

    expect(child.effectiveAlpha).toBe(0);
  });
});

// ── Element: destroy() ──

describe("Element — destroy()", () => {
  test("destroy clears dirty flags", () => {
    const el = new Element();
    el.invalidate(DirtyFlags.All);
    el.destroy();
    expect(el.dirtyFlags).toBe(DirtyFlags.None);
  });

  test("destroy removes all event listeners", () => {
    const el = new Element();
    const handler = mock(() => {});
    el.on("test", handler);

    el.destroy();
    el.emit("test", {});

    expect(handler).not.toHaveBeenCalled();
  });

  test("destroy clears parent/scene/layer", () => {
    const parent = new Element();
    const el = new Element();
    el.parent = parent;
    el.scene = "fake-scene";
    el.layer = "fake-layer";

    el.destroy();
    expect(el.parent).toBeNull();
    expect(el.scene).toBeNull();
    expect(el.layer).toBeNull();
  });
});

// ── Element: Lifecycle hooks ──

describe("Element — lifecycle hooks", () => {
  test("onAdded is callable", () => {
    const el = new Element();
    const parent = new Element();
    expect(() => el.onAdded(parent)).not.toThrow();
  });

  test("onRemoved is callable", () => {
    const el = new Element();
    const parent = new Element();
    expect(() => el.onRemoved(parent)).not.toThrow();
  });

  test("onSceneChanged is callable", () => {
    const el = new Element();
    expect(() => el.onSceneChanged(null)).not.toThrow();
  });
});

// ── Element: EventEmitter integration ──

describe("Element — EventEmitter", () => {
  test("element can emit and listen to events", () => {
    const el = new Element();
    const handler = mock(() => {});

    el.on("click", handler);
    el.emit("click", { x: 10, y: 20 });

    expect(handler).toHaveBeenCalledWith({ x: 10, y: 20 });
  });

  test("element supports once()", () => {
    const el = new Element();
    const handler = mock(() => {});

    el.once("click", handler);
    el.emit("click", {});
    el.emit("click", {});

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
