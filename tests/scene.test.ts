import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { Window } from "happy-dom";
import { Container } from "../src/core/Container";
import { Element } from "../src/core/Element";
import type { Layer } from "../src/core/Layer";
import { Scene } from "../src/core/Scene";

// Set up DOM environment for all tests
let window: Window;
beforeAll(() => {
  window = new Window();
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.window = window as unknown as Window & typeof globalThis;
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.document = window.document;
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.HTMLElement = window.HTMLElement;

  // Polyfill HTMLCanvasElement.getContext for happy-dom
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
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
        createPattern: () => null,
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        fillStyle: "#000000",
        strokeStyle: "#000000",
        lineWidth: 1,
        lineCap: "butt",
        lineJoin: "miter",
        miterLimit: 10,
        lineDashOffset: 0,
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

  // Polyfill OffscreenCanvas (happy-dom doesn't support it yet)
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

  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.requestAnimationFrame = window.requestAnimationFrame.bind(window);
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.getComputedStyle = window.getComputedStyle.bind(window);
  // @ts-expect-error - happy-dom types don't perfectly match browser types
  global.matchMedia = window.matchMedia.bind(window);
});

afterAll(() => {
  window.close();
});

// ── Helper: create a test container div ──

function createTestContainer(): HTMLElement {
  const div = document.createElement("div");
  div.style.position = "relative";
  div.style.width = "800px";
  div.style.height = "600px";
  document.body.appendChild(div);
  return div;
}

// ── Scene Construction ──

describe("Scene — construction", () => {
  test("creates a scene with container, root, and default layer", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    expect(scene.container).toBe(container);
    expect(scene.width).toBe(800);
    expect(scene.height).toBe(600);
    expect(scene.root).toBeDefined();
    expect(scene.ticker).toBeDefined();

    // Should have a default layer
    const defaultLayer = scene.getLayer("default");
    expect(defaultLayer).not.toBeNull();
    expect(defaultLayer?.id).toBe("default");

    scene.destroy();
    container.remove();
  });

  test("sets container position to relative if static", () => {
    const container = document.createElement("div");
    container.style.position = "static";
    document.body.appendChild(container);

    const scene = new Scene(container, 800, 600);
    expect(container.style.position).toBe("relative");

    scene.destroy();
    container.remove();
  });

  test("creates hit buffer with correct resolution", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    expect(scene.hitBuffer).toBeDefined();
    const dpr = window.devicePixelRatio || 1;
    expect(scene.hitBuffer.width).toBe(800 * dpr);
    expect(scene.hitBuffer.height).toBe(600 * dpr);

    scene.destroy();
    container.remove();
  });

  test("root is assigned to default layer", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    const defaultLayer = scene.getLayer("default");
    expect(scene.root.layer).toBe(defaultLayer);
    expect(scene.root.scene).toBe(scene);

    scene.destroy();
    container.remove();
  });
});

// ── Layer Management ──

describe("Scene — layer management", () => {
  let container: HTMLElement;
  let scene: Scene;

  beforeEach(() => {
    container = createTestContainer();
    scene = new Scene(container, 800, 600);
  });

  test("createLayer adds a new layer with correct z-index", () => {
    const layer = scene.createLayer("background", -1);

    expect(layer).toBeDefined();
    expect(layer.id).toBe("background");
    expect(layer.zIndex).toBe(-1);
    expect(layer.canvas).toBeDefined();
    expect(layer.canvas.parentElement).toBe(container);

    scene.destroy();
    container.remove();
  });

  test("createLayer throws if layer with same id exists", () => {
    scene.createLayer("test", 1);

    expect(() => {
      scene.createLayer("test", 2);
    }).toThrow('Layer with id "test" already exists');

    scene.destroy();
    container.remove();
  });

  test("getLayer returns layer by id or null", () => {
    const layer = scene.createLayer("test", 1);

    expect(scene.getLayer("test")).toBe(layer);
    expect(scene.getLayer("nonexistent")).toBeNull();

    scene.destroy();
    container.remove();
  });

  test("removeLayer removes layer and reassigns elements", () => {
    const layer = scene.createLayer("test", 1);

    // Create element and assign to this layer
    const element = new Element();
    element.layer = layer;
    (layer as Layer).addElement(element);

    scene.removeLayer("test");

    expect(scene.getLayer("test")).toBeNull();
    expect(layer.canvas.parentElement).toBeNull();

    scene.destroy();
    container.remove();
  });

  test("removeLayer throws if trying to remove default layer", () => {
    expect(() => {
      scene.removeLayer("default");
    }).toThrow("Cannot remove default layer");

    scene.destroy();
    container.remove();
  });

  test("layers are ordered by z-index", () => {
    const layer1 = scene.createLayer("layer1", 10);
    const layer2 = scene.createLayer("layer2", 5);
    const layer3 = scene.createLayer("layer3", 15);

    expect(layer1.canvas.style.zIndex).toBe("10");
    expect(layer2.canvas.style.zIndex).toBe("5");
    expect(layer3.canvas.style.zIndex).toBe("15");

    scene.destroy();
    container.remove();
  });
});

