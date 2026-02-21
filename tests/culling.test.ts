import { describe, expect, it, mock } from "bun:test";
import { Container } from "../src/core/Container";
import { Element } from "../src/core/Element";
import { Scene } from "../src/core/Scene";
import { View } from "../src/core/View";
import { ScrollContainer } from "../src/elements/ScrollContainer";
import { computeAABB, intersect, rectIntersection } from "../src/math/aabb";

// ── Mock DOM ──

const mockContext = {
  save: mock(),
  restore: mock(),
  setTransform: mock(),
  transform: mock(),
  clearRect: mock(),
  fillText: mock(),
  beginPath: mock(),
  rect: mock(),
  fill: mock(),
  stroke: mock(),
  clip: mock(),
  roundRect: mock(),
  fillRect: mock(),
  strokeRect: mock(),
  globalAlpha: 1,
  globalCompositeOperation: "source-over",
  fillStyle: "",
  strokeStyle: "",
  getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) }),
};

const mockCanvas = {
  getContext: () => mockContext,
  style: {},
  width: 0,
  height: 0,
  remove: mock(),
};

// biome-ignore lint/suspicious/noExplicitAny: Mocking globals
(global as any).document = {
  createElement: (tag: string) => {
    if (tag === "canvas") return { ...mockCanvas };
    return {
      style: {},
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      appendChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      getAttribute: () => null,
      setAttribute: () => {},
      clientWidth: 400,
      clientHeight: 400,
    };
  },
  body: { appendChild: () => {} },
};

// biome-ignore lint/suspicious/noExplicitAny: Mocking globals
(global as any).window = {
  devicePixelRatio: 1,
  matchMedia: () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
  getComputedStyle: () => ({ position: "static" }),
  addEventListener: () => {},
  removeEventListener: () => {},
};
// biome-ignore lint/suspicious/noExplicitAny: Mocking globals
(global as any).getComputedStyle = () => ({ position: "static" });

// biome-ignore lint/suspicious/noExplicitAny: Mocking globals
(global as any).OffscreenCanvas = class {
  getContext() {
    return mockContext;
  }
};

// biome-ignore lint/suspicious/noExplicitAny: Mocking globals
(global as any).ResizeObserver = class {
  observe() {}
  disconnect() {}
};

// ── Test helpers ──

class PaintCountElement extends Element {
  paintCount = 0;

  constructor(id?: string) {
    super(id);
    // Disable interactivity so the hit buffer doesn't call paint() a second time
    this.interactive = false;
  }

  override paint(): void {
    this.paintCount++;
  }

  resetCount(): void {
    this.paintCount = 0;
  }
}

function createViewWithSize(
  w: number,
  h: number,
): { scene: Scene; view: View } {
  const container = document.createElement("div");
  // biome-ignore lint/suspicious/noExplicitAny: setting mock dimensions
  (container as any).clientWidth = w;
  // biome-ignore lint/suspicious/noExplicitAny: setting mock dimensions
  (container as any).clientHeight = h;

  const scene = new Scene(w, h);
  const view = new View(container, scene);
  return { scene, view };
}

// ── Tests ──

describe("rectIntersection", () => {
  it("returns intersection of overlapping rects", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 50, y: 50, width: 100, height: 100 };
    const result = rectIntersection(a, b);
    expect(result).toEqual({ x: 50, y: 50, width: 50, height: 50 });
  });

  it("returns null for non-overlapping rects", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 };
    const b = { x: 100, y: 100, width: 50, height: 50 };
    expect(rectIntersection(a, b)).toBeNull();
  });

  it("returns null for touching-but-not-overlapping rects", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 };
    const b = { x: 50, y: 0, width: 50, height: 50 };
    expect(rectIntersection(a, b)).toBeNull();
  });

  it("handles contained rect", () => {
    const outer = { x: 0, y: 0, width: 200, height: 200 };
    const inner = { x: 50, y: 50, width: 50, height: 50 };
    expect(rectIntersection(outer, inner)).toEqual(inner);
  });
});

