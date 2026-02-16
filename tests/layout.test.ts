/**
 * Layout Engine Tests — Layer 8
 *
 * Tests flex distribution, wrap, percentages, anchors, min/max,
 * nested flex, auto sizing, margin, padding, gap.
 */

import { describe, expect, test } from "bun:test";
import { Container } from "../src/core/Container";
import { DirtyFlags } from "../src/core/DirtyFlags";
import { Element } from "../src/core/Element";
import { getLayoutData, resolveLayout } from "../src/layout/LayoutResolver";
import {
  applyConstraints,
  createDefaultStyle,
  resolveUnit,
} from "../src/layout/Style";
import type { IStyle, LayoutUnit } from "../src/layout/Style";

// ── Helpers ──

function makeContainer(
  w: number,
  h: number,
  style?: Partial<IStyle>,
): Container {
  const c = new Container();
  c.width = w;
  c.height = h;
  if (style) c.updateStyle(style);
  return c;
}

function makeChild(style?: Partial<IStyle>): Element {
  const el = new Element();
  if (style) el.updateStyle(style);
  return el;
}

function makeFixedChild(
  w: number,
  h: number,
  style?: Partial<IStyle>,
): Element {
  const el = new Element();
  el.width = w;
  el.height = h;
  el.updateStyle({ width: w, height: h, ...style });
  return el;
}

function runLayout(root: Container): void {
  resolveLayout(root);
}

// ── Style helpers ──

describe("Style", () => {
  test("createDefaultStyle returns correct defaults", () => {
    const s = createDefaultStyle();
    expect(s.display).toBe("manual");
    expect(s.flexDirection).toBe("row");
    expect(s.justifyContent).toBe("start");
    expect(s.alignItems).toBe("start");
    expect(s.flexWrap).toBe("nowrap");
    expect(s.gap).toBe(0);
    expect(s.flexGrow).toBe(0);
    expect(s.flexShrink).toBe(1);
    expect(s.flexBasis).toBe("auto");
    expect(s.width).toBe("auto");
    expect(s.height).toBe("auto");
    expect(s.padding).toEqual([0, 0, 0, 0]);
    expect(s.margin).toEqual([0, 0, 0, 0]);
    expect(s.minWidth).toBeUndefined();
    expect(s.maxWidth).toBeUndefined();
    expect(s.minHeight).toBeUndefined();
    expect(s.maxHeight).toBeUndefined();
  });

  test("resolveUnit handles numbers", () => {
    expect(resolveUnit(100, 500, 0)).toBe(100);
  });

  test("resolveUnit handles percentages", () => {
    expect(resolveUnit("50%" as LayoutUnit, 400, 0)).toBe(200);
    expect(resolveUnit("25%" as LayoutUnit, 200, 0)).toBe(50);
  });

  test("resolveUnit handles auto", () => {
    expect(resolveUnit("auto", 500, 42)).toBe(42);
  });

  test("resolveUnit handles undefined", () => {
    expect(resolveUnit(undefined, 500, 99)).toBe(99);
  });

  test("applyConstraints respects min", () => {
    expect(applyConstraints(30, 50, undefined)).toBe(50);
  });

  test("applyConstraints respects max", () => {
    expect(applyConstraints(100, undefined, 80)).toBe(80);
  });

  test("applyConstraints respects both", () => {
    expect(applyConstraints(30, 50, 80)).toBe(50);
    expect(applyConstraints(100, 50, 80)).toBe(80);
    expect(applyConstraints(60, 50, 80)).toBe(60);
  });
});

// ── Element style integration ──

