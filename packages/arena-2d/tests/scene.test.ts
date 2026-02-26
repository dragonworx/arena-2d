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
import { View } from "../src/core/View";

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
  test("creates a scene with root and ticker", () => {
    const scene = new Scene(800, 600);

    expect(scene.width).toBe(800);
    expect(scene.height).toBe(600);
    expect(scene.root).toBeDefined();
    expect(scene.ticker).toBeDefined();

    scene.destroy();
  });

  test("creates hit buffer with correct resolution", () => {
    const scene = new Scene(800, 600);

    expect(scene.hitBuffer).toBeDefined();
    expect(scene.hitBuffer.width).toBe(800);
    expect(scene.hitBuffer.height).toBe(600);

    scene.destroy();
  });

  test("root has scene reference", () => {
    const scene = new Scene(800, 600);

    expect(scene.root.scene).toBe(scene);

    scene.destroy();
  });
});

// ── View + Layer Management ──

describe("View — layer management", () => {
  let container: HTMLElement;
  let scene: Scene;
  let view: View;

  beforeEach(() => {
    container = createTestContainer();
    scene = new Scene(800, 600);
    view = new View(container, scene);
  });

  test("View creates default layer", () => {
    const defaultLayer = view.getLayer("default");
    expect(defaultLayer).not.toBeNull();
    expect(defaultLayer?.id).toBe("default");

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("createLayer adds a new layer with correct z-index", () => {
    const layer = view.createLayer("background", -1);

    expect(layer).toBeDefined();
    expect(layer.id).toBe("background");
    expect(layer.zIndex).toBe(-1);
    expect(layer.canvas).toBeDefined();
    expect(layer.canvas.parentElement).toBe(container);

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("createLayer throws if layer with same id exists", () => {
    view.createLayer("test", 1);

    expect(() => {
      view.createLayer("test", 2);
    }).toThrow('Layer with id "test" already exists');

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("getLayer returns layer by id or null", () => {
    const layer = view.createLayer("test", 1);

    expect(view.getLayer("test")).toBe(layer);
    expect(view.getLayer("nonexistent")).toBeNull();

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("removeLayer removes layer and cleans up", () => {
    const layer = view.createLayer("test", 1);

    const element = new Element();
    element.layer = layer;
    (layer as Layer).addElement(element);

    view.removeLayer("test");

    expect(view.getLayer("test")).toBeNull();
    expect(layer.canvas.parentElement).toBeNull();

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("removeLayer throws if trying to remove default layer", () => {
    expect(() => {
      view.removeLayer("default");
    }).toThrow("Cannot remove default layer");

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("layers are ordered by z-index", () => {
    const layer1 = view.createLayer("layer1", 10);
    const layer2 = view.createLayer("layer2", 5);
    const layer3 = view.createLayer("layer3", 15);

    expect(layer1.canvas.style.zIndex).toBe("10");
    expect(layer2.canvas.style.zIndex).toBe("5");
    expect(layer3.canvas.style.zIndex).toBe("15");

    view.destroy();
    scene.destroy();
    container.remove();
  });
});

// ── Layer Properties ──

describe("Layer — properties", () => {
  let container: HTMLElement;
  let scene: Scene;
  let view: View;
  let layer: Layer;

  beforeEach(() => {
    container = createTestContainer();
    scene = new Scene(800, 600);
    view = new View(container, scene);
    layer = view.createLayer("test", 1) as Layer;
  });

  test("zIndex setter updates CSS z-index", () => {
    layer.zIndex = 20;
    expect(layer.zIndex).toBe(20);
    expect(layer.canvas.style.zIndex).toBe("20");

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("opacity setter updates CSS opacity", () => {
    layer.opacity = 0.5;
    expect(layer.opacity).toBe(0.5);
    expect(layer.canvas.style.opacity).toBe("0.5");

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("opacity clamps to [0, 1]", () => {
    layer.opacity = 1.5;
    expect(layer.opacity).toBe(1);

    layer.opacity = -0.5;
    expect(layer.opacity).toBe(0);

    view.destroy();
    scene.destroy();
    container.remove();
  });
});

// ── Coordinate Transforms ──

describe("View — coordinate transforms", () => {
  test("screenToScene converts screen coordinates to scene coordinates", () => {
    const container = createTestContainer();
    container.style.position = "absolute";
    container.style.left = "100px";
    container.style.top = "50px";
    document.body.appendChild(container);

    const scene = new Scene(800, 600);
    const view = new View(container, scene);

    // Simulate screen coordinates
    const rect = container.getBoundingClientRect();
    const screenX = rect.left + 200;
    const screenY = rect.top + 150;

    const sceneCoords = view.screenToScene(screenX, screenY);
    expect(sceneCoords.x).toBe(200);
    expect(sceneCoords.y).toBe(150);

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("sceneToScreen converts scene coordinates to screen coordinates", () => {
    const container = createTestContainer();
    container.style.position = "absolute";
    container.style.left = "100px";
    container.style.top = "50px";
    document.body.appendChild(container);

    const scene = new Scene(800, 600);
    const view = new View(container, scene);

    const rect = container.getBoundingClientRect();
    const screenCoords = view.sceneToScreen(200, 150);
    expect(screenCoords.x).toBe(200 + rect.left);
    expect(screenCoords.y).toBe(150 + rect.top);

    view.destroy();
    scene.destroy();
    container.remove();
  });
});

// ── Resize ──

describe("Scene — resize", () => {
  test("resize updates scene dimensions", () => {
    const scene = new Scene(800, 600);

    scene.resize(1024, 768);

    expect(scene.width).toBe(1024);
    expect(scene.height).toBe(768);
    expect(scene.hitBuffer.width).toBe(1024);
    expect(scene.hitBuffer.height).toBe(768);

    scene.destroy();
  });

  test("View resize updates all layer canvases", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);
    const layer1 = view.createLayer("layer1", 1) as Layer;
    const layer2 = view.createLayer("layer2", 2) as Layer;

    view.resize(1024, 768);

    const dpr = view.dpr;

    // Check default layer
    const defaultLayer = view.getLayer("default") as Layer;
    expect(defaultLayer.canvas.width).toBe(1024 * dpr);
    expect(defaultLayer.canvas.height).toBe(768 * dpr);

    // Check other layers
    expect(layer1.canvas.width).toBe(1024 * dpr);
    expect(layer1.canvas.height).toBe(768 * dpr);
    expect(layer2.canvas.width).toBe(1024 * dpr);
    expect(layer2.canvas.height).toBe(768 * dpr);

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("resize updates hit buffer", () => {
    const scene = new Scene(800, 600);

    scene.resize(1024, 768);

    expect(scene.hitBuffer.width).toBe(1024);
    expect(scene.hitBuffer.height).toBe(768);

    scene.destroy();
  });

  test("width and height setters trigger resize", () => {
    const scene = new Scene(800, 600);

    scene.width = 1024;
    expect(scene.width).toBe(1024);
    expect(scene.height).toBe(600);

    scene.height = 768;
    expect(scene.width).toBe(1024);
    expect(scene.height).toBe(768);

    scene.destroy();
  });
});

// ── DPI Handling ──

describe("View — DPI handling", () => {
  test("dpr is read from window.devicePixelRatio", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);

    const expectedDpr = window.devicePixelRatio || 1;
    expect(view.dpr).toBe(expectedDpr);

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("layer canvases are scaled by dpr", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);
    // Explicitly resize since happy-dom clientWidth/Height returns 0
    view.resize(800, 600);
    const layer = view.createLayer("test", 1) as Layer;

    const dpr = view.dpr;
    expect(layer.canvas.width).toBe(800 * dpr);
    expect(layer.canvas.height).toBe(600 * dpr);
    expect(layer.canvas.style.width).toBe("800px");
    expect(layer.canvas.style.height).toBe("600px");

    view.destroy();
    scene.destroy();
    container.remove();
  });
});

// ── Element Lookup ──

describe("Scene — element lookup", () => {
  test("getElementById returns element by id", () => {
    const scene = new Scene(800, 600);

    const element = new Element("test-element");
    scene.root.addChild(element);

    expect(scene.getElementById("test-element")).toBe(element);

    scene.destroy();
  });

  test("getElementById returns null for non-existent id", () => {
    const scene = new Scene(800, 600);

    expect(scene.getElementById("nonexistent")).toBeNull();

    scene.destroy();
  });

  test("element is registered when added to scene", () => {
    const scene = new Scene(800, 600);

    const element = new Element("test-element");
    scene.root.addChild(element);

    expect(scene.getElementById("test-element")).toBe(element);

    scene.destroy();
  });

  test("element is unregistered when removed from scene", () => {
    const scene = new Scene(800, 600);

    const element = new Element("test-element");
    scene.root.addChild(element);
    expect(scene.getElementById("test-element")).toBe(element);

    scene.root.removeChild(element);
    expect(scene.getElementById("test-element")).toBeNull();

    scene.destroy();
  });
});

// ── Layer Inheritance ──

describe("View — layer inheritance", () => {
  test("child inherits layer from parent", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);
    const layer = view.createLayer("test", 1);

    const parent = new Container();
    parent.layer = layer;
    scene.root.addChild(parent);

    const child = new Element();
    parent.addChild(child);

    expect(child.layer).toBe(layer);

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("child can override parent layer", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);
    const layer1 = view.createLayer("layer1", 1);
    const layer2 = view.createLayer("layer2", 2);

    const parent = new Container();
    parent.layer = layer1;
    scene.root.addChild(parent);

    const child = new Element();
    child.layer = layer2;
    parent.addChild(child);

    expect(child.layer).toBe(layer2);

    view.destroy();
    scene.destroy();
    container.remove();
  });
});

// ── Ticker Integration ──

describe("Scene — ticker integration", () => {
  test("ticker is created and configured", () => {
    const scene = new Scene(800, 600);

    expect(scene.ticker).toBeDefined();
    expect(scene.ticker.globalFPS).toBe(60);

    scene.destroy();
  });

  test("root is registered with ticker", () => {
    const scene = new Scene(800, 600);

    let updateCalled = false;
    const originalUpdate = scene.root.update.bind(scene.root);
    (scene.root as { update: (dt: number) => void }).update = (dt: number) => {
      updateCalled = true;
      originalUpdate(dt);
    };

    scene.ticker.start();
    scene.ticker._tick(0); // Initialize
    scene.ticker._tick(16); // First real frame
    scene.ticker._tick(32); // Second frame

    expect(updateCalled).toBe(true);

    scene.ticker.stop();
    scene.destroy();
  });
});

// ── Destroy ──

describe("Scene — destroy", () => {
  test("destroy stops ticker and cleans up resources", () => {
    const scene = new Scene(800, 600);

    scene.ticker.start();
    scene.destroy();

    expect(scene.ticker.running).toBe(false);
  });

  test("destroy removes all layers from DOM", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);

    view.createLayer("layer1", 1);
    view.createLayer("layer2", 2);

    const canvasCount = container.querySelectorAll("canvas").length;
    expect(canvasCount).toBeGreaterThan(0);

    scene.destroy(); // This should also destroy the view

    expect(container.querySelectorAll("canvas").length).toBe(0);

    container.remove();
  });
});

// ── View Pan/Zoom ──

describe("View — pan/zoom", () => {
  test("initial zoom is 1", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);

    expect(view.zoom).toBe(1);
    expect(view.panX).toBe(0);
    expect(view.panY).toBe(0);

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("zoom and pan setters work", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);

    view.zoom = 2;
    view.panX = 100;
    view.panY = 50;

    expect(view.zoom).toBe(2);
    expect(view.panX).toBe(100);
    expect(view.panY).toBe(50);

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("zoom clamps to minimum 0.01", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);

    view.zoom = 0;
    expect(view.zoom).toBe(0.01);

    view.zoom = -5;
    expect(view.zoom).toBe(0.01);

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("coordinate transforms account for zoom and pan", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);

    view.zoom = 2;
    view.panX = 100;
    view.panY = 50;

    const rect = container.getBoundingClientRect();
    // screenToScene: viewX = screenX - rect.left, sceneX = (viewX - panX) / zoom
    const coords = view.screenToScene(rect.left + 200, rect.top + 150);
    expect(coords.x).toBe((200 - 100) / 2); // 50
    expect(coords.y).toBe((150 - 50) / 2); // 50

    view.destroy();
    scene.destroy();
    container.remove();
  });
});

// ── View LookAt ──

describe("View — lookAt", () => {
  test("lookAt centers on a point", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);

    view.resize(800, 600);
    view.lookAt(100, 100);

    // center alignment: panX = viewW/2 - x * zoom (default zoom=1)
    expect(view.panX).toBe(800 / 2 - 100 * 1); // 300
    expect(view.panY).toBe(600 / 2 - 100 * 1); // 200

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("lookAt with zoom option sets both zoom and pan", () => {
    const container = createTestContainer();
    const scene = new Scene(800, 600);
    const view = new View(container, scene);
    view.resize(800, 600);

    view.lookAt(200, 150, { zoom: 2 });

    expect(view.zoom).toBe(2);
    // center: panX = 400 - 200*2 = 0, panY = 300 - 150*2 = 0
    expect(view.panX).toBe(0);
    expect(view.panY).toBe(0);

    view.destroy();
    scene.destroy();
    container.remove();
  });

  test("lookAt with projection modifies the projection's sourceRect", () => {
    const container = createTestContainer();
    const scene = new Scene(400, 300);
    const proj = {
      sourceRect: { x: 0, y: 0, width: 200, height: 150 },
      destRect: { x: 0, y: 0, width: 200, height: 150 },
    };
    const view = new View(container, scene, { projections: [proj] });

    // lookAt center of quad at 2x zoom (without resize to preserve destRect)
    view.lookAt(100, 75, { zoom: 2, projection: proj });

    // sourceRect should be: width = destW/zoom = 200/2 = 100, height = 150/2 = 75
    // x = 100 - 100/2 = 50, y = 75 - 75/2 = 37.5
    expect(proj.sourceRect.width).toBe(100);
    expect(proj.sourceRect.height).toBe(75);
    expect(proj.sourceRect.x).toBe(50);
    expect(proj.sourceRect.y).toBe(37.5);

    view.destroy();
    scene.destroy();
    container.remove();
  });
});

// ── View Projection Hit Testing ──

describe("View — projection hit testing", () => {
  test("multiple projections exist and zoom/pan work correctly", () => {
    const container = createTestContainer();
    const scene = new Scene(400, 300);
    const view = new View(container, scene, {
      projections: [
        {
          sourceRect: { x: 0, y: 0, width: 200, height: 150 },
          destRect: { x: 0, y: 0, width: 200, height: 150 },
        },
        {
          sourceRect: { x: 200, y: 0, width: 200, height: 150 },
          destRect: { x: 200, y: 0, width: 200, height: 150 },
        },
      ],
    });
    view.resize(400, 300);

    expect(view.projections.length).toBe(2);
    expect(view.projections[0].destRect.x).toBe(0);
    expect(view.projections[1].destRect.x).toBe(200);

    // Modifying sourceRect of one projection doesn't affect the other
    view.projections[0].sourceRect.x = 10;
    expect(view.projections[0].sourceRect.x).toBe(10);
    expect(view.projections[1].sourceRect.x).toBe(200);

    view.destroy();
    scene.destroy();
    container.remove();
  });
});
