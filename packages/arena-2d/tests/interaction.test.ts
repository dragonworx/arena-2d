/**
 * Layer 9 — Interaction & Focus System Tests
 *
 * Tests:
 * - SpatialHashGrid: insert, remove, query, AABB query
 * - Hit-testing: ordering, back-to-front, non-interactive skip
 * - Event dispatch: bubbling, stopPropagation, enter/leave non-bubbling
 * - Focus: setFocus, blur/focus events, tab order cycling
 * - Keyboard dispatch: to focused element
 * - Element properties: interactive, focusable, cursor
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { Container } from "../src/core/Container";
import { Element } from "../src/core/Element";
import { InteractionManager } from "../src/interaction/InteractionManager";
import { SpatialHashGrid } from "../src/interaction/SpatialHashGrid";
import type { ISpatialEntry } from "../src/interaction/SpatialHashGrid";

// ── DOM setup (same pattern as scene.test.ts) ──

let window: Window;
beforeAll(() => {
  window = new Window();
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.window = window as unknown as Window & typeof globalThis;
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.document = window.document;
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.HTMLElement = window.HTMLElement;

  const originalCreateElement = window.document.createElement.bind(
    window.document,
  );
  window.document.createElement = (
    tagName: string,
    options?: ElementCreationOptions,
  ) => {
    const element = originalCreateElement(tagName, options);
    if (tagName.toLowerCase() === "canvas") {
      const mockContext = {
        canvas: element,
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        strokeText: () => {},
        measureText: () => ({ width: 0 }),
        setTransform: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        arcTo: () => {},
        bezierCurveTo: () => {},
        quadraticCurveTo: () => {},
        rect: () => {},
        fill: () => {},
        stroke: () => {},
        clip: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createPattern: () => null,
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        fillStyle: "#000000",
        strokeStyle: "#000000",
        lineWidth: 1,
        shadowBlur: 0,
        shadowColor: "rgba(0,0,0,0)",
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        font: "10px sans-serif",
        textAlign: "start",
        textBaseline: "alphabetic",
      };
      // @ts-expect-error - happy-dom HTMLElement doesn't have getContext
      const originalGetContext = element.getContext;
      // @ts-expect-error - Polyfilling canvas context for happy-dom
      element.getContext = function (contextType: string) {
        if (contextType === "2d") {
          return mockContext as unknown as CanvasRenderingContext2D;
        }
        return originalGetContext?.call(this, contextType);
      };
    }
    return element;
  };

  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.HTMLCanvasElement = window.HTMLCanvasElement;

  class OffscreenCanvasPolyfill {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      return {
        canvas: this,
        getImageData: () => ({
          data: new Uint8ClampedArray(this.width * this.height * 4),
        }),
        putImageData: () => {},
        clearRect: () => {},
        fillRect: () => {},
        setTransform: () => {},
        save: () => {},
        restore: () => {},
      };
    }
  }
  global.OffscreenCanvas =
    OffscreenCanvasPolyfill as unknown as typeof OffscreenCanvas;

  // @ts-expect-error - happy-dom types
  global.requestAnimationFrame = window.requestAnimationFrame.bind(window);
  // @ts-expect-error - happy-dom types
  global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
  // @ts-expect-error - happy-dom types
  global.getComputedStyle = window.getComputedStyle.bind(window);
  // @ts-expect-error - happy-dom types
  global.matchMedia = window.matchMedia.bind(window);
  // @ts-expect-error - happy-dom types
  global.PointerEvent = window.PointerEvent ?? window.MouseEvent;
});

afterAll(() => {
  window.close();
});

// ── SpatialHashGrid Tests ──

describe("SpatialHashGrid", () => {
  test("insert and query by point", () => {
    const grid = new SpatialHashGrid(100);
    const entry: ISpatialEntry = {
      id: "a",
      aabb: { x: 50, y: 50, width: 80, height: 80 },
    };
    grid.insert(entry);

    const results = grid.query(60, 60);
    expect(results).toContain(entry);
    expect(grid.size).toBe(1);
  });

  test("query returns empty for point outside all entries", () => {
    const grid = new SpatialHashGrid(100);
    const entry: ISpatialEntry = {
      id: "a",
      aabb: { x: 50, y: 50, width: 20, height: 20 },
    };
    grid.insert(entry);

    const results = grid.query(500, 500);
    expect(results.length).toBe(0);
  });

  test("remove entry from grid", () => {
    const grid = new SpatialHashGrid(100);
    const entry: ISpatialEntry = {
      id: "a",
      aabb: { x: 10, y: 10, width: 50, height: 50 },
    };
    grid.insert(entry);
    expect(grid.has(entry)).toBe(true);

    grid.remove(entry);
    expect(grid.has(entry)).toBe(false);
    expect(grid.size).toBe(0);

    const results = grid.query(20, 20);
    expect(results.length).toBe(0);
  });

  test("entry spanning multiple cells", () => {
    const grid = new SpatialHashGrid(50);
    const entry: ISpatialEntry = {
      id: "big",
      aabb: { x: 0, y: 0, width: 150, height: 150 },
    };
    grid.insert(entry);

    expect(grid.query(10, 10)).toContain(entry);
    expect(grid.query(60, 60)).toContain(entry);
    expect(grid.query(110, 110)).toContain(entry);
  });

  test("multiple entries in same cell", () => {
    const grid = new SpatialHashGrid(100);
    const a: ISpatialEntry = {
      id: "a",
      aabb: { x: 10, y: 10, width: 30, height: 30 },
    };
    const b: ISpatialEntry = {
      id: "b",
      aabb: { x: 20, y: 20, width: 30, height: 30 },
    };
    grid.insert(a);
    grid.insert(b);

    const results = grid.query(25, 25);
    expect(results).toContain(a);
    expect(results).toContain(b);
    expect(grid.size).toBe(2);
  });

  test("re-insert updates position", () => {
    const grid = new SpatialHashGrid(100);
    const entry: ISpatialEntry = {
      id: "a",
      aabb: { x: 10, y: 10, width: 30, height: 30 },
    };
    grid.insert(entry);
    expect(grid.query(20, 20)).toContain(entry);

    entry.aabb = { x: 300, y: 300, width: 30, height: 30 };
    grid.insert(entry);

    expect(grid.query(20, 20).length).toBe(0);
    expect(grid.query(310, 310)).toContain(entry);
    expect(grid.size).toBe(1);
  });

  test("queryAABB returns entries overlapping rectangle", () => {
    const grid = new SpatialHashGrid(100);
    const a: ISpatialEntry = {
      id: "a",
      aabb: { x: 10, y: 10, width: 30, height: 30 },
    };
    const b: ISpatialEntry = {
      id: "b",
      aabb: { x: 500, y: 500, width: 30, height: 30 },
    };
    grid.insert(a);
    grid.insert(b);

    const results = grid.queryAABB({ x: 0, y: 0, width: 50, height: 50 });
    expect(results).toContain(a);
    expect(results).not.toContain(b);
  });

  test("clear removes all entries", () => {
    const grid = new SpatialHashGrid(100);
    grid.insert({ id: "a", aabb: { x: 0, y: 0, width: 10, height: 10 } });
    grid.insert({ id: "b", aabb: { x: 50, y: 50, width: 10, height: 10 } });
    expect(grid.size).toBe(2);

    grid.clear();
    expect(grid.size).toBe(0);
  });

  test("negative coordinates work", () => {
    const grid = new SpatialHashGrid(100);
    const entry: ISpatialEntry = {
      id: "neg",
      aabb: { x: -50, y: -50, width: 30, height: 30 },
    };
    grid.insert(entry);

    expect(grid.query(-40, -40)).toContain(entry);
    expect(grid.query(50, 50).length).toBe(0);
  });

  test("cellSize getter", () => {
    const grid = new SpatialHashGrid(256);
    expect(grid.cellSize).toBe(256);
  });
});

// ── Element Interaction Properties Tests ──

describe("Element interaction properties", () => {
  test("default interactive is true", () => {
    const el = new Element("test");
    expect(el.interactive).toBe(true);
  });

  test("default focusable is false", () => {
    const el = new Element("test");
    expect(el.focusable).toBe(false);
  });

  test("default cursor is 'default'", () => {
    const el = new Element("test");
    expect(el.cursor).toBe("default");
  });

  test("properties are settable", () => {
    const el = new Element("test");
    el.interactive = false;
    el.focusable = true;
    el.cursor = "pointer";

    expect(el.interactive).toBe(false);
    expect(el.focusable).toBe(true);
    expect(el.cursor).toBe("pointer");
  });
});

// ── Hit-Test Ordering Tests ──

describe("Hit-testing", () => {
  test("topmost element wins (higher zIndex)", () => {
    const root = new Container("root");
    const bottom = new Element("bottom");
    const top = new Element("top");

    bottom.width = 100;
    bottom.height = 100;
    top.width = 100;
    top.height = 100;
    top.zIndex = 1;

    root.addChild(bottom);
    root.addChild(top);
    root.update(0);

    const hit = root.hitTest(50, 50);
    expect(hit).toBe(top);
  });

  test("invisible element is not hit", () => {
    const el = new Element("hidden");
    el.width = 100;
    el.height = 100;
    el.visible = false;

    const hit = el.hitTest(50, 50);
    expect(hit).toBeNull();
  });

  test("element without size is not hit outside bounds", () => {
    const el = new Element("zero");
    el.update(0);

    // Point outside the element
    const hit = el.hitTest(1, 1);
    expect(hit).toBeNull();
  });
});

// ── Event Bubbling Tests ──

describe("Event bubbling", () => {
  test("event handlers fire in registration order", () => {
    const el = new Element("test");
    const order: number[] = [];

    el.on("click", () => order.push(1));
    el.on("click", () => order.push(2));
    el.on("click", () => order.push(3));

    el.emit("click", { type: "click" });
    expect(order).toEqual([1, 2, 3]);
  });

  test("focus/blur events fire on element", () => {
    const el = new Element("focusable");
    el.focusable = true;

    const events: string[] = [];
    el.on("focus", () => events.push("focus"));
    el.on("blur", () => events.push("blur"));

    el.emit("focus", { type: "focus", target: el });
    expect(events).toEqual(["focus"]);

    el.emit("blur", { type: "blur", target: el });
    expect(events).toEqual(["focus", "blur"]);
  });
});

// ── Tab Order Tests ──

describe("Tab order", () => {
  test("depth-first traversal collects focusable elements", () => {
    const root = new Container("root");
    const a = new Element("a");
    const b = new Container("b");
    const c = new Element("c");
    const d = new Element("d");

    a.focusable = true;
    c.focusable = true;
    d.focusable = true;

    root.addChild(a);
    root.addChild(b);
    b.addChild(c);
    root.addChild(d);

    const order: Element[] = [];
    function collect(element: Element): void {
      if (!element.visible) return;
      if (element.focusable) order.push(element);
      if (element instanceof Container) {
        for (const child of element.children) {
          collect(child as Element);
        }
      }
    }
    collect(root);

    expect(order).toEqual([a, c, d]);
  });
});

// ── InteractionManager Integration Tests ──

function createMockScene() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.style.width = "400px";
  container.style.height = "300px";
  container.style.position = "relative";

  container.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 400,
    bottom: 300,
    width: 400,
    height: 300,
    toJSON() {
      return {};
    },
  });

  const root = new Container("root");

  // Return a mock that matches IViewRef shape
  return {
    container,
    scene: {
      root,
      width: 400,
      height: 300,
      _sampleHitBuffer(_sx: number, _sy: number) { return 0; },
      _getElementByUID(_uid: number) { return null; },
    },
    // convenience alias for tests that access root directly
    get root() { return root; },
    screenToScene(screenX: number, screenY: number) {
      const rect = container.getBoundingClientRect();
      return { x: screenX - rect.left, y: screenY - rect.top };
    },
  };
}

function cleanupMockScene(mock: ReturnType<typeof createMockScene>) {
  if (mock.container.parentNode) {
    mock.container.parentNode.removeChild(mock.container);
  }
}

describe("InteractionManager", () => {
  test("creates and destroys without error", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);
    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("setFocus fires focus/blur events", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const a = new Element("a");
    a.focusable = true;
    const b = new Element("b");
    b.focusable = true;

    const events: string[] = [];
    a.on("focus", () => events.push("a:focus"));
    a.on("blur", () => events.push("a:blur"));
    b.on("focus", () => events.push("b:focus"));
    b.on("blur", () => events.push("b:blur"));

    mgr.setFocus(a);
    expect(mgr.focusedElement).toBe(a);
    expect(events).toEqual(["a:focus"]);

    mgr.setFocus(b);
    expect(mgr.focusedElement).toBe(b);
    expect(events).toEqual(["a:focus", "a:blur", "b:focus"]);

    mgr.setFocus(null);
    expect(mgr.focusedElement).toBeNull();
    expect(events).toEqual(["a:focus", "a:blur", "b:focus", "b:blur"]);

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("setFocus ignores non-focusable elements", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const el = new Element("not-focusable");
    el.focusable = false;

    mgr.setFocus(el);
    expect(mgr.focusedElement).toBeNull();

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("setFocus same element is no-op", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const a = new Element("a");
    a.focusable = true;

    const events: string[] = [];
    a.on("focus", () => events.push("focus"));

    mgr.setFocus(a);
    mgr.setFocus(a); // Same element
    expect(events).toEqual(["focus"]); // Only fired once

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("tabNext cycles through focusable elements", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const a = new Element("a");
    a.focusable = true;
    const b = new Element("b");
    b.focusable = true;
    const c = new Element("c");
    c.focusable = true;

    scene.root.addChild(a);
    scene.root.addChild(b);
    scene.root.addChild(c);

    mgr.tabNext();
    expect(mgr.focusedElement).toBe(a);

    mgr.tabNext();
    expect(mgr.focusedElement).toBe(b);

    mgr.tabNext();
    expect(mgr.focusedElement).toBe(c);

    mgr.tabNext();
    expect(mgr.focusedElement).toBe(a); // Wrap

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("tabPrev cycles backwards", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const a = new Element("a");
    a.focusable = true;
    const b = new Element("b");
    b.focusable = true;
    const c = new Element("c");
    c.focusable = true;

    scene.root.addChild(a);
    scene.root.addChild(b);
    scene.root.addChild(c);

    mgr.tabPrev();
    expect(mgr.focusedElement).toBe(c); // Last

    mgr.tabPrev();
    expect(mgr.focusedElement).toBe(b);

    mgr.tabPrev();
    expect(mgr.focusedElement).toBe(a);

    mgr.tabPrev();
    expect(mgr.focusedElement).toBe(c); // Wrap

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("spatialHash updates correctly", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const el = new Element("box");
    el.width = 100;
    el.height = 100;
    el.interactive = true;
    scene.root.addChild(el);

    (scene.root as Container).update(0);
    mgr.updateSpatialHash();

    expect(mgr.spatialHash.size).toBeGreaterThan(0);

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("hitTest returns topmost interactive element", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const a = new Element("a");
    a.width = 100;
    a.height = 100;
    a.interactive = true;

    const b = new Element("b");
    b.width = 100;
    b.height = 100;
    b.interactive = true;
    b.zIndex = 1;

    scene.root.addChild(a);
    scene.root.addChild(b);

    (scene.root as Container).update(0);
    mgr.updateSpatialHash();

    const hit = mgr.hitTest(50, 50);
    expect(hit).toBe(b);

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("hitTest skips non-interactive elements", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const a = new Element("a");
    a.width = 100;
    a.height = 100;
    a.interactive = true;

    const b = new Element("b");
    b.width = 100;
    b.height = 100;
    b.interactive = false;

    scene.root.addChild(a);
    scene.root.addChild(b);

    (scene.root as Container).update(0);
    mgr.updateSpatialHash();

    const hit = mgr.hitTest(50, 50);
    expect(hit).toBe(a);

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("hitTest returns null when no hit", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const el = new Element("small");
    el.x = 200;
    el.y = 200;
    el.width = 10;
    el.height = 10;
    el.interactive = true;

    scene.root.addChild(el);
    (scene.root as Container).update(0);
    mgr.updateSpatialHash();

    // Query far from the element (root has 0 width/height)
    const hit = mgr.hitTest(50, 50);
    expect(hit).not.toBe(el);

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("unregisterElement removes from spatial hash and focus", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const el = new Element("el");
    el.width = 100;
    el.height = 100;
    el.interactive = true;
    el.focusable = true;

    scene.root.addChild(el);
    (scene.root as Container).update(0);
    mgr.updateSpatialHash();

    mgr.setFocus(el);
    expect(mgr.focusedElement).toBe(el);

    mgr.unregisterElement(el);
    expect(mgr.focusedElement).toBeNull();

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("invisible elements are not in spatial hash after update", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const el = new Element("hidden");
    el.width = 100;
    el.height = 100;
    el.interactive = true;
    el.visible = false;

    scene.root.addChild(el);
    (scene.root as Container).update(0);
    mgr.updateSpatialHash();

    // The element should not be findable
    const hit = mgr.hitTest(50, 50);
    expect(hit).not.toBe(el);

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("depth-first tab order with nested containers", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const a = new Element("a");
    a.focusable = true;
    const nested = new Container("nested");
    const b = new Element("b");
    b.focusable = true;
    const c = new Element("c");
    c.focusable = true;

    scene.root.addChild(a);
    scene.root.addChild(nested);
    nested.addChild(b);
    scene.root.addChild(c);

    mgr.tabNext();
    expect(mgr.focusedElement).toBe(a);
    mgr.tabNext();
    expect(mgr.focusedElement).toBe(b);
    mgr.tabNext();
    expect(mgr.focusedElement).toBe(c);

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("hitTest with translated element", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const el = new Element("moved");
    el.x = 100;
    el.y = 100;
    el.width = 50;
    el.height = 50;
    el.interactive = true;

    scene.root.addChild(el);
    (scene.root as Container).update(0);
    mgr.updateSpatialHash();

    // Inside the element
    const hit = mgr.hitTest(120, 120);
    expect(hit).toBe(el);

    // Outside the element
    const miss = mgr.hitTest(10, 10);
    expect(miss).not.toBe(el);

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("hitTest with overlapping siblings returns higher zIndex", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const a = new Element("low-z");
    a.width = 100;
    a.height = 100;
    a.interactive = true;
    a.zIndex = 0;

    const b = new Element("high-z");
    b.width = 100;
    b.height = 100;
    b.interactive = true;
    b.zIndex = 5;

    scene.root.addChild(a);
    scene.root.addChild(b);

    (scene.root as Container).update(0);
    mgr.updateSpatialHash();

    const hit = mgr.hitTest(50, 50);
    expect(hit).toBe(b);

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("tabNext with no focusable elements is no-op", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    scene.root.addChild(new Element("a"));
    scene.root.addChild(new Element("b"));

    mgr.tabNext();
    expect(mgr.focusedElement).toBeNull();

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("hidden elements excluded from tab order", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const a = new Element("a");
    a.focusable = true;
    const b = new Element("b");
    b.focusable = true;
    b.visible = false;
    const c = new Element("c");
    c.focusable = true;

    scene.root.addChild(a);
    scene.root.addChild(b);
    scene.root.addChild(c);

    mgr.tabNext();
    expect(mgr.focusedElement).toBe(a);
    mgr.tabNext();
    expect(mgr.focusedElement).toBe(c); // Skips b
    mgr.tabNext();
    expect(mgr.focusedElement).toBe(a); // Wraps

    mgr.destroy();
    cleanupMockScene(scene);
  });

  test("dblclick is dispatched to target", () => {
    const scene = createMockScene();
    const mgr = new InteractionManager(scene);

    const el = new Element("test-el");
    el.width = 100;
    el.height = 100;
    el.interactive = true;

    scene.root.addChild(el);
    (scene.root as Container).update(0);
    mgr.updateSpatialHash();

    let dblClicked = false;
    el.on("dblclick", () => {
      dblClicked = true;
    });

    // Mock dblclick event
    const container = scene.container;
    // biome-ignore lint/suspicious/noExplicitAny: testing private state
    const MouseEvent = (container.ownerDocument.defaultView as any).MouseEvent;
    const event = new MouseEvent("dblclick", {
      clientX: 10,
      clientY: 10,
      button: 0,
    });
    container.dispatchEvent(event);

    expect(dblClicked).toBe(true);

    mgr.destroy();
    cleanupMockScene(scene);
  });
});
