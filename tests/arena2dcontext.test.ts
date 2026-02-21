import { describe, expect, mock, test } from "bun:test";
import { Element } from "../src/core/Element";
import {
  Arena2DContext,
  type ITextStyle,
  buildFontString,
} from "../src/rendering/Arena2DContext";

// ── Mock CanvasRenderingContext2D ──

interface MockCall {
  method: string;
  args: unknown[];
}

function createMockGradient(): CanvasGradient {
  const stops: Array<{ offset: number; color: string }> = [];
  return {
    addColorStop(offset: number, color: string) {
      stops.push({ offset, color });
    },
    // Expose for test assertions
    _stops: stops,
  } as unknown as CanvasGradient;
}

function createMockCtx() {
  const calls: MockCall[] = [];
  let _font = "";
  let _fillStyle: string | CanvasGradient | CanvasPattern = "";
  let _strokeStyle: string | CanvasGradient | CanvasPattern = "";
  let _lineWidth = 1;
  let _globalAlpha = 1;
  let _globalCompositeOperation = "source-over";
  let _shadowColor = "transparent";
  let _shadowBlur = 0;
  let _shadowOffsetX = 0;
  let _shadowOffsetY = 0;
  let _textBaseline = "alphabetic";
  let _textAlign = "left";
  let _lineDash: number[] = [];

  const record = (method: string) =>
    mock((...args: unknown[]) => {
      calls.push({ method, args });
    });

  const ctx = {
    // Tracked method calls
    beginPath: record("beginPath"),
    rect: record("rect"),
    roundRect: record("roundRect"),
    arc: record("arc"),
    ellipse: record("ellipse"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    closePath: record("closePath"),
    fill: record("fill"),
    stroke: record("stroke"),
    fillRect: record("fillRect"),
    strokeRect: record("strokeRect"),
    clip: record("clip"),
    fillText: record("fillText"),
    save: record("save"),
    restore: record("restore"),
    setTransform: record("setTransform"),
    drawImage: record("drawImage"),
    setLineDash: mock((...args: unknown[]) => {
      calls.push({ method: "setLineDash", args });
      _lineDash = args[0] as number[];
    }),

    // Gradient factories
    createLinearGradient: mock((...args: unknown[]) => {
      calls.push({ method: "createLinearGradient", args });
      return createMockGradient();
    }),
    createRadialGradient: mock((...args: unknown[]) => {
      calls.push({ method: "createRadialGradient", args });
      return createMockGradient();
    }),

    // measureText mock
    measureText: mock((_text: string) => ({
      width: 50,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 3,
    })),

    // Properties with getters/setters for tracking
    get font() {
      return _font;
    },
    set font(v: string) {
      _font = v;
    },
    get fillStyle() {
      return _fillStyle;
    },
    set fillStyle(v: string | CanvasGradient | CanvasPattern) {
      _fillStyle = v;
    },
    get strokeStyle() {
      return _strokeStyle;
    },
    set strokeStyle(v: string | CanvasGradient | CanvasPattern) {
      _strokeStyle = v;
    },
    get lineWidth() {
      return _lineWidth;
    },
    set lineWidth(v: number) {
      _lineWidth = v;
    },
    get globalAlpha() {
      return _globalAlpha;
    },
    set globalAlpha(v: number) {
      _globalAlpha = v;
    },
    get globalCompositeOperation() {
      return _globalCompositeOperation;
    },
    set globalCompositeOperation(v: string) {
      _globalCompositeOperation = v;
    },
    get shadowColor() {
      return _shadowColor;
    },
    set shadowColor(v: string) {
      _shadowColor = v;
    },
    get shadowBlur() {
      return _shadowBlur;
    },
    set shadowBlur(v: number) {
      _shadowBlur = v;
    },
    get shadowOffsetX() {
      return _shadowOffsetX;
    },
    set shadowOffsetX(v: number) {
      _shadowOffsetX = v;
    },
    get shadowOffsetY() {
      return _shadowOffsetY;
    },
    set shadowOffsetY(v: number) {
      _shadowOffsetY = v;
    },
    get textBaseline() {
      return _textBaseline;
    },
    set textBaseline(v: string) {
      _textBaseline = v;
    },
    get textAlign() {
      return _textAlign;
    },
    set textAlign(v: string) {
      _textAlign = v;
    },

    // Expose internals for assertions
    _calls: calls,
  };

  return ctx as unknown as CanvasRenderingContext2D & { _calls: MockCall[] };
}

// ── Construction ──

describe("Arena2DContext — construction", () => {
  test("wraps a CanvasRenderingContext2D and exposes .raw", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);
    expect(uiCtx.raw).toBe(mockCtx);
  });
});

