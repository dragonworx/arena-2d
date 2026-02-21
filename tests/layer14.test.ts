import { describe, expect, test, mock, spyOn } from "bun:test";
import { Element } from "../src/core/Element";
import { Scene } from "../src/core/Scene";
import { Container } from "../src/core/Container";
import { Arena2D } from "../src/Arena2D";

describe("Layer 14 — Error Handling & Debug Mode", () => {
  test("alpha is clamped to [0, 1]", () => {
    const el = new Element();
    el.alpha = 1.5;
    expect(el.alpha).toBe(1);
    el.alpha = -0.5;
    expect(el.alpha).toBe(0);
  });

  test("scale 0 is replaced with Number.EPSILON", () => {
    const el = new Element();
    el.scaleX = 0;
    expect(el.scaleX).toBe(Number.EPSILON);
    el.scaleY = 0;
    expect(el.scaleY).toBe(Number.EPSILON);
  });

  test("invalid dimension values (negative) fallback to 0", () => {
    const el = new Element();
    el.width = -100;
    expect(el.width).toBe(0);
    el.height = -50;
    expect(el.height).toBe(0);
  });

  test("debug mode logs warnings on NaN assignments", () => {
    Arena2D.debug = true;
    const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});
    
    const el = new Element("debug-test");
    el.x = NaN;
    el.scaleX = NaN;
    el.alpha = NaN;
    
    expect(consoleSpy).toHaveBeenCalledTimes(3);
    // expect(consoleSpy).toHaveBeenCalledWith("Arena2D: [debug-test] x set to NaN");
    
    consoleSpy.mockRestore();
    Arena2D.debug = false;
  });

  test("performance warning for high child count without caching", () => {
    Arena2D.debug = true;
    const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});
    
    const parent = new Container("large-container");
    // Threshold is 500, so 501st child should warn
    for (let i = 0; i < 501; i++) {
        parent.addChild(new Element(`child_${i}`));
    }
    
    expect(consoleSpy).toHaveBeenCalled();
    const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0];
    expect(lastCall).toContain("Performance Hint");
    expect(lastCall).toContain("large-container");

    consoleSpy.mockRestore();
    Arena2D.debug = false;
  });

  test("re-parenting auto-removes from old parent", () => {
    const p1 = new Container("p1");
    const p2 = new Container("p2");
    const child = new Element("child");

    p1.addChild(child);
    expect(child.parent).toBe(p1);
    expect(p1.children).toContain(child);

    p2.addChild(child);
    expect(child.parent).toBe(p2);
    expect(p2.children).toContain(child);
    expect(p1.children).not.toContain(child);
  });

  test("removing non-child is no-op", () => {
    const p = new Container("p");
    const stranger = new Element("stranger");
    
    expect(() => p.removeChild(stranger)).not.toThrow();
  });
});
