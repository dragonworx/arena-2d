import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { TextInput } from "../src/elements/TextInput";
import {
  type ITextMeasureContext,
  clearLayoutCache,
  setMeasureContext,
} from "../src/text/TextLayout";

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

const window = new Window();
// biome-ignore lint/suspicious/noExplicitAny: mocking global
global.document = window.document as any;
// biome-ignore lint/suspicious/noExplicitAny: mocking global
global.Event = window.Event as any;
// biome-ignore lint/suspicious/noExplicitAny: mocking global
global.KeyboardEvent = window.KeyboardEvent as any;
// biome-ignore lint/suspicious/noExplicitAny: mocking global
global.MouseEvent = window.MouseEvent as any;
// biome-ignore lint/suspicious/noExplicitAny: mocking global
global.CompositionEvent = window.CompositionEvent as any;
// biome-ignore lint/suspicious/noExplicitAny: mocking global
global.ClipboardEvent = window.ClipboardEvent as any;

afterAll(() => {
  setMeasureContext(null);
});

function makeInput(
  text = "",
  opts: Partial<{
    width: number;
    multiline: boolean;
    maxLength: number;
    isPassword: boolean;
    readOnly: boolean;
    placeholder: string;
  }> = {},
): TextInput {
  const input = new TextInput();
  if (opts.width !== undefined) input.width = opts.width;
  if (opts.multiline !== undefined) input.multiline = opts.multiline;
  if (opts.maxLength !== undefined) input.maxLength = opts.maxLength;
  if (opts.isPassword !== undefined) input.isPassword = opts.isPassword;
  if (opts.readOnly !== undefined) input.readOnly = opts.readOnly;
  if (opts.placeholder !== undefined) input.placeholder = opts.placeholder;
  input.text = text;
  return input;
}

// ── Basic Properties ──

describe("TextInput — basic properties", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("default properties", () => {
    const input = new TextInput();
    expect(input.text).toBe("");
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(0);
    expect(input.isPassword).toBe(false);
    expect(input.placeholder).toBe("");
    expect(input.readOnly).toBe(false);
    expect(input.maxLength).toBe(Number.POSITIVE_INFINITY);
    expect(input.multiline).toBe(false);
    expect(input.focusable).toBe(true);
    expect(input.cursor).toBe("text");
  });

  test("selectionStart/selectionEnd clamp to text length", () => {
    const input = makeInput("Hello");
    input.selectionEnd = 100;
    expect(input.selectionEnd).toBe(5);
    input.selectionStart = -5;
    expect(input.selectionStart).toBe(0);
  });

  test("hasSelection returns true when start !== end", () => {
    const input = makeInput("Hello");
    expect(input.hasSelection).toBe(false);
    input.selectionStart = 0;
    input.selectionEnd = 3;
    expect(input.hasSelection).toBe(true);
  });

  test("selectedText returns correct substring", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 0;
    input.selectionEnd = 5;
    expect(input.selectedText).toBe("Hello");
  });

  test("selectedText works with reversed selection", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 5;
    input.selectionEnd = 0;
    expect(input.selectedText).toBe("Hello");
  });

  test("selectAll selects entire text", () => {
    const input = makeInput("Hello");
    input.selectAll();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(5);
  });
});

// ── Text Insertion ──

describe("TextInput — text insertion", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("insertText at cursor position", () => {
    const input = makeInput("Hello");
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input._insertText(" world");
    expect(input.text).toBe("Hello world");
    expect(input.selectionEnd).toBe(11);
  });

  test("insertText replaces selection", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 0;
    input.selectionEnd = 5;
    input._insertText("Goodbye");
    expect(input.text).toBe("Goodbye world");
  });

  test("insertText respects maxLength", () => {
    const input = makeInput("Hello", { maxLength: 10 });
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input._insertText(" world and more");
    expect(input.text.length).toBeLessThanOrEqual(10);
  });

  test("insertText strips newlines in single-line mode", () => {
    const input = makeInput("Hello");
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input._insertText("\nworld");
    expect(input.text).toBe("Helloworld");
  });

  test("insertText keeps newlines in multiline mode", () => {
    const input = makeInput("Hello", { multiline: true });
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input._insertText("\nworld");
    expect(input.text).toBe("Hello\nworld");
  });

  test("insertText does nothing when readOnly", () => {
    const input = makeInput("Hello", { readOnly: true });
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input._insertText(" world");
    expect(input.text).toBe("Hello");
  });

  test("insertText emits change event", () => {
    const input = makeInput("Hello");
    let changed = false;
    input.on("change", () => {
      changed = true;
    });
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input._insertText("!");
    expect(changed).toBe(true);
  });
});

