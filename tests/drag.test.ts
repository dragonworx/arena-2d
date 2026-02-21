import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { Window } from "happy-dom";
import type { Container } from "../src/core/Container";
import { Element } from "../src/core/Element";
import { Scene } from "../src/core/Scene";
import { View } from "../src/core/View";
import type { IDragEvent } from "../src/interaction/DragManager";

// ── DOM setup ──

let window: Window;
beforeAll(() => {
  window = new Window();
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.window = window as unknown as Window & typeof globalThis;
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.document = window.document;
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.HTMLElement = window.HTMLElement;
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.HTMLCanvasElement = window.HTMLCanvasElement;

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

  // Mock RequestAnimationFrame
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  // @ts-expect-error - happy-dom types
  global.getComputedStyle = window.getComputedStyle.bind(window);
});

afterAll(() => {
  window.close();
});

describe("Drag & Drop System", () => {
  let scene: Scene;
  let view: View;
  let root: Container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.getElementById("app");
    if (!app) throw new Error("App element not found");

    scene = new Scene(800, 600);
    view = new View(app, scene);
    root = scene.root as Container;
  });

  function dispatchPointer(type: string, x: number, y: number, button = 0) {
    const event = new PointerEvent(type, {
      clientX: x,
      clientY: y,
      button,
      bubbles: true,
    });
    view.container.dispatchEvent(event);
  }

  test("draggable property defaults to false", () => {
    const el = new Element();
    expect(el.draggable).toBe(false);
  });

  test("dragstart event fires after threshold", () => {
    const draggable = new Element();
    draggable.width = 100;
    draggable.height = 100;
    draggable.draggable = true;
    draggable.interactive = true;
    root.addChild(draggable);

    // Update before interaction to ensure hit testing works
    scene.root.update(0.016);
    view.interaction.updateSpatialHash();

    const onDragStart = mock((_e: IDragEvent) => {});
    draggable.on("dragstart", onDragStart);

    // Initial click
    dispatchPointer("pointerdown", 50, 50);
    expect(onDragStart).not.toHaveBeenCalled();

    // Small move (below threshold)
    dispatchPointer("pointermove", 52, 52);
    expect(onDragStart).not.toHaveBeenCalled();

    // Large move (above threshold > 5px)
    dispatchPointer("pointermove", 60, 60);
    expect(onDragStart).toHaveBeenCalled();
  });

  test("dragmove event fires and element moves", () => {
    const draggable = new Element();
    draggable.x = 10;
    draggable.y = 10;
    draggable.width = 100;
    draggable.height = 100;
    draggable.draggable = true;
    draggable.interactive = true;

    root.addChild(draggable);

    // We need to ensure world matrices are updated for hit testing
    scene.root.update(0.016);
    view.interaction.updateSpatialHash();

    const onDragMove = mock((_e: IDragEvent) => {});
    draggable.on("dragmove", onDragMove);

    // Start drag
    dispatchPointer("pointerdown", 50, 50);
    dispatchPointer("pointermove", 60, 60); // Trigger start + move

    expect(onDragMove).toHaveBeenCalled();
    expect(draggable.x).toBe(20);
    expect(draggable.y).toBe(20);
  });

  test("dragstart is not fired for non-draggable elements", () => {
    const el = new Element();
    el.width = 100;
    el.height = 100;
    el.draggable = false;
    el.interactive = true;
    root.addChild(el);

    scene.root.update(0.016);
    view.interaction.updateSpatialHash();

    const onDragStart = mock(() => {});
    el.on("dragstart", onDragStart);

    dispatchPointer("pointerdown", 50, 50);
    dispatchPointer("pointermove", 60, 60);

    expect(onDragStart).not.toHaveBeenCalled();
  });

  test("drag constraints (x-axis)", () => {
    const draggable = new Element();
    draggable.width = 100;
    draggable.height = 100;
    draggable.draggable = true;
    draggable.dragConstraint = "x";
    draggable.interactive = true; // Ensure interactive
    root.addChild(draggable);

    scene.root.update(0.016);
    view.interaction.updateSpatialHash();

    dispatchPointer("pointerdown", 50, 50);
    dispatchPointer("pointermove", 60, 70); // dx=10, dy=20

    // Should only move in X
    expect(draggable.x).toBe(10);
    expect(draggable.y).toBe(0);
  });

  test("drop event fires on drop target", () => {
    const draggable = new Element();
    draggable.width = 50;
    draggable.height = 50;
    draggable.x = 0;
    draggable.y = 0;
    draggable.draggable = true;
    draggable.interactive = true; // Ensure interactive

    const dropZone = new Element();
    dropZone.width = 100;
    dropZone.height = 100;
    dropZone.x = 200;
    dropZone.y = 200;
    dropZone.interactive = true;

    root.addChild(draggable);
    root.addChild(dropZone);

    scene.root.update(0.016);
    view.interaction.updateSpatialHash();

    const onDrop = mock((_e: IDragEvent) => {});
    dropZone.on("drop", onDrop);

    // Pick up draggable
    dispatchPointer("pointerdown", 25, 25);

    // Move to drop zone
    dispatchPointer("pointermove", 250, 250);

    // Release
    dispatchPointer("pointerup", 250, 250);

    expect(onDrop).toHaveBeenCalled();
    const event = onDrop.mock.calls[0][0];
    expect(event.currentItem).toBe(draggable);
    expect(event.target).toBe(dropZone);
  });

  test("dragenter/dragleave events", () => {
    const draggable = new Element();
    draggable.width = 50;
    draggable.height = 50;
    draggable.draggable = true;
    draggable.interactive = true; // Ensure interactive

    const dropZone = new Element();
    dropZone.width = 100;
    dropZone.height = 100;
    dropZone.x = 200;
    dropZone.y = 0;
    dropZone.interactive = true;

    root.addChild(draggable);
    root.addChild(dropZone);

    scene.root.update(0.016);
    view.interaction.updateSpatialHash();

    const onEnter = mock((_e: IDragEvent) => {});
    const onLeave = mock((_e: IDragEvent) => {});
    dropZone.on("dragenter", onEnter);
    dropZone.on("dragleave", onLeave);

    // Start drag
    dispatchPointer("pointerdown", 25, 25);

    // Enter dropzone
    dispatchPointer("pointermove", 250, 50);
    expect(onEnter).toHaveBeenCalled();
    expect(onLeave).not.toHaveBeenCalled();

    // Leave dropzone
    dispatchPointer("pointermove", 50, 50);
    expect(onLeave).toHaveBeenCalled();
  });
});
