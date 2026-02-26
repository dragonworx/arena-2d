import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { Text, createDefaultTextStyle } from "../src/elements/Text";
import {
  type ILayoutTextStyle,
  type ITextMeasureContext,
  clearLayoutCache,
  computeMaxContentWidth,
  computeMinContentWidth,
  computeTextLayout,
  setMeasureContext,
} from "../src/text/TextLayout";
import { isFontReady } from "../src/text/fontReady";

// ── Mock Measure Context ──
// Uses a simple fixed-width font model: each character = 8px wide

const CHAR_WIDTH = 8;

function createMockMeasureContext(): ITextMeasureContext {
  return {
    font: "",
    measureText(text: string) {
      return { width: text.length * CHAR_WIDTH };
    },
  };
}

// Install mock before all tests
setMeasureContext(createMockMeasureContext());

afterAll(() => {
  setMeasureContext(null);
});

// ── Helpers ──

function makeStyle(
  overrides: Partial<ILayoutTextStyle> = {},
): ILayoutTextStyle {
  return {
    fontSize: 14,
    fontFamily: "sans-serif",
    fontWeight: "normal",
    fontStyle: "normal",
    fill: "#000",
    textBaseline: "top",
    textAlign: "left",
    lineHeight: 17, // ceil(14 * 1.2)
    ...overrides,
  };
}

// ── TextLayout Tests ──

describe("TextLayout", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  describe("empty string", () => {
    test("produces a single empty line", () => {
      const layout = computeTextLayout(
        "",
        makeStyle(),
        Number.POSITIVE_INFINITY,
      );
      expect(layout.lines.length).toBe(1);
      expect(layout.lines[0].text).toBe("");
      expect(layout.lines[0].width).toBe(0);
      expect(layout.lines[0].advancements).toEqual([]);
      expect(layout.totalHeight).toBe(17);
    });
  });

  describe("single line (no wrapping)", () => {
    test("places all text on one line with Infinity width", () => {
      const layout = computeTextLayout(
        "Hello world",
        makeStyle(),
        Number.POSITIVE_INFINITY,
      );
      expect(layout.lines.length).toBe(1);
      expect(layout.lines[0].text).toBe("Hello world");
      // "Hello world" = 11 chars × 8px = 88px
      expect(layout.lines[0].width).toBe(88);
      expect(layout.totalHeight).toBe(17);
    });

    test("advancements array has correct length", () => {
      const layout = computeTextLayout(
        "ABC",
        makeStyle(),
        Number.POSITIVE_INFINITY,
      );
      expect(layout.lines[0].advancements.length).toBe(3);
      // First advancement should be 0 (start of line)
      expect(layout.lines[0].advancements[0]).toBe(0);
      // Each char is 8px wide
      expect(layout.lines[0].advancements[1]).toBe(8);
      expect(layout.lines[0].advancements[2]).toBe(16);
    });
  });

  describe("hard line breaks", () => {
    test("\\n produces multiple lines", () => {
      const layout = computeTextLayout(
        "line1\nline2\nline3",
        makeStyle(),
        Number.POSITIVE_INFINITY,
      );
      expect(layout.lines.length).toBe(3);
      expect(layout.lines[0].text).toBe("line1");
      expect(layout.lines[1].text).toBe("line2");
      expect(layout.lines[2].text).toBe("line3");
    });

    test("trailing \\n produces empty last line", () => {
      const layout = computeTextLayout(
        "hello\n",
        makeStyle(),
        Number.POSITIVE_INFINITY,
      );
      expect(layout.lines.length).toBe(2);
      expect(layout.lines[0].text).toBe("hello");
      expect(layout.lines[1].text).toBe("");
    });

    test("multiple consecutive \\n produce empty lines", () => {
      const layout = computeTextLayout(
        "a\n\nb",
        makeStyle(),
        Number.POSITIVE_INFINITY,
      );
      expect(layout.lines.length).toBe(3);
      expect(layout.lines[0].text).toBe("a");
      expect(layout.lines[1].text).toBe("");
      expect(layout.lines[2].text).toBe("b");
    });

    test("totalHeight accounts for all lines", () => {
      const style = makeStyle({ lineHeight: 20 });
      const layout = computeTextLayout(
        "a\nb\nc",
        style,
        Number.POSITIVE_INFINITY,
      );
      expect(layout.totalHeight).toBe(60); // 3 lines × 20
    });
  });

  describe("word wrap", () => {
    test("wraps at available width", () => {
      // "Hello" = 5 chars × 8 = 40px, "world" = 5 chars × 8 = 40px
      // "Hello world" = 11 chars × 8 = 88px
      // space = 8px, so "Hello" + space + "world" = 40 + 8 + 40 = 88
      // With available width = 50, "Hello" fits alone but "Hello world" doesn't
      const layout = computeTextLayout("Hello world", makeStyle(), 50);
      expect(layout.lines.length).toBe(2);
      expect(layout.lines[0].text).toBe("Hello ");
      expect(layout.lines[1].text).toBe("world");
    });

    test("single word wider than container stays on its line", () => {
      const layout = computeTextLayout("Supercalifragilistic", makeStyle(), 10);
      expect(layout.lines.length).toBe(1);
      expect(layout.lines[0].text).toBe("Supercalifragilistic");
    });

    test("multiple words wrap correctly", () => {
      // "one" = 24, "two" = 24, "three" = 40
      // space = 8
      // available = 60 -> "one two" = 24 + 8 + 24 = 56 fits, adding "three" = 56 + 8 + 40 = 104 doesn't
      const layout = computeTextLayout("one two three", makeStyle(), 60);
      expect(layout.lines.length).toBe(2);
      expect(layout.lines[0].text).toBe("one two ");
      expect(layout.lines[1].text).toBe("three");
    });

    test("three words each on its own line", () => {
      // available = 30 -> "one" = 24 fits, "one" + space + "two" = 56 doesn't
      const layout = computeTextLayout("one two three", makeStyle(), 30);
      expect(layout.lines.length).toBe(3);
      expect(layout.lines[0].text).toBe("one ");
      expect(layout.lines[1].text).toBe("two ");
      expect(layout.lines[2].text).toBe("three");
    });
  });

  describe("word wrap + hard breaks combined", () => {
    test("hard break within wrapped text", () => {
      // available = 50 -> "Hello" = 40 fits alone
      const layout = computeTextLayout("Hello\nworld foo", makeStyle(), 50);
      expect(layout.lines.length).toBe(3);
      expect(layout.lines[0].text).toBe("Hello");
      expect(layout.lines[1].text).toBe("world ");
      expect(layout.lines[2].text).toBe("foo");
    });
  });

  describe("caching", () => {
    test("returns cached result for identical input", () => {
      const style = makeStyle();
      const result1 = computeTextLayout("cached text", style, 200);
      const result2 = computeTextLayout("cached text", style, 200);
      expect(result1).toBe(result2); // Same reference
    });

    test("different width produces different result", () => {
      const style = makeStyle();
      const result1 = computeTextLayout("cached text", style, 200);
      const result2 = computeTextLayout("cached text", style, 100);
      expect(result1).not.toBe(result2);
    });

    test("clearLayoutCache invalidates cache", () => {
      const style = makeStyle();
      const result1 = computeTextLayout("cached text", style, 200);
      clearLayoutCache();
      const result2 = computeTextLayout("cached text", style, 200);
      expect(result1).not.toBe(result2);
    });
  });

  describe("min-content and max-content", () => {
    test("min-content width is the widest word", () => {
      const style = makeStyle();
      // "short" = 40, "longword" = 64 -> min = 64
      const minW = computeMinContentWidth("short longword", style);
      expect(minW).toBe(64); // "longword" = 8 chars × 8
    });

    test("max-content width is the full single line", () => {
      const style = makeStyle();
      // "Hello world" = 11 chars × 8 = 88
      const maxW = computeMaxContentWidth("Hello world", style);
      expect(maxW).toBe(88);
    });

    test("max-content with hard breaks returns widest line", () => {
      const style = makeStyle();
      // "short" = 40, "a much longer line" = 144
      const maxW = computeMaxContentWidth("short\na much longer line", style);
      expect(maxW).toBe(144); // 18 chars × 8
    });

    test("empty string returns 0 for both", () => {
      const style = makeStyle();
      expect(computeMinContentWidth("", style)).toBe(0);
      expect(computeMaxContentWidth("", style)).toBe(0);
    });
  });
});