// ── Cursor Movement ──

describe("TextInput — cursor movement", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("arrow left moves cursor left by one", () => {
    const input = makeInput("Hello");
    input.selectionStart = 3;
    input.selectionEnd = 3;
    // Simulate ArrowLeft keydown
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowLeft",
      code: "ArrowLeft",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(2);
    expect(input.selectionStart).toBe(2);
  });

  test("arrow right moves cursor right by one", () => {
    const input = makeInput("Hello");
    input.selectionStart = 2;
    input.selectionEnd = 2;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowRight",
      code: "ArrowRight",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(3);
    expect(input.selectionStart).toBe(3);
  });

  test("arrow left at position 0 stays at 0", () => {
    const input = makeInput("Hello");
    input.selectionStart = 0;
    input.selectionEnd = 0;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowLeft",
      code: "ArrowLeft",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(0);
  });

  test("arrow right at end stays at end", () => {
    const input = makeInput("Hello");
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowRight",
      code: "ArrowRight",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(5);
  });

  test("shift+arrow right extends selection", () => {
    const input = makeInput("Hello");
    input.selectionStart = 0;
    input.selectionEnd = 0;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowRight",
      code: "ArrowRight",
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(1);
    expect(input.hasSelection).toBe(true);
  });

  test("shift+arrow left extends selection backward", () => {
    const input = makeInput("Hello");
    input.selectionStart = 3;
    input.selectionEnd = 3;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowLeft",
      code: "ArrowLeft",
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(2);
    expect(input.hasSelection).toBe(true);
  });

  test("arrow left collapses selection to start", () => {
    const input = makeInput("Hello");
    input.selectionStart = 1;
    input.selectionEnd = 4;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowLeft",
      code: "ArrowLeft",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(1);
  });

  test("arrow right collapses selection to end", () => {
    const input = makeInput("Hello");
    input.selectionStart = 1;
    input.selectionEnd = 4;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowRight",
      code: "ArrowRight",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionStart).toBe(4);
    expect(input.selectionEnd).toBe(4);
  });

  test("double click selects word", () => {
    const input = makeInput("Hello world foo");
    // Click on "world" (char index 8)
    input.emit("dblclick", { localX: 8 * CHAR_WIDTH, localY: 5 });
    expect(input.selectionStart).toBe(6);
    expect(input.selectionEnd).toBe(11);
  });

  test("pointer down/move/up drag selection", () => {
    const input = makeInput("Hello world");
    // Start at "H"
    input.emit("pointerdown", { localX: 0, localY: 5 });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(0);

    // Drag to "o" in "Hello"
    input.emit("pointermove", { localX: 4.5 * CHAR_WIDTH, localY: 5 });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(5);

    // Drag to "w" in "world"
    input.emit("pointermove", { localX: 7 * CHAR_WIDTH, localY: 5 });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(7);

    input.emit("pointerup", {});
    // Simulating the 'click' event that follows pointerup in InteractionManager
    input.emit("click", { localX: 7 * CHAR_WIDTH, localY: 5 });
    expect(input.selectionEnd).toBe(7);

    // Move after up should not change selection
    input.emit("pointermove", { localX: 10 * CHAR_WIDTH, localY: 5 });
    expect(input.selectionEnd).toBe(7);
  });

  test("caret is visible immediately after movement", () => {
    const input = makeInput("Hello world");
    input.emit("focus", {});
    // biome-ignore lint/suspicious/noExplicitAny: testing private state
    expect((input as any)._isFocused).toBe(true);
    // Force caret to invisible state (mocking a blink)
    // biome-ignore lint/suspicious/noExplicitAny: testing private state
    (input as any)._caretVisible = false;
    // biome-ignore lint/suspicious/noExplicitAny: testing private state
    expect((input as any)._caretVisible).toBe(false);

    // Move cursor
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowRight",
      code: "ArrowRight",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      // biome-ignore lint/suspicious/noExplicitAny: mocking event
    } as any);

    // biome-ignore lint/suspicious/noExplicitAny: testing private state
    expect((input as any)._caretVisible).toBe(true);
  });
});

