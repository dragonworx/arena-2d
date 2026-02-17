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
import { computeAABB, intersect } from "../src/math/aabb";
import { multiply } from "../src/math/matrix";

// Polyfill PointerEvent
class PointerEvent extends Event {
  clientX: number;
  clientY: number;
  button: number;

  constructor(type: string, params: any = {}) {
    super(type, params);
    this.clientX = params.clientX || 0;
    this.clientY = params.clientY || 0;
    this.button = params.button || 0;
  }
}
global.PointerEvent = PointerEvent as any;

// ── DOM setup ──

let window: Window;
beforeAll(() => {
  window = new Window();
  global.window = window as unknown as Window & typeof globalThis;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
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
            getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), // Add getTransform
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
            rect: () => {},
            fill: () => {},
            stroke: () => {},
            clip: () => {},
            scale: () => {},
            rotate: () => {},
            translate: () => {},
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
          };
      // @ts-expect-error
      element.getContext = () => mockContext;
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
      };
    }
  }

  global.OffscreenCanvas =
    OffscreenCanvasPolyfill as unknown as typeof OffscreenCanvas;

  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  // @ts-expect-error
  global.getComputedStyle = window.getComputedStyle.bind(window);
});

afterAll(() => {
  window.close();
});

describe("Drag Hit Detection Sweep", () => {
  let scene: Scene;
  let root: any;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.getElementById("app");
    scene = new Scene(app!, 800, 600);
    root = scene.root;
  });

  test("dense sweep of rotated element entering drop zone", () => {
    // Drop zone at 200, 200, size 100x100
    // AABB: x:200, y:200, w:100, h:100
    const dropZone = new Element("dropZone");
    dropZone.width = 100;
    dropZone.height = 100;
    dropZone.x = 200;
    dropZone.y = 200;
    dropZone.interactive = true;
    root.addChild(dropZone);

    // Draggable: 100x20 rotated 45 degrees
    const draggable = new Element("draggable");
    draggable.width = 100;
    draggable.height = 20;
    draggable.rotation = Math.PI / 4;
    draggable.draggable = true;
    draggable.interactive = true;
    root.addChild(draggable);

    // Initial spatial hash update
    scene.root.update(0.016);
    (scene.interaction as any).updateSpatialHash();

    // Verify dropZone is in spatial hash
    const dropZoneAABB = computeAABB({x:0, y:0, width:100, height:100}, dropZone.worldMatrix);
    const candidates = scene.interaction.spatialHash.queryAABB(dropZoneAABB);
    const found = candidates.find(c => (c as any).element === dropZone);
    expect(found).toBeDefined();

    // We will manually simulate hitTestAABB for a sweep of positions
    // Moving draggable from (100, 100) towards (200, 200)
    // We expect hitTest to start returning dropZone as soon as AABBs overlap
    
    // dropZone AABB is [200, 200, 300, 300] (x2 = x+w)
    
    let firstHitDistance = -1;

    for (let i = 0; i < 200; i++) {
        // Move diagonally from 100,100 to 300,300
        const pos = 100 + i;
        draggable.x = pos;
        draggable.y = pos;
        
        // Emulate DragManager logic
        draggable.updateLocalMatrix();
        draggable.worldMatrix = new Float32Array(draggable.localMatrix); // No parent matrix
        
        const dragAABB = computeAABB(
            { x: 0, y: 0, width: draggable.width, height: draggable.height },
            draggable.worldMatrix,
        );

        const hit = scene.interaction.hitTestAABB(dragAABB, draggable);
        
        if (hit === dropZone) {
            firstHitDistance = i;
            // Also manually verify intersection
            const entry = (scene.interaction as any)._spatialEntries.get(dropZone);
            const manualIntersect = intersect(dragAABB, entry.aabb);
            if (!manualIntersect) {
                console.error(`Hit reported but manual intersect failed at i=${i}`, dragAABB, entry.aabb);
            }
            break;
        }
    }

    // AABB of rotated draggable:
    // w=100, h=20. rot=45.
    // bounding box size:
    // W = w*cos + h*sin = 100*0.707 + 20*0.707 = 70.7 + 14.14 = 84.8
    // H = w*sin + h*cos = 100*0.707 + 20*0.707 = 84.8
    // Center is at (x,y) of element? No.
    // Element rotation is around (0,0) (pivot).
    // So Top-Left is at (x,y). 
    // The box extends down-right.
    // AABB starts at (x, y) ? No.
    // With 45 deg, if x,y is TL. 
    // TL=(0,0). TR=(100,0) -> (70.7, 70.7).
    // BL=(0,20) -> (-14.1, 14.1).
    // BR=(100,20) -> (56.6, 84.8).
    // minX = -14.1. maxX = 70.7. Width = 84.8.
    // minY = 0. maxY = 84.8. Height = 84.8.
    // So AABB is shifted relative to x,y.
    
    // Drag pos is x,y (TL).
    // AABB x = pos + (-14.1). y = pos + 0.
    
    // DropZone at 200, 200.
    // Collision when AABB.maxX > 200 && AABB.maxY > 200.
    // pos + 70.7 > 200 => pos > 129.3.
    // pos + 84.8 > 200 => pos > 115.2.
    
    // So we expect hit around i = 130 - 100 = 30?
    // Actually box AABB minX is pos-14.1.
    // Overlap condition:
    // dragAABB.maxX > dropAABB.minX (200)
    // AND dragAABB.maxY > dropAABB.minY (200)
    
    // maxX is pos + 70.7.
    // maxY is pos + 84.8.
    // First condition: pos > 129.3.
    // Second condition: pos > 115.2.
    // So both true when pos > 129.3.
    
    // So around i=30.
    
    console.log("First hit at i=", firstHitDistance);
    
    expect(firstHitDistance).toBeGreaterThan(0);
    expect(firstHitDistance).toBeLessThan(40); // Should be around 30.
  });
});