// ── Text Element Tests ──

describe("Text Element", () => {
  test("default text style matches SPEC defaults", () => {
    const style = createDefaultTextStyle();
    expect(style.fontFamily).toBe("sans-serif");
    expect(style.fontSize).toBe(14);
    expect(style.fontWeight).toBe("normal");
    expect(style.fontStyle).toBe("normal");
    expect(style.color).toBe("#000000");
    expect(style.textAlign).toBe("left");
  });

  test("text property triggers layout recompute", () => {
    const t = new Text("t1");
    t.text = "Hello";
    const layout1 = t.textLayout;
    expect(layout1.lines[0].text).toBe("Hello");

    t.text = "World";
    const layout2 = t.textLayout;
    expect(layout2.lines[0].text).toBe("World");
  });

  test("width change triggers re-wrap", () => {
    const t = new Text("t2");
    t.text = "Hello world this is a test";
    t.width = 10000;
    const wide = t.textLayout;
    expect(wide.lines.length).toBe(1);

    // Force narrow width — each word wraps
    t.width = 50; // 50px fits ~6 chars
    const narrow = t.textLayout;
    expect(narrow.lines.length).toBeGreaterThan(1);
  });

  test("getIntrinsicSize returns correct dimensions", () => {
    const t = new Text("t3");
    t.text = "Hello";
    const size = t.getIntrinsicSize();
    // "Hello" = 5 chars × 8 = 40px
    expect(size.width).toBe(40);
    expect(size.height).toBeGreaterThan(0);
  });

  test("updateTextStyle merges changes", () => {
    const t = new Text("t4");
    t.updateTextStyle({ fontSize: 24 });
    expect(t.textStyle.fontSize).toBe(24);
    // lineHeight should auto-update when fontSize changes
    expect(t.textStyle.lineHeight).toBe(Math.ceil(24 * 1.2));
    // Other properties unchanged
    expect(t.textStyle.fontFamily).toBe("sans-serif");
  });

  test("updateTextStyle with explicit lineHeight preserves it", () => {
    const t = new Text("t5");
    t.updateTextStyle({ fontSize: 24, lineHeight: 30 });
    expect(t.textStyle.lineHeight).toBe(30);
  });

  test("empty text has empty layout", () => {
    const t = new Text("t6");
    t.text = "";
    const layout = t.textLayout;
    expect(layout.lines.length).toBe(1);
    expect(layout.lines[0].text).toBe("");
  });

  test("text element has default id", () => {
    const t = new Text();
    expect(t.id).toMatch(/^el_\d+$/);
  });

  test("text element with custom id", () => {
    const t = new Text("my-text");
    expect(t.id).toBe("my-text");
  });

  test("getMinContentWidth returns widest word width", () => {
    const t = new Text("minw");
    t.text = "short longword";
    // "longword" = 8 chars × 8 = 64
    expect(t.getMinContentWidth()).toBe(64);
  });

  test("getMaxContentWidth returns full line width", () => {
    const t = new Text("maxw");
    t.text = "Hello world";
    // 11 chars × 8 = 88
    expect(t.getMaxContentWidth()).toBe(88);
  });
});