// ── Word jumps (Option/Alt + Arrow) ──

describe("TextInput — word jumps", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("getWordBoundaryLeft jumps to word start", () => {
    const input = makeInput("Hello world foo");
    // From middle of "world" (pos 8)
    expect(input._getWordBoundaryLeft(8)).toBe(6);
    // From start of "world" (pos 6)
    expect(input._getWordBoundaryLeft(6)).toBe(0);
    // From end
    expect(input._getWordBoundaryLeft(15)).toBe(12);
  });

  test("getWordBoundaryRight jumps to word end", () => {
    const input = makeInput("Hello world foo");
    // From start
    expect(input._getWordBoundaryRight(0)).toBe(5);
    // From "world" start (pos 6)
    expect(input._getWordBoundaryRight(6)).toBe(11);
  });

  test("getWordBoundaryLeft at position 0 returns 0", () => {
    const input = makeInput("Hello");
    expect(input._getWordBoundaryLeft(0)).toBe(0);
  });

  test("getWordBoundaryRight at end returns length", () => {
    const input = makeInput("Hello");
    expect(input._getWordBoundaryRight(5)).toBe(5);
  });

  test("alt+arrow left moves cursor to word boundary", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 8;
    input.selectionEnd = 8;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowLeft",
      code: "ArrowLeft",
      shiftKey: false,
      ctrlKey: false,
      altKey: true,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(6);
  });

  test("alt+arrow right moves cursor to next word boundary", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 0;
    input.selectionEnd = 0;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowRight",
      code: "ArrowRight",
      shiftKey: false,
      ctrlKey: false,
      altKey: true,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(5);
  });
});

// ── Line navigation (Cmd/Meta + Arrow) ──

describe("TextInput — line navigation", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("cmd+left moves to line start", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowLeft",
      code: "ArrowLeft",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: true,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(0);
  });

  test("cmd+right moves to line end", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 2;
    input.selectionEnd = 2;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowRight",
      code: "ArrowRight",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: true,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(11);
  });

  test("cmd+up moves to start of text", () => {
    const input = makeInput("Hello\nworld", { multiline: true, width: 1000 });
    input.selectionStart = 8;
    input.selectionEnd = 8;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowUp",
      code: "ArrowUp",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: true,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(0);
  });

  test("cmd+down moves to end of text", () => {
    const input = makeInput("Hello\nworld", { multiline: true, width: 1000 });
    input.selectionStart = 2;
    input.selectionEnd = 2;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowDown",
      code: "ArrowDown",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: true,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(11);
  });

  test("shift+cmd+right extends selection to line end", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 3;
    input.selectionEnd = 3;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowRight",
      code: "ArrowRight",
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      metaKey: true,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(11);
    expect(input.hasSelection).toBe(true);
  });
});

// ── Backspace / Delete ──

describe("TextInput — backspace / delete", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("backspace deletes character before cursor", () => {
    const input = makeInput("Hello");
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "Backspace",
      code: "Backspace",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("Hell");
    expect(input.selectionEnd).toBe(4);
  });

  test("backspace deletes selection", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 0;
    input.selectionEnd = 6;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "Backspace",
      code: "Backspace",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("world");
    expect(input.selectionEnd).toBe(0);
  });

  test("delete removes character after cursor", () => {
    const input = makeInput("Hello");
    input.selectionStart = 0;
    input.selectionEnd = 0;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "Delete",
      code: "Delete",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("ello");
    expect(input.selectionEnd).toBe(0);
  });

  test("alt+backspace deletes word before cursor", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 11;
    input.selectionEnd = 11;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "Backspace",
      code: "Backspace",
      shiftKey: false,
      ctrlKey: false,
      altKey: true,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("Hello ");
    expect(input.selectionEnd).toBe(6);
  });

  test("backspace at position 0 does nothing", () => {
    const input = makeInput("Hello");
    input.selectionStart = 0;
    input.selectionEnd = 0;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "Backspace",
      code: "Backspace",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("Hello");
  });

  test("delete at end does nothing", () => {
    const input = makeInput("Hello");
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "Delete",
      code: "Delete",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("Hello");
  });
});

// ── Character Input ──

describe("TextInput — character input", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("typing a character inserts it at cursor", () => {
    const input = makeInput("Hello");
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "!",
      code: "Digit1",
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("Hello!");
  });

  test("typing replaces selection", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 5;
    input.selectionEnd = 11;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "!",
      code: "Digit1",
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("Hello!");
  });
});