describe("Element style integration", () => {
  test("element has default style", () => {
    const el = new Element();
    expect(el.style.display).toBe("manual");
    expect(el.style.flexDirection).toBe("row");
  });

  test("updateStyle merges and invalidates layout", () => {
    const el = new Element();
    el.updateStyle({ display: "flex", flexDirection: "column" });
    expect(el.style.display).toBe("flex");
    expect(el.style.flexDirection).toBe("column");
    expect(el.dirtyFlags & DirtyFlags.Layout).toBeTruthy();
  });

  test("width/height setters trigger Visual invalidation", () => {
    const el = new Element();
    el.update(0); // Clear flags
    el.width = 100;
    expect(el.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
  });
});

// ── Flex Row Layout ──

describe("Flex row layout", () => {
  test("children positioned sequentially in row", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(80, 40, { display: "flex" });
    const b = makeFixedChild(60, 40, { display: "flex" });
    const c = makeFixedChild(40, 40, { display: "flex" });
    root.addChild(a);
    root.addChild(b);
    root.addChild(c);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);
    const ldC = getLayoutData(c);

    expect(ldA.computedX).toBe(0);
    expect(ldB.computedX).toBe(80);
    expect(ldC.computedX).toBe(140);
    expect(ldA.computedWidth).toBe(80);
    expect(ldB.computedWidth).toBe(60);
    expect(ldC.computedWidth).toBe(40);
  });

  test("justify-content: center", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
    });
    const a = makeFixedChild(60, 40, { display: "flex" });
    const b = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);

    // Total child width = 120, remaining = 180, center offset = 90
    expect(ldA.computedX).toBe(90);
    expect(ldB.computedX).toBe(150);
  });

  test("justify-content: end", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
      justifyContent: "end",
    });
    const a = makeFixedChild(60, 40, { display: "flex" });
    const b = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);

    // Total child width = 120, remaining = 180
    expect(ldA.computedX).toBe(180);
    expect(ldB.computedX).toBe(240);
  });

  test("justify-content: space-between", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
    });
    const a = makeFixedChild(60, 40, { display: "flex" });
    const b = makeFixedChild(60, 40, { display: "flex" });
    const c = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);
    root.addChild(b);
    root.addChild(c);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);
    const ldC = getLayoutData(c);

    // Total width = 180, remaining = 120, gap between = 60
    expect(ldA.computedX).toBe(0);
    expect(ldC.computedX).toBe(240);
    // Middle item should be centered
    expect(ldB.computedX).toBe(120);
  });

  test("justify-content: space-around", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-around",
    });
    const a = makeFixedChild(60, 40, { display: "flex" });
    const b = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);

    // Total width = 120, remaining = 180
    // space per item = 90, half-space = 45
    expect(ldA.computedX).toBe(45);
    expect(ldB.computedX).toBe(195);
  });

  test("align-items: center", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
    });
    const a = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    // Cross axis (y): (100 - 40) / 2 = 30
    expect(ldA.computedY).toBe(30);
  });

  test("align-items: end", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
      alignItems: "end",
    });
    const a = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedY).toBe(60);
  });

  test("align-items: stretch", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch",
    });
    const a = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedHeight).toBe(100);
  });
});

// ── Flex Column Layout ──

describe("Flex column layout", () => {
  test("children positioned sequentially in column", () => {
    const root = makeContainer(100, 300, {
      display: "flex",
      flexDirection: "column",
    });
    const a = makeFixedChild(40, 80, { display: "flex" });
    const b = makeFixedChild(40, 60, { display: "flex" });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);

    expect(ldA.computedY).toBe(0);
    expect(ldB.computedY).toBe(80);
    expect(ldA.computedHeight).toBe(80);
    expect(ldB.computedHeight).toBe(60);
  });

  test("column justify-content: center", () => {
    const root = makeContainer(100, 300, {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    });
    const a = makeFixedChild(40, 60, { display: "flex" });
    const b = makeFixedChild(40, 60, { display: "flex" });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    // Total height = 120, remaining = 180, offset = 90
    expect(ldA.computedY).toBe(90);
  });
});

// ── Flex Grow ──

describe("Flex grow", () => {
  test("distributes free space proportionally", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(60, 40, { display: "flex", flexGrow: 1 });
    const b = makeFixedChild(60, 40, { display: "flex", flexGrow: 2 });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);

    // Free space = 300 - 120 = 180
    // A gets 60 (1/3 of 180), B gets 120 (2/3 of 180)
    expect(ldA.computedWidth).toBe(120); // 60 + 60
    expect(ldB.computedWidth).toBe(180); // 60 + 120
  });

  test("grow with zero basis", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(0, 40, {
      display: "flex",
      flexGrow: 1,
      flexBasis: 0,
    });
    const b = makeFixedChild(0, 40, {
      display: "flex",
      flexGrow: 1,
      flexBasis: 0,
    });
    const c = makeFixedChild(0, 40, {
      display: "flex",
      flexGrow: 1,
      flexBasis: 0,
    });
    root.addChild(a);
    root.addChild(b);
    root.addChild(c);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);
    const ldC = getLayoutData(c);

    expect(ldA.computedWidth).toBe(100);
    expect(ldB.computedWidth).toBe(100);
    expect(ldC.computedWidth).toBe(100);
  });
});

// ── Flex Shrink ──

describe("Flex shrink", () => {
  test("shrinks items when overflow", () => {
    const root = makeContainer(200, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(150, 40, { display: "flex", flexShrink: 1 });
    const b = makeFixedChild(150, 40, { display: "flex", flexShrink: 1 });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);

    // Total = 300, container = 200, overflow = 100
    // Each shrinks equally (same basis * shrink)
    expect(ldA.computedWidth).toBe(100);
    expect(ldB.computedWidth).toBe(100);
  });

  test("flex-shrink: 0 prevents shrinking", () => {
    const root = makeContainer(200, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(150, 40, { display: "flex", flexShrink: 0 });
    const b = makeFixedChild(150, 40, { display: "flex", flexShrink: 1 });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);

    // A doesn't shrink (150), B must absorb all overflow
    expect(ldA.computedWidth).toBe(150);
    expect(ldB.computedWidth).toBe(50);
  });
});