// ── Layer Properties ──

describe("Layer — properties", () => {
  let container: HTMLElement;
  let scene: Scene;
  let layer: Layer;

  beforeEach(() => {
    container = createTestContainer();
    scene = new Scene(container, 800, 600);
    layer = scene.createLayer("test", 1) as Layer;
  });

  test("zIndex setter updates CSS z-index", () => {
    layer.zIndex = 20;
    expect(layer.zIndex).toBe(20);
    expect(layer.canvas.style.zIndex).toBe("20");

    scene.destroy();
    container.remove();
  });

  test("opacity setter updates CSS opacity", () => {
    layer.opacity = 0.5;
    expect(layer.opacity).toBe(0.5);
    expect(layer.canvas.style.opacity).toBe("0.5");

    scene.destroy();
    container.remove();
  });

  test("opacity clamps to [0, 1]", () => {
    layer.opacity = 1.5;
    expect(layer.opacity).toBe(1);

    layer.opacity = -0.5;
    expect(layer.opacity).toBe(0);

    scene.destroy();
    container.remove();
  });
});

// ── Coordinate Transforms ──

describe("Scene — coordinate transforms", () => {
  test("screenToScene converts screen coordinates to scene coordinates", () => {
    const container = createTestContainer();
    container.style.position = "absolute";
    container.style.left = "100px";
    container.style.top = "50px";
    document.body.appendChild(container);

    const scene = new Scene(container, 800, 600);

    // Simulate screen coordinates
    const rect = container.getBoundingClientRect();
    const screenX = rect.left + 200;
    const screenY = rect.top + 150;

    const sceneCoords = scene.screenToScene(screenX, screenY);
    expect(sceneCoords.x).toBe(200);
    expect(sceneCoords.y).toBe(150);

    scene.destroy();
    container.remove();
  });

  test("sceneToScreen converts scene coordinates to screen coordinates", () => {
    const container = createTestContainer();
    container.style.position = "absolute";
    container.style.left = "100px";
    container.style.top = "50px";
    document.body.appendChild(container);

    const scene = new Scene(container, 800, 600);

    const rect = container.getBoundingClientRect();
    const screenCoords = scene.sceneToScreen(200, 150);
    expect(screenCoords.x).toBe(200 + rect.left);
    expect(screenCoords.y).toBe(150 + rect.top);

    scene.destroy();
    container.remove();
  });
});

// ── Resize ──

describe("Scene — resize", () => {
  test("resize updates scene dimensions", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    scene.resize(1024, 768);

    expect(scene.width).toBe(1024);
    expect(scene.height).toBe(768);
    // Container CSS size is now controlled by external CSS, not by Scene
    expect(scene.hitBuffer.width).toBe(1024 * window.devicePixelRatio);
    expect(scene.hitBuffer.height).toBe(768 * window.devicePixelRatio);

    scene.destroy();
    container.remove();
  });

  test("resize updates all layer canvases", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);
    const layer1 = scene.createLayer("layer1", 1) as Layer;
    const layer2 = scene.createLayer("layer2", 2) as Layer;

    scene.resize(1024, 768);

    const dpr = window.devicePixelRatio || 1;

    // Check default layer
    const defaultLayer = scene.getLayer("default") as Layer;
    expect(defaultLayer.canvas.width).toBe(1024 * dpr);
    expect(defaultLayer.canvas.height).toBe(768 * dpr);

    // Check other layers
    expect(layer1.canvas.width).toBe(1024 * dpr);
    expect(layer1.canvas.height).toBe(768 * dpr);
    expect(layer2.canvas.width).toBe(1024 * dpr);
    expect(layer2.canvas.height).toBe(768 * dpr);

    scene.destroy();
    container.remove();
  });

  test("resize updates hit buffer", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    scene.resize(1024, 768);

    const dpr = window.devicePixelRatio || 1;
    expect(scene.hitBuffer.width).toBe(1024 * dpr);
    expect(scene.hitBuffer.height).toBe(768 * dpr);

    scene.destroy();
    container.remove();
  });

  test("width and height setters trigger resize", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    scene.width = 1024;
    expect(scene.width).toBe(1024);
    expect(scene.height).toBe(600);

    scene.height = 768;
    expect(scene.width).toBe(1024);
    expect(scene.height).toBe(768);

    scene.destroy();
    container.remove();
  });
});