// ── Save/Restore Balance (6.8) ──

describe("Arena2DContext — beginElement / endElement", () => {
  test("beginElement calls save, setTransform, sets alpha and blendMode", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const el = new Element("test");
    el.alpha = 0.5;
    el.blendMode = "multiply";
    el.update(0); // Compute worldMatrix

    uiCtx.beginElement(el);

    // Should have called save and setTransform
    const saveCall = mockCtx._calls.find((c) => c.method === "save");
    expect(saveCall).toBeDefined();

    const setTransformCall = mockCtx._calls.find(
      (c) => c.method === "setTransform",
    );
    expect(setTransformCall).toBeDefined();
    // Identity matrix: [1, 0, 0, 1, 0, 0]
    expect(setTransformCall?.args).toEqual([1, 0, 0, 1, 0, 0]);

    expect(mockCtx.globalAlpha).toBe(0.5);
    expect(mockCtx.globalCompositeOperation).toBe("multiply");
  });

  test("endElement calls restore", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.endElement();

    const restoreCall = mockCtx._calls.find((c) => c.method === "restore");
    expect(restoreCall).toBeDefined();
  });

  test("save/restore are balanced across multiple elements", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const el1 = new Element("a");
    const el2 = new Element("b");
    el1.update(0);
    el2.update(0);

    uiCtx.beginElement(el1);
    uiCtx.endElement();
    uiCtx.beginElement(el2);
    uiCtx.endElement();

    const saves = mockCtx._calls.filter((c) => c.method === "save").length;
    const restores = mockCtx._calls.filter(
      (c) => c.method === "restore",
    ).length;
    expect(saves).toBe(2);
    expect(restores).toBe(2);
  });
});

// ── Shape Primitives (6.1) ──

describe("Arena2DContext — shape primitives", () => {
  test("drawRect calls fillRect and strokeRect", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.drawRect(10, 20, 100, 50, "#f00", "#0f0");

    const methods = mockCtx._calls.map((c) => c.method);
    expect(methods).toContain("fillRect");
    expect(methods).toContain("strokeRect");

    const fillCall = mockCtx._calls.find((c) => c.method === "fillRect");
    expect(fillCall?.args).toEqual([10, 20, 100, 50]);

    const strokeCall = mockCtx._calls.find((c) => c.method === "strokeRect");
    expect(strokeCall?.args).toEqual([10, 20, 100, 50]);
  });

  test("drawRect with only fill does not stroke", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.drawRect(0, 0, 50, 50, "#f00");

    const methods = mockCtx._calls.map((c) => c.method);
    expect(methods).toContain("fillRect");
    expect(methods).not.toContain("strokeRect");
  });

  test("drawRoundedRect calls roundRect with number radius", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.drawRoundedRect(0, 0, 100, 50, 10, "#f00");

    const rrCall = mockCtx._calls.find((c) => c.method === "roundRect");
    expect(rrCall).toBeDefined();
    expect(rrCall?.args).toEqual([0, 0, 100, 50, 10]);
  });

  test("drawRoundedRect calls roundRect with array radius", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.drawRoundedRect(0, 0, 100, 50, [5, 10, 15, 20], "#f00");

    const rrCall = mockCtx._calls.find((c) => c.method === "roundRect");
    expect(rrCall?.args[4]).toEqual([5, 10, 15, 20]);
  });

  test("drawCircle calls arc with TAU", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.drawCircle(50, 50, 25, "#f00");

    const arcCall = mockCtx._calls.find((c) => c.method === "arc");
    expect(arcCall).toBeDefined();
    expect(arcCall?.args).toEqual([50, 50, 25, 0, Math.PI * 2]);
  });

  test("drawEllipse calls ellipse", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.drawEllipse(50, 50, 30, 20, "#f00");

    const eCall = mockCtx._calls.find((c) => c.method === "ellipse");
    expect(eCall).toBeDefined();
    expect(eCall?.args).toEqual([50, 50, 30, 20, 0, 0, Math.PI * 2]);
  });

  test("drawLine calls moveTo, lineTo, stroke", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.drawLine(0, 0, 100, 100, "#fff", 2);

    const methods = mockCtx._calls.map((c) => c.method);
    expect(methods).toContain("moveTo");
    expect(methods).toContain("lineTo");
    expect(methods).toContain("stroke");

    const moveCall = mockCtx._calls.find((c) => c.method === "moveTo");
    expect(moveCall?.args).toEqual([0, 0]);
    const lineCall = mockCtx._calls.find((c) => c.method === "lineTo");
    expect(lineCall?.args).toEqual([100, 100]);
    expect(mockCtx.lineWidth).toBe(2);
  });

  test("drawPolygon calls moveTo, lineTo for each point, closePath", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 80 },
    ];
    uiCtx.drawPolygon(points, "#f00", "#0f0");

    const methods = mockCtx._calls.map((c) => c.method);
    expect(methods).toContain("moveTo");
    expect(methods).toContain("lineTo");
    expect(methods).toContain("closePath");
    expect(methods).toContain("fill");
    expect(methods).toContain("stroke");

    const lineToCount = mockCtx._calls.filter(
      (c) => c.method === "lineTo",
    ).length;
    expect(lineToCount).toBe(2); // 3 points → 1 moveTo + 2 lineTo
  });

  test("drawPolygon with empty points is a no-op", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.drawPolygon([], "#f00");
    expect(mockCtx._calls.length).toBe(0);
  });

  test("drawPath calls fill/stroke with Path2D", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const path = {} as Path2D;
    uiCtx.drawPath(path, "#f00", "#0f0");

    const fillCall = mockCtx._calls.find((c) => c.method === "fill");
    expect(fillCall).toBeDefined();
    expect(fillCall?.args[0]).toBe(path);

    const strokeCall = mockCtx._calls.find((c) => c.method === "stroke");
    expect(strokeCall).toBeDefined();
    expect(strokeCall?.args[0]).toBe(path);
  });
});