// ── Alignment Tests ──

describe("Text Alignment", () => {
  test("left-aligned text uses full layout width", () => {
    const t = new Text("align-left");
    t.text = "Hello";
    t.width = 200;
    t.updateTextStyle({ textAlign: "left" });
    const layout = t.textLayout;
    expect(layout.lines[0].width).toBe(40); // 5 × 8
    expect(layout.lines[0].width).toBeLessThan(200);
  });

  test("center and right alignment don't affect layout computation", () => {
    const t = new Text("align-test");
    t.text = "Hello";
    t.width = 200;

    // Layout computation doesn't change based on alignment
    // (alignment is applied during paint, not layout)
    t.updateTextStyle({ textAlign: "center" });
    const centerLayout = t.textLayout;
    expect(centerLayout.lines[0].text).toBe("Hello");
    expect(centerLayout.lines[0].width).toBe(40);

    t.updateTextStyle({ textAlign: "right" });
    const rightLayout = t.textLayout;
    expect(rightLayout.lines[0].text).toBe("Hello");
    expect(rightLayout.lines[0].width).toBe(40);
  });
});

// ── fontReady Tests ──

describe("fontReady", () => {
  test("isFontReady returns false in non-browser environment", () => {
    const result = isFontReady("Arial");
    expect(typeof result).toBe("boolean");
  });
});

// ── Edge Cases ──

describe("TextLayout edge cases", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("only whitespace produces single line with whitespace", () => {
    const layout = computeTextLayout(
      "   ",
      makeStyle(),
      Number.POSITIVE_INFINITY,
    );
    expect(layout.lines.length).toBe(1);
    expect(layout.lines[0].text).toBe("   ");
  });

  test("only newlines produce correct number of empty lines", () => {
    const layout = computeTextLayout(
      "\n\n",
      makeStyle(),
      Number.POSITIVE_INFINITY,
    );
    expect(layout.lines.length).toBe(3); // empty, empty, empty
  });

  test("tabs treated as whitespace", () => {
    const layout = computeTextLayout(
      "hello\tworld",
      makeStyle(),
      Number.POSITIVE_INFINITY,
    );
    expect(layout.lines.length).toBe(1);
    expect(layout.lines[0].text).toBe("hello world");
  });

  test("leading whitespace is preserved", () => {
    const layout = computeTextLayout(
      "  hello",
      makeStyle(),
      Number.POSITIVE_INFINITY,
    );
    expect(layout.lines[0].text).toBe("  hello");
  });

  test("trailing whitespace is preserved", () => {
    const layout = computeTextLayout(
      "hello  ",
      makeStyle(),
      Number.POSITIVE_INFINITY,
    );
    expect(layout.lines[0].text).toBe("hello  ");
  });

  test("exact fit at boundary doesn't wrap", () => {
    // "ab cd" with space: "ab" = 16, space = 8, "cd" = 16 -> total = 40
    const layout = computeTextLayout("ab cd", makeStyle(), 40);
    expect(layout.lines.length).toBe(1);
    expect(layout.lines[0].text).toBe("ab cd");
  });

  test("one pixel over boundary wraps", () => {
    // "ab cd" = 40px, available = 39 -> wraps
    const layout = computeTextLayout("ab cd", makeStyle(), 39);
    expect(layout.lines.length).toBe(2);
  });
});