// ── Enter Key ──

describe("TextInput — enter key", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("enter on single-line emits submit", () => {
    const input = makeInput("Hello");
    let submitted = false;
    let submittedValue = "";
    input.on("submit", (e: { value: string }) => {
      submitted = true;
      submittedValue = e.value;
    });
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "Enter",
      code: "Enter",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(submitted).toBe(true);
    expect(submittedValue).toBe("Hello");
    expect(input.text).toBe("Hello"); // text unchanged
  });

  test("enter on multiline inserts newline", () => {
    const input = makeInput("Hello", { multiline: true });
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "Enter",
      code: "Enter",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("Hello\n");
  });
});

// ── Password Mode ──

describe("TextInput — password mode", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("isPassword toggles password masking", () => {
    const input = makeInput("secret");
    input.isPassword = true;
    expect(input.isPassword).toBe(true);
    // The internal display text should be bullets
    // We can't directly test paint output, but we test the property
  });

  test("password copy/cut hides actual text", () => {
    const input = makeInput("secret", { isPassword: true });
    input.selectAll();

    let clipboardText = "";
    const mockEvent = {
      preventDefault: () => {},
      clipboardData: {
        setData: (_type: string, data: string) => {
          clipboardText = data;
        },
      },
      // biome-ignore lint/suspicious/noExplicitAny: testing private method
    } as any;

    // Test Copy
    // biome-ignore lint/suspicious/noExplicitAny: testing private method
    (input as any)._onCopy(mockEvent);
    expect(clipboardText).toBe("••••••");

    // Test Cut
    clipboardText = "";
    // biome-ignore lint/suspicious/noExplicitAny: testing private method
    (input as any)._onCut(mockEvent);
    expect(clipboardText).toBe("••••••");
    expect(input.text).toBe("");
  });

  test("password layout uses fixed character width", () => {
    const input = makeInput("secret", { isPassword: true });
    const layout = input.textLayout;
    const charWidth = Math.ceil(input.textStyle.fontSize * 0.6);

    expect(layout.lines[0].text).toBe("••••••");
    expect(layout.lines[0].width).toBe(6 * charWidth);
    expect(layout.lines[0].advancements).toEqual([
      0,
      charWidth,
      2 * charWidth,
      3 * charWidth,
      4 * charWidth,
      5 * charWidth,
    ]);
  });

  test("password mode preserves actual text", () => {
    const input = makeInput("secret", { isPassword: true });
    expect(input.text).toBe("secret");
    expect(input.selectedText).toBe(""); // no selection yet
    input.selectAll();
    expect(input.selectedText).toBe("secret"); // actual text, not bullets
  });
});

// ── maxLength ──

describe("TextInput — maxLength", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("maxLength prevents insertion beyond limit", () => {
    const input = makeInput("Hello", { maxLength: 8 });
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input._insertText(" world");
    expect(input.text.length).toBeLessThanOrEqual(8);
    expect(input.text).toBe("Hello wo");
  });

  test("maxLength allows insertion up to exact limit", () => {
    const input = makeInput("", { maxLength: 5 });
    input._insertText("Hello");
    expect(input.text).toBe("Hello");
    expect(input.text.length).toBe(5);
  });

  test("maxLength truncates when replacing selection", () => {
    const input = makeInput("Hello", { maxLength: 5 });
    input.selectionStart = 0;
    input.selectionEnd = 5;
    input._insertText("Goodbye world");
    expect(input.text.length).toBeLessThanOrEqual(5);
  });
});

// ── Multiline ──

describe("TextInput — multiline", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("multiline allows newlines", () => {
    const input = makeInput("", { multiline: true });
    input._insertText("line1\nline2");
    expect(input.text).toBe("line1\nline2");
  });

  test("single-line strips newlines", () => {
    const input = makeInput("");
    input._insertText("line1\nline2");
    expect(input.text).toBe("line1line2");
  });

  test("arrow up in multiline moves to previous line", () => {
    const input = makeInput("Hello\nworld", { multiline: true, width: 1000 });
    // Position cursor at "world" (pos 8, second line col 2)
    input.selectionStart = 8;
    input.selectionEnd = 8;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowUp",
      code: "ArrowUp",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    // Should be on first line
    expect(input.selectionEnd).toBeLessThanOrEqual(5);
  });

  test("arrow down in multiline moves to next line", () => {
    const input = makeInput("Hello\nworld", { multiline: true, width: 1000 });
    // Position cursor at "Hello" (pos 2, first line col 2)
    input.selectionStart = 2;
    input.selectionEnd = 2;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowDown",
      code: "ArrowDown",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    // Should be on second line
    expect(input.selectionEnd).toBeGreaterThan(5);
  });
});

