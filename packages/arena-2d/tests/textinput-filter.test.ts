import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { TextInput } from "../src/elements/TextInput";
import {
  type ITextMeasureContext,
  clearLayoutCache,
  setMeasureContext,
} from "../src/text/TextLayout";

const CHAR_WIDTH = 8;

function createMockMeasureContext(): ITextMeasureContext {
  return {
    font: "",
    measureText(text: string) {
      return { width: text.length * CHAR_WIDTH };
    },
  };
}

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

describe("TextInput — filtering", () => {
  beforeEach(() => {
    clearLayoutCache();
  });

  test("RegExp filter — allows valid input", () => {
    const input = new TextInput();
    input.filter = /^\d*$/; // Numbers only
    input._insertText("123");
    expect(input.text).toBe("123");
  });

  test("RegExp filter — rejects invalid input", () => {
    const input = new TextInput();
    input.filter = /^\d*$/; // Numbers only
    input._insertText("123");
    input._insertText("a");
    expect(input.text).toBe("123");
  });

  test("Function filter (boolean) — allows valid input", () => {
    const input = new TextInput();
    input.filter = (val) => val.length <= 5;
    input._insertText("abc");
    expect(input.text).toBe("abc");
  });

  test("Function filter (boolean) — rejects invalid input", () => {
    const input = new TextInput();
    input.filter = (val) => val.length <= 5;
    input._insertText("abcde");
    input._insertText("f");
    expect(input.text).toBe("abcde");
  });

  test("Function filter (string) — transforms input", () => {
    const input = new TextInput();
    input.filter = (val) => val.toUpperCase();
    input._insertText("abc");
    expect(input.text).toBe("ABC");
  });

  test("filtering applies in _setText", () => {
    const input = new TextInput();
    input.filter = /^\d*$/;
    // @ts-ignore - testing private method
    input._setText("123");
    expect(input.text).toBe("123");
    // @ts-ignore - testing private method
    input._setText("abc");
    expect(input.text).toBe("123");
  });
});