describe("Frustum culling", () => {
  it("culls leaf elements outside the view frustum", () => {
    const { scene, view } = createViewWithSize(400, 400);

    const visible = new PaintCountElement("visible");
    visible.x = 50;
    visible.y = 50;
    visible.width = 100;
    visible.height = 100;

    const offscreen = new PaintCountElement("offscreen");
    offscreen.x = 1000;
    offscreen.y = 1000;
    offscreen.width = 100;
    offscreen.height = 100;

    scene.root.addChild(visible);
    scene.root.addChild(offscreen);

    // Force update to compute world matrices
    scene.root.update(16);

    view.render();

    expect(visible.paintCount).toBe(1);
    expect(offscreen.paintCount).toBe(0);
  });

  it("does not cull elements inside the view frustum", () => {
    const { scene, view } = createViewWithSize(400, 400);

    const el1 = new PaintCountElement("a");
    el1.x = 0;
    el1.y = 0;
    el1.width = 50;
    el1.height = 50;

    const el2 = new PaintCountElement("b");
    el2.x = 350;
    el2.y = 350;
    el2.width = 50;
    el2.height = 50;

    scene.root.addChild(el1);
    scene.root.addChild(el2);
    scene.root.update(16);

    view.render();

    expect(el1.paintCount).toBe(1);
    expect(el2.paintCount).toBe(1);
  });

  it("culls elements that become off-screen after pan", () => {
    const { scene, view } = createViewWithSize(400, 400);

    const el = new PaintCountElement("el");
    el.x = 50;
    el.y = 50;
    el.width = 100;
    el.height = 100;

    scene.root.addChild(el);
    scene.root.update(16);

    // Initially visible
    view.render();
    expect(el.paintCount).toBe(1);

    // Pan far away so the element is off-screen
    // View frustum: x = -panX/zoom, so panX = -1000 means frustum.x = 1000
    el.resetCount();
    view.panX = -1000;
    view.panY = -1000;
    view.render();
    expect(el.paintCount).toBe(0);
  });

  it("does not cull non-clipped containers (children may extend beyond)", () => {
    const { scene, view } = createViewWithSize(400, 400);

    const container = new Container("container");
    container.x = 0;
    container.y = 0;
    container.width = 10;
    container.height = 10;

    // Child extends way beyond container but is visible in the view
    const child = new PaintCountElement("child");
    child.x = 200;
    child.y = 200;
    child.width = 50;
    child.height = 50;

    container.addChild(child);
    scene.root.addChild(container);
    scene.root.update(16);

    view.render();

    // The child should still be painted despite container's small bounds
    expect(child.paintCount).toBe(1);
  });
});

describe("ScrollContainer culling", () => {
  it("culls children scrolled outside the visible scroll viewport", () => {
    const { scene, view } = createViewWithSize(400, 400);

    const sc = new ScrollContainer("scroller");
    sc.x = 0;
    sc.y = 0;
    sc.width = 200;
    sc.height = 200;

    // Create children: one visible, one far below
    const visibleRow = new PaintCountElement("row-visible");
    visibleRow.x = 0;
    visibleRow.y = 10;
    visibleRow.width = 200;
    visibleRow.height = 30;

    const offscreenRow = new PaintCountElement("row-offscreen");
    offscreenRow.x = 0;
    offscreenRow.y = 500;
    offscreenRow.width = 200;
    offscreenRow.height = 30;

    sc.addChild(visibleRow);
    sc.addChild(offscreenRow);
    scene.root.addChild(sc);

    // Force content bounds + matrix computation
    scene.root.update(16);

    view.render();

    expect(visibleRow.paintCount).toBe(1);
    expect(offscreenRow.paintCount).toBe(0);
  });

  it("reveals previously culled children after scrolling", () => {
    const { scene, view } = createViewWithSize(400, 400);

    const sc = new ScrollContainer("scroller");
    sc.x = 0;
    sc.y = 0;
    sc.width = 200;
    sc.height = 200;

    const rowHeight = 30;
    const rows: PaintCountElement[] = [];

    // Add 20 rows (total height 600, container 200)
    for (let i = 0; i < 20; i++) {
      const row = new PaintCountElement(`row-${i}`);
      row.x = 0;
      row.y = i * rowHeight;
      row.width = 200;
      row.height = rowHeight;
      sc.addChild(row);
      rows.push(row);
    }

    scene.root.addChild(sc);
    scene.root.update(16);

    // Initial render — first ~7 rows visible (0..200px)
    view.render();

    for (let i = 0; i < 7; i++) {
      expect(rows[i].paintCount).toBeGreaterThan(0);
    }
    // Row 15 at y=450 is well off-screen
    expect(rows[15].paintCount).toBe(0);

    // Reset counts
    for (const row of rows) row.resetCount();

    // Scroll down 300px — rows at y=300..500 should now be visible
    sc.scrollTo(0, 300);
    scene.root.update(16);
    view.render();

    // Row 0 at y=0 is now scrolled above (worldY = 0-300 = -300) — culled
    expect(rows[0].paintCount).toBe(0);

    // Row 10 at y=300 is now at top of viewport — visible
    expect(rows[10].paintCount).toBeGreaterThan(0);
  });

  it("culls the entire ScrollContainer when it is off-screen", () => {
    const { scene, view } = createViewWithSize(400, 400);

    const sc = new ScrollContainer("offscreen-scroller");
    sc.x = 1000;
    sc.y = 1000;
    sc.width = 200;
    sc.height = 200;

    const child = new PaintCountElement("child");
    child.x = 0;
    child.y = 0;
    child.width = 100;
    child.height = 100;

    sc.addChild(child);
    scene.root.addChild(sc);
    scene.root.update(16);

    view.render();

    // Both the container and its child should be culled
    expect(child.paintCount).toBe(0);
  });
});