// ── ReadOnly ──

describe("TextInput — readOnly", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("readOnly prevents character input", () => {
    const input = makeInput("Hello", { readOnly: true });
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "x",
      code: "KeyX",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("Hello");
  });

  test("readOnly prevents backspace", () => {
    const input = makeInput("Hello", { readOnly: true });
    input.selectionStart = 5;
    input.selectionEnd = 5;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "Backspace",
      code: "Backspace",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.text).toBe("Hello");
  });

  test("readOnly allows navigation", () => {
    const input = makeInput("Hello", { readOnly: true });
    input.selectionStart = 3;
    input.selectionEnd = 3;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "ArrowLeft",
      code: "ArrowLeft",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionEnd).toBe(2);
  });
});

// ── Line/Col helpers ──

describe("TextInput — line and col helpers", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("getLineAndCol for single line", () => {
    const input = makeInput("Hello world", { width: 1000 });
    const { lineIdx, colIdx } = input._getLineAndCol(5);
    expect(lineIdx).toBe(0);
    expect(colIdx).toBe(5);
  });

  test("getLineAndCol for multiline with hard break", () => {
    const input = makeInput("Hello\nworld", { multiline: true, width: 1000 });
    // Position 7 = second line, col 1 ("w" = 0, "o" = 1)
    const { lineIdx, colIdx } = input._getLineAndCol(7);
    expect(lineIdx).toBe(1);
    expect(colIdx).toBe(1);
  });

  test("getCharOffset returns correct offsets", () => {
    const input = makeInput("Hello\nworld", { multiline: true, width: 1000 });
    expect(input._getCharOffset(0)).toBe(0);
    expect(input._getCharOffset(1)).toBe(6); // "Hello" + "\n"
  });

  test("getLineStart returns start of current line", () => {
    const input = makeInput("Hello\nworld", { multiline: true, width: 1000 });
    // Position 8 is on second line
    expect(input._getLineStart(8)).toBe(6);
  });

  test("getLineEnd returns end of current line", () => {
    const input = makeInput("Hello\nworld", { multiline: true, width: 1000 });
    // Position 2 is on first line
    expect(input._getLineEnd(2)).toBe(5);
  });
});

// ── Select All (Cmd+A) ──

describe("TextInput — select all shortcut", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("cmd+a selects all text", () => {
    const input = makeInput("Hello world");
    input.selectionStart = 3;
    input.selectionEnd = 3;
    input.emit("keydown", {
      type: "keydown",
      target: input,
      currentTarget: input,
      key: "a",
      code: "KeyA",
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: true,
      propagationStopped: false,
      defaultPrevented: false,
      stopPropagation() {
        this.propagationStopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(11);
  });
});

// ── Click to position ──

describe("TextInput — click to position cursor", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("charIndexFromLocal positions cursor correctly", () => {
    const input = makeInput("Hello", { width: 200 });
    // Each char is 8px wide. Position 12 (between 'H' and 'e') -> index 1 or 2
    // Mid of char 1 = 8 + 4 = 12, so 12 should be at index 2
    const idx = input._charIndexFromLocal(12, 0);
    expect(idx).toBeGreaterThanOrEqual(1);
    expect(idx).toBeLessThanOrEqual(2);
  });

  test("charIndexFromLocal at start returns 0", () => {
    const input = makeInput("Hello", { width: 200 });
    const idx = input._charIndexFromLocal(0, 0);
    expect(idx).toBe(0);
  });

  test("charIndexFromLocal past end returns text length", () => {
    const input = makeInput("Hello", { width: 200 });
    const idx = input._charIndexFromLocal(200, 0);
    expect(idx).toBe(5);
  });
});

// ── Destroy ──

describe("TextInput — destroy", () => {
  test("destroy cleans up resources", () => {
    const input = new TextInput();
    input.text = "Hello";
    input.destroy();
    // Should not throw
    expect(input.text).toBe("Hello"); // text still accessible after destroy
  });
});