// ── Gradient Stops (6.6) ──

describe("Arena2DContext — gradients", () => {
  test("createLinearGradient adds stops in order", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const stops = [
      { offset: 0, color: "red" },
      { offset: 0.5, color: "green" },
      { offset: 1, color: "blue" },
    ];
    const grad = uiCtx.createLinearGradient(0, 0, 100, 0, stops);

    // Verify gradient was created with correct coordinates
    const createCall = mockCtx._calls.find(
      (c) => c.method === "createLinearGradient",
    );
    expect(createCall?.args).toEqual([0, 0, 100, 0]);

    // Verify stops were added (via mock gradient's _stops)
    const mockGrad = grad as unknown as {
      _stops: Array<{ offset: number; color: string }>;
    };
    expect(mockGrad._stops).toEqual(stops);
  });

  test("createRadialGradient uses concentric circles (inner radius 0)", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const stops = [
      { offset: 0, color: "white" },
      { offset: 1, color: "black" },
    ];
    uiCtx.createRadialGradient(50, 50, 40, stops);

    const createCall = mockCtx._calls.find(
      (c) => c.method === "createRadialGradient",
    );
    // Should be (cx, cy, 0, cx, cy, r)
    expect(createCall?.args).toEqual([50, 50, 0, 50, 50, 40]);
  });
});

// ── Text (6.3) ──

describe("Arena2DContext — text", () => {
  test("drawText applies font, fill, baseline, align and calls fillText", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const style: ITextStyle = {
      fontSize: 16,
      fontFamily: "Arial",
      fontWeight: "bold",
      fill: "#fff",
      textBaseline: "top",
      textAlign: "center",
    };
    uiCtx.drawText("Hello", 10, 20, style);

    expect(mockCtx.font).toBe("bold normal 16px Arial");
    expect(mockCtx.fillStyle).toBe("#fff");
    expect(mockCtx.textBaseline).toBe("top");
    expect(mockCtx.textAlign).toBe("center");

    const fillTextCall = mockCtx._calls.find((c) => c.method === "fillText");
    expect(fillTextCall).toBeDefined();
    expect(fillTextCall?.args).toEqual(["Hello", 10, 20]);
  });

  test("drawText uses defaults for optional style fields", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.drawText("Test", 0, 0, { fontSize: 14, fontFamily: "sans-serif" });

    expect(mockCtx.font).toBe("normal normal 14px sans-serif");
    expect(mockCtx.fillStyle).toBe("#000");
    expect(mockCtx.textBaseline).toBe("alphabetic");
    expect(mockCtx.textAlign).toBe("left");
  });

  test("measureText returns non-zero dimensions for non-empty string", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const result = uiCtx.measureText("Hello", {
      fontSize: 16,
      fontFamily: "Arial",
    });

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    // Our mock returns width=50, ascent=10, descent=3
    expect(result.width).toBe(50);
    expect(result.height).toBe(13); // 10 + 3
  });

  test("measureText falls back to fontSize * 1.2 when font metrics unavailable", () => {
    const mockCtx = createMockCtx();
    // Override measureText to not include font bounding box
    mockCtx.measureText = mock((_text: string) => ({
      width: 40,
    })) as unknown as CanvasRenderingContext2D["measureText"];

    const uiCtx = new Arena2DContext(mockCtx);

    const result = uiCtx.measureText("Test", {
      fontSize: 20,
      fontFamily: "Arial",
    });

    expect(result.width).toBe(40);
    expect(result.height).toBeCloseTo(24, 1); // 20 * 1.2
  });
});

