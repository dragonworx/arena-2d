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
import type { IContainer } from "../src/core/Container";
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
          return mockContext as unknown as CanvasRenderingContext2D; // Cast to expected type
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

  // Polyfill PointerEvent
  class PointerEvent extends Event {
    clientX: number;
    clientY: number;
    button: number;

    constructor(
      type: string,
      params: { clientX?: number; clientY?: number; button?: number } = {},
    ) {
      // biome-ignore lint/suspicious/noExplicitAny: polyfill
      super(type, params as any);
      this.clientX = params.clientX || 0;
      this.clientY = params.clientY || 0;
      this.button = params.button || 0;
    }
  }
  // biome-ignore lint/suspicious/noExplicitAny: polyfill
  global.PointerEvent = PointerEvent as any;

  // Mock RequestAnimationFrame
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  // @ts-expect-error - happy-dom types
  global.getComputedStyle = window.getComputedStyle.bind(window);
});

afterAll(() => {
  window.close();
});

describe("Drag Rotation Issue", () => {
  let scene: Scene;
  let view: View;
  let root: IContainer;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.getElementById("app");
    if (!app) throw new Error("App element not found");

    scene = new Scene(800, 600);
    view = new View(app, scene);
    root = scene.root;
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

  test("rotated drag element detects drop zone correctly", () => {
    const dropZone = new Element();
    dropZone.width = 100;
    dropZone.height = 100;
    dropZone.x = 200;
    dropZone.y = 200;
    dropZone.interactive = true;
    root.addChild(dropZone);

    const draggable = new Element();
    draggable.width = 100;
    draggable.height = 20;
    draggable.x = 0;
    draggable.y = 0;
    draggable.rotation = Math.PI / 4;
    draggable.draggable = true;
    draggable.interactive = true;
    root.addChild(draggable);

    scene.root.update(0.016);
    // Explicitly update matrices for initial state
    draggable.updateLocalMatrix();

    // cast to any to get access to updateSpatialHash if needed or just let render loop handle it
    view.interaction.updateSpatialHash();

    const onEnter = mock((_e: IDragEvent) => {});
    dropZone.on("dragenter", onEnter);

    // Pick it up
    dispatchPointer("pointerdown", 10, 10);

    // Move it to overlap
    dispatchPointer("pointermove", 180, 180);

    // Check if entered
    expect(onEnter).toHaveBeenCalled();
  });
});