// ── Gap ──

describe("Gap", () => {
  test("adds spacing between flex items", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
      gap: 10,
    });
    const a = makeFixedChild(60, 40, { display: "flex" });
    const b = makeFixedChild(60, 40, { display: "flex" });
    const c = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);
    root.addChild(b);
    root.addChild(c);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);
    const ldC = getLayoutData(c);

    expect(ldA.computedX).toBe(0);
    expect(ldB.computedX).toBe(70); // 60 + 10
    expect(ldC.computedX).toBe(140); // 60 + 10 + 60 + 10
  });
});

// ── Padding ──

describe("Padding", () => {
  test("padding reduces content area", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
      padding: [10, 20, 10, 20],
    });
    const a = makeFixedChild(60, 40, { display: "flex", flexGrow: 1 });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    // Content area = 300 - 20 - 20 = 260
    expect(ldA.computedX).toBe(20); // left padding
    expect(ldA.computedY).toBe(10); // top padding
    expect(ldA.computedWidth).toBe(260); // fills content area
  });
});

// ── Margin ──

describe("Margin", () => {
  test("margin creates spacing in flex", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(60, 40, {
      display: "flex",
      margin: [5, 10, 5, 10],
    });
    const b = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);

    expect(ldA.computedX).toBe(10); // left margin
    expect(ldA.computedY).toBe(5); // top margin
    expect(ldB.computedX).toBe(80); // 10 + 60 + 10
  });
});

// ── Min/Max Constraints ──

describe("Min/Max constraints", () => {
  test("minWidth prevents shrinking below threshold", () => {
    const root = makeContainer(200, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(150, 40, {
      display: "flex",
      flexShrink: 1,
      minWidth: 120,
    });
    const b = makeFixedChild(150, 40, { display: "flex", flexShrink: 1 });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedWidth).toBeGreaterThanOrEqual(120);
  });

  test("maxWidth clamps even with flexGrow", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(60, 40, {
      display: "flex",
      flexGrow: 1,
      maxWidth: 100,
    });
    const b = makeFixedChild(60, 40, { display: "flex", flexGrow: 1 });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedWidth).toBeLessThanOrEqual(100);
  });
});

// ── Percentage Units ──

describe("Percentage units", () => {
  test("width: 50% resolves against parent content box", () => {
    const root = makeContainer(400, 200, {
      display: "flex",
      flexDirection: "row",
      padding: [0, 0, 0, 0],
    });
    const a = makeFixedChild(0, 40, {
      display: "flex",
      width: "50%" as LayoutUnit,
    });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedWidth).toBe(200);
  });
});

// ── Anchor Layout ──

describe("Anchor layout", () => {
  test("top/left positions element", () => {
    const root = makeContainer(400, 300, { display: "flex" });
    const a = makeFixedChild(80, 60, {
      display: "anchor",
      top: 20,
      left: 30,
    });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedX).toBe(30);
    expect(ldA.computedY).toBe(20);
    expect(ldA.computedWidth).toBe(80);
    expect(ldA.computedHeight).toBe(60);
  });

  test("right/bottom positions from edges", () => {
    const root = makeContainer(400, 300, { display: "flex" });
    const a = makeFixedChild(80, 60, {
      display: "anchor",
      right: 20,
      bottom: 30,
    });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedX).toBe(300); // 400 - 20 - 80
    expect(ldA.computedY).toBe(210); // 300 - 30 - 60
  });

  test("opposing anchors stretch element", () => {
    const root = makeContainer(400, 300, { display: "flex" });
    const a = makeChild({
      display: "anchor",
      left: 20,
      right: 30,
      top: 10,
      bottom: 15,
    });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedX).toBe(20);
    expect(ldA.computedY).toBe(10);
    expect(ldA.computedWidth).toBe(350); // 400 - 20 - 30
    expect(ldA.computedHeight).toBe(275); // 300 - 10 - 15
  });

  test("anchor with percentage", () => {
    const root = makeContainer(400, 200, { display: "flex" });
    const a = makeFixedChild(80, 60, {
      display: "anchor",
      top: "10%" as LayoutUnit,
      left: "25%" as LayoutUnit,
    });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedX).toBe(100); // 25% of 400
    expect(ldA.computedY).toBe(20); // 10% of 200
  });

  test("anchor with margin acts as inset", () => {
    const root = makeContainer(400, 300, { display: "flex" });
    const a = makeChild({
      display: "anchor",
      left: 10,
      right: 10,
      margin: [5, 5, 5, 5],
    });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    // Left = 10 + 5 margin, right = 10 + 5 margin
    expect(ldA.computedX).toBe(15);
    expect(ldA.computedWidth).toBe(370); // 400 - 15 - 15
  });
});

