import { describe, expect, it, mock } from "bun:test";
import { Container } from "../src/core/Container";
import { DirtyFlags } from "../src/core/DirtyFlags";
import { Element } from "../src/core/Element";
import { Scene } from "../src/core/Scene";
import { resolveLayout } from "../src/layout/LayoutResolver";

// Mock DOM logic
const mockContext = {
  save: mock(),
  restore: mock(),
  setTransform: mock(),
  clearRect: mock(),
  fillText: mock(),
  beginPath: mock(),
  rect: mock(),
  fill: mock(),
  stroke: mock(),
  clip: mock(),
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
};
// biome-ignore lint/suspicious/noExplicitAny: Mocking globals
(global as any).getComputedStyle = () => ({ position: "static" });

// biome-ignore lint/suspicious/noExplicitAny: Mocking globals
(global as any).OffscreenCanvas = class {
  getContext() {
    return mockContext;
  }
};

class TestElement extends Element {
  paintCallCount = 0;
  updateCallCount = 0;

  // biome-ignore lint/suspicious/noExplicitAny: Mocking context
  override paint(ctx: any): void {
    this.paintCallCount++;
  }

  override update(dt: number): void {
    super.update(dt);
    this.updateCallCount++;
  }
}

describe("Display & Visibility", () => {
  it("visible: false removes element from layout, update, and hitTest", () => {
    const root = new Container();
    root.width = 100;
    root.height = 100;

    // Force layout dirty
    root.invalidate(DirtyFlags.Layout);

    const child = new TestElement();
    child.updateStyle({ width: 50, height: 50 });
    child.visible = false;

    root.addChild(child);

    // Layout
    root.update(0.1);

    // Check update skipped
    expect(child.updateCallCount).toBe(0);

    // Check hitTest
    const hit = child.hitTest(10, 10);
    expect(hit).toBeNull();
  });

  it("display: 'hidden' keeps layout and interactivity, but skips paint", () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock container
    const container = document.createElement("div") as any;
    const scene = new Scene(container, 800, 600);

    // Pass ID in constructor to satisfy strict ID checks if any
    const child = new TestElement("child");
    // valid width/height for hitTest (since layout engine isn't running to transfer style -> size)
    child.width = 100;
    child.height = 100;
    child.display = "hidden";
    child.interactive = true;

    scene.root.addChild(child);

    // Force layout
    scene.root.invalidate(DirtyFlags.Layout);
    // biome-ignore lint/suspicious/noExplicitAny: Accessing internal tick for test
    (scene.ticker as any)._tick(100);
    // biome-ignore lint/suspicious/noExplicitAny: Accessing internal tick for test
    (scene.ticker as any)._tick(200);

    // Check update called (it's visible, just hidden display)
    expect(child.updateCallCount).toBe(1);

    // Check hitTest
    const hit = child.hitTest(50, 50);
    expect(child.id).toBe("child"); // verify mock id
    expect(hit).toBe(child);

    // Check paint
    scene.render();
    expect(child.paintCallCount).toBe(0);

    // Verify visible element WOULD paint
    child.display = "visible";
    scene.render();
    expect(child.paintCallCount).toBe(1);
  });

  it("visible: false triggers parent layout invalidation", () => {
    const root = new Container();
    const child = new Element();
    root.addChild(child);

    root.update(0);
    // Manually reset flags for test
    // @ts-ignore
    root._dirtyFlags = DirtyFlags.None;

    // Toggle visible
    child.visible = false;
    expect(root.dirtyFlags & DirtyFlags.Layout).toBe(DirtyFlags.Layout);
  });

  it("Flex layout ignores invisible children", () => {
    const root = new Container();
    root.updateStyle({
      display: "flex",
      flexDirection: "row",
      width: 300,
      height: 100,
    });
    // Set explicit root size for layout resolver
    root.width = 300;
    root.height = 100;

    const child1 = new Element();
    child1.updateStyle({
      display: "flex",
      width: 100,
      height: 50,
      flexGrow: 1,
    });

    const child2 = new Element();
    child2.updateStyle({
      display: "flex",
      width: 100,
      height: 50,
      flexGrow: 1,
    });
    child2.visible = false; // Should be ignored

    const child3 = new Element();
    child3.updateStyle({
      display: "flex",
      width: 100,
      height: 50,
      flexGrow: 1,
    });

    root.addChild(child1);
    root.addChild(child2);
    root.addChild(child3);

    // Use manual resolveLayout because Container.update() does not call it automatically
    resolveLayout(root);

    // Available space 300.
    // Child 2 ignored.
    // Child 1 and 3 share space.
    // Each desired 100. Total 200. Free 100.
    // Grow 1 each -> +50 each.
    // Final width 150 each.

    expect(child1.width).toBe(150);
    expect(child3.width).toBe(150);

    // Child 2 should not have been arranged
    expect(child2.width).toBe(0);
  });
});