// ── buildFontString ──

describe("buildFontString", () => {
  test("builds correct font string with all options", () => {
    const result = buildFontString({
      fontSize: 16,
      fontFamily: "Arial",
      fontWeight: "bold",
      fontStyle: "italic",
    });
    expect(result).toBe("bold italic 16px Arial");
  });

  test("uses defaults for weight and style", () => {
    const result = buildFontString({
      fontSize: 12,
      fontFamily: "sans-serif",
    });
    expect(result).toBe("normal normal 12px sans-serif");
  });
});

// ── Effects (6.4) ──

describe("Arena2DContext — effects", () => {
  test("setShadow sets all shadow properties", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.setShadow("rgba(0,0,0,0.5)", 10, 3, 4);

    expect(mockCtx.shadowColor).toBe("rgba(0,0,0,0.5)");
    expect(mockCtx.shadowBlur).toBe(10);
    expect(mockCtx.shadowOffsetX).toBe(3);
    expect(mockCtx.shadowOffsetY).toBe(4);
  });

  test("clearShadow resets all shadow properties to defaults", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    // Set shadow first
    uiCtx.setShadow("red", 20, 5, 5);
    // Clear it
    uiCtx.clearShadow();

    expect(mockCtx.shadowColor).toBe("transparent");
    expect(mockCtx.shadowBlur).toBe(0);
    expect(mockCtx.shadowOffsetX).toBe(0);
    expect(mockCtx.shadowOffsetY).toBe(0);
  });
});

// ── Clipping (6.5) ──

describe("Arena2DContext — clipping", () => {
  test("clipRect calls beginPath, rect, clip", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.clipRect(10, 10, 200, 200);

    const methods = mockCtx._calls.map((c) => c.method);
    expect(methods).toContain("beginPath");
    expect(methods).toContain("rect");
    expect(methods).toContain("clip");

    const rectCall = mockCtx._calls.find((c) => c.method === "rect");
    expect(rectCall?.args).toEqual([10, 10, 200, 200]);
  });

  test("clipRoundedRect calls beginPath, roundRect, clip", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.clipRoundedRect(0, 0, 100, 100, 8);

    const methods = mockCtx._calls.map((c) => c.method);
    expect(methods).toContain("beginPath");
    expect(methods).toContain("roundRect");
    expect(methods).toContain("clip");

    const rrCall = mockCtx._calls.find((c) => c.method === "roundRect");
    expect(rrCall?.args).toEqual([0, 0, 100, 100, 8]);
  });
});

// ── Line Style (6.7) ──

describe("Arena2DContext — line style", () => {
  test("setLineWidth delegates to ctx.lineWidth", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.setLineWidth(3);
    expect(mockCtx.lineWidth).toBe(3);
  });

  test("setLineDash delegates to ctx.setLineDash", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    uiCtx.setLineDash([5, 3]);

    const dashCall = mockCtx._calls.find((c) => c.method === "setLineDash");
    expect(dashCall).toBeDefined();
    expect(dashCall?.args).toEqual([[5, 3]]);
  });
});

// ── Image Drawing (6.2) ──

describe("Arena2DContext — image drawing", () => {
  test("drawImage with position only", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const img = {} as CanvasImageSource;
    uiCtx.drawImage(img, 10, 20);

    const call = mockCtx._calls.find((c) => c.method === "drawImage");
    expect(call).toBeDefined();
    expect(call?.args).toEqual([img, 10, 20]);
  });

  test("drawImage with position and size", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const img = {} as CanvasImageSource;
    uiCtx.drawImage(img, 10, 20, 100, 50);

    const call = mockCtx._calls.find((c) => c.method === "drawImage");
    expect(call?.args).toEqual([img, 10, 20, 100, 50]);
  });

  test("drawImageRegion calls 9-arg drawImage", () => {
    const mockCtx = createMockCtx();
    const uiCtx = new Arena2DContext(mockCtx);

    const img = {} as CanvasImageSource;
    uiCtx.drawImageRegion(img, 0, 0, 32, 32, 10, 10, 64, 64);

    const call = mockCtx._calls.find((c) => c.method === "drawImage");
    expect(call?.args).toEqual([img, 0, 0, 32, 32, 10, 10, 64, 64]);
  });
});