// ── Manual Mode ──

describe("Manual mode", () => {
  test("manual children are skipped by flex layout", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const manual = makeFixedChild(80, 40); // default display: manual
    manual.x = 200;
    manual.y = 50;
    const flex = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(manual);
    root.addChild(flex);

    runLayout(root);

    const ldFlex = getLayoutData(flex);
    // Flex child should start at 0, not be affected by manual child
    expect(ldFlex.computedX).toBe(0);
  });
});

// ── Flex Wrap ──

describe("Flex wrap", () => {
  test("items wrap to new line when overflowing", () => {
    const root = makeContainer(200, 300, {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
    });
    const a = makeFixedChild(120, 40, { display: "flex" });
    const b = makeFixedChild(120, 40, { display: "flex" });
    root.addChild(a);
    root.addChild(b);

    runLayout(root);

    const ldA = getLayoutData(a);
    const ldB = getLayoutData(b);

    // A fits on first line, B wraps to second line
    expect(ldA.computedY).toBe(0);
    expect(ldB.computedY).toBe(150); // Second line starts at half height
  });
});

// ── Nested Flex ──

describe("Nested flex", () => {
  test("flex column inside flex row", () => {
    const root = makeContainer(400, 200, {
      display: "flex",
      flexDirection: "row",
    });

    const left = makeContainer(200, 200, {
      display: "flex",
      flexDirection: "column",
      width: 200,
      height: 200,
    });

    const top = makeFixedChild(200, 60, { display: "flex" });
    const bottom = makeFixedChild(200, 60, { display: "flex" });
    left.addChild(top);
    left.addChild(bottom);

    const right = makeFixedChild(200, 200, {
      display: "flex",
      width: 200,
      height: 200,
    });

    root.addChild(left);
    root.addChild(right);

    runLayout(root);

    // Left container should be positioned at x=0
    const ldLeft = getLayoutData(left);
    expect(ldLeft.computedX).toBe(0);

    // Right should be at x=200
    const ldRight = getLayoutData(right);
    expect(ldRight.computedX).toBe(200);

    // Inside left: top at y=0, bottom at y=60
    // Need to run layout on the inner container too
    resolveLayout(left);
    const ldTop = getLayoutData(top);
    const ldBottom = getLayoutData(bottom);
    expect(ldTop.computedY).toBe(0);
    expect(ldBottom.computedY).toBe(60);
  });
});

// ── Zero-size handling ──

describe("Edge cases", () => {
  test("zero-size elements do not cause errors", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(0, 0, { display: "flex" });
    const b = makeFixedChild(60, 40, { display: "flex" });
    root.addChild(a);
    root.addChild(b);

    expect(() => runLayout(root)).not.toThrow();

    const ldB = getLayoutData(b);
    expect(ldB.computedX).toBe(0);
    expect(ldB.computedWidth).toBe(60);
  });

  test("empty container layout does not throw", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    expect(() => runLayout(root)).not.toThrow();
  });

  test("single child fills with flexGrow", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(0, 40, {
      display: "flex",
      flexGrow: 1,
      flexBasis: 0,
    });
    root.addChild(a);

    runLayout(root);

    const ldA = getLayoutData(a);
    expect(ldA.computedWidth).toBe(300);
  });

  test("layout data is retrievable for any element", () => {
    const el = new Element();
    const ld = getLayoutData(el);
    expect(ld).toBeDefined();
    expect(ld.computedWidth).toBe(0);
  });
});

// ── Container update integration ──

describe("Container update integration", () => {
  test("layout runs during update when Layout flag is set", () => {
    const root = makeContainer(300, 100, {
      display: "flex",
      flexDirection: "row",
    });
    const a = makeFixedChild(60, 40, { display: "flex", flexGrow: 1 });
    root.addChild(a);
    root.invalidate(DirtyFlags.Layout);

    root.update(0.016);

    // After update, the child should have its position set
    // Layout resolver sets x/y/width/height via setters
    expect(a.width).toBe(300);
  });
});

// ── Performance: layout boundary ──

describe("Layout boundaries", () => {
  test("fixed-size container acts as layout boundary", () => {
    const root = makeContainer(400, 300, {
      display: "flex",
      flexDirection: "column",
    });
    const fixed = makeContainer(400, 100, {
      display: "flex",
      flexDirection: "row",
      width: 400,
      height: 100,
    });
    const inner = makeFixedChild(60, 40, { display: "flex", flexGrow: 1 });
    fixed.addChild(inner);
    root.addChild(fixed);

    runLayout(root);
    resolveLayout(fixed);

    const ldInner = getLayoutData(inner);
    expect(ldInner.computedWidth).toBe(400);
  });
});