// ── DPI Handling ──

describe("Scene — DPI handling", () => {
  test("dpr is read from window.devicePixelRatio", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    const expectedDpr = window.devicePixelRatio || 1;
    expect(scene.dpr).toBe(expectedDpr);

    scene.destroy();
    container.remove();
  });

  test("layer canvases are scaled by dpr", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);
    const layer = scene.createLayer("test", 1) as Layer;

    const dpr = scene.dpr;
    expect(layer.canvas.width).toBe(800 * dpr);
    expect(layer.canvas.height).toBe(600 * dpr);
    expect(layer.canvas.style.width).toBe("800px");
    expect(layer.canvas.style.height).toBe("600px");

    scene.destroy();
    container.remove();
  });
});

// ── Element Lookup ──

describe("Scene — element lookup", () => {
  test("getElementById returns element by id", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    const element = new Element("test-element");
    scene.root.addChild(element);

    expect(scene.getElementById("test-element")).toBe(element);

    scene.destroy();
    container.remove();
  });

  test("getElementById returns null for non-existent id", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    expect(scene.getElementById("nonexistent")).toBeNull();

    scene.destroy();
    container.remove();
  });

  test("element is registered when added to scene", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    const element = new Element("test-element");
    scene.root.addChild(element);

    expect(scene.getElementById("test-element")).toBe(element);

    scene.destroy();
    container.remove();
  });

  test("element is unregistered when removed from scene", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    const element = new Element("test-element");
    scene.root.addChild(element);
    expect(scene.getElementById("test-element")).toBe(element);

    scene.root.removeChild(element);
    expect(scene.getElementById("test-element")).toBeNull();

    scene.destroy();
    container.remove();
  });
});

// ── Layer Inheritance ──

describe("Scene — layer inheritance", () => {
  test("child inherits layer from parent", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);
    const layer = scene.createLayer("test", 1);

    const parent = new Container();
    parent.layer = layer;
    scene.root.addChild(parent);

    const child = new Element();
    parent.addChild(child);

    expect(child.layer).toBe(layer);

    scene.destroy();
    container.remove();
  });

  test("child can override parent layer", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);
    const layer1 = scene.createLayer("layer1", 1);
    const layer2 = scene.createLayer("layer2", 2);

    const parent = new Container();
    parent.layer = layer1;
    scene.root.addChild(parent);

    const child = new Element();
    child.layer = layer2;
    parent.addChild(child);

    expect(child.layer).toBe(layer2);

    scene.destroy();
    container.remove();
  });
});

// ── Ticker Integration ──

describe("Scene — ticker integration", () => {
  test("ticker is created and configured", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    expect(scene.ticker).toBeDefined();
    expect(scene.ticker.globalFPS).toBe(60);

    scene.destroy();
    container.remove();
  });

  test("root is registered with ticker", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    // The root should be added to the ticker
    // We can verify this indirectly by checking that update is called
    let updateCalled = false;
    const originalUpdate = scene.root.update.bind(scene.root);
    (scene.root as { update: (dt: number) => void }).update = (dt: number) => {
      updateCalled = true;
      originalUpdate(dt);
    };

    scene.ticker.start();
    scene.ticker._tick(0); // Initialize
    scene.ticker._tick(16); // First real frame
    scene.ticker._tick(32); // Second frame (ensure update is called)

    expect(updateCalled).toBe(true);

    scene.ticker.stop();
    scene.destroy();
    container.remove();
  });
});

// ── Destroy ──

describe("Scene — destroy", () => {
  test("destroy stops ticker and cleans up resources", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    scene.ticker.start();
    scene.destroy();

    expect(scene.ticker.running).toBe(false);

    container.remove();
  });

  test("destroy removes all layers from DOM", () => {
    const container = createTestContainer();
    const scene = new Scene(container, 800, 600);

    const layer1 = scene.createLayer("layer1", 1) as Layer;
    const layer2 = scene.createLayer("layer2", 2) as Layer;

    const canvasCount = container.querySelectorAll("canvas").length;
    expect(canvasCount).toBeGreaterThan(0);

    scene.destroy();

    expect(container.querySelectorAll("canvas").length).toBe(0);

    container.remove();
  });
});
