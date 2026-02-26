import { describe, expect, mock, test } from "bun:test";
import { EventEmitter } from "../src/events/EventEmitter";

describe("EventEmitter", () => {
  test("should register and invoke handlers", () => {
    const emitter = new EventEmitter();
    const handler = mock(() => {});
    const event = { type: "test" };

    emitter.on("test", handler);
    emitter.emit("test", event);

    expect(handler).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(event);
  });

  test("should handle multiple handlers in order", () => {
    const emitter = new EventEmitter();
    const calls: number[] = [];

    emitter.on("test", () => calls.push(1));
    emitter.on("test", () => calls.push(2));
    emitter.on("test", () => calls.push(3));

    emitter.emit("test", {});

    expect(calls).toEqual([1, 2, 3]);
  });

  test("should remove handlers with off()", () => {
    const emitter = new EventEmitter();
    const handler = mock(() => {});

    emitter.on("test", handler);
    emitter.off("test", handler);
    emitter.emit("test", {});

    expect(handler).not.toHaveBeenCalled();
  });

  test("should handle once()", () => {
    const emitter = new EventEmitter();
    const handler = mock(() => {});

    emitter.once("test", handler);
    emitter.emit("test", {});
    emitter.emit("test", {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("should be safe to remove handler during emit", () => {
    const emitter = new EventEmitter();
    const calls: number[] = [];

    const handler1 = () => {
      calls.push(1);
      emitter.off("test", handler1);
    };
    const handler2 = () => calls.push(2);

    emitter.on("test", handler1);
    emitter.on("test", handler2);

    emitter.emit("test", {});

    expect(calls).toEqual([1, 2]);

    calls.length = 0;
    emitter.emit("test", {});
    expect(calls).toEqual([2]);
  });

  test("should be safe to add handler during emit (should not fire in current emit)", () => {
    const emitter = new EventEmitter();
    const calls: number[] = [];

    const handler2 = () => calls.push(2);

    const handler1 = () => {
      calls.push(1);
      emitter.on("test", handler2);
    };

    emitter.on("test", handler1);
    emitter.emit("test", {});

    expect(calls).toEqual([1]); // handler2 added but shouldn't be called this tick

    calls.length = 0;
    emitter.emit("test", {});
    expect(calls).toEqual([1, 2]);
  });

  test("should ignore off() for non-existent handler", () => {
    const emitter = new EventEmitter();
    const handler = mock(() => {});

    emitter.off("test", handler); // Should not throw
    emitter.on("test", handler);
    emitter.off("test", () => {}); // Different handler, should not change anything

    emitter.emit("test", {});
    expect(handler).toHaveBeenCalled();
  });
});
