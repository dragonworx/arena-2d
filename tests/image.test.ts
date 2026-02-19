import { describe, expect, mock, test } from "bun:test";
import { DirtyFlags } from "../src/core/DirtyFlags";
import { Image } from "../src/elements/Image";

// ── Mock CanvasImageSource ──

interface MockImageSource {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

function createMockImage(w: number, h: number): MockImageSource {
  return { width: w, height: h, naturalWidth: w, naturalHeight: h };
}

// ── Mock ArenaContext ──

function createMockCtx() {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  const raw = {
    drawImage: mock((...args: unknown[]) => {
      calls.push({ method: "drawImage", args });
    }),
    globalCompositeOperation: "source-over",
    fillStyle: "",
    fillRect: mock((...args: unknown[]) => {
      calls.push({ method: "fillRect", args });
    }),
  };

  const ctx = {
    raw,
    drawImage: mock(
      (
        image: CanvasImageSource,
        x: number,
        y: number,
        w?: number,
        h?: number,
      ) => {
        if (w !== undefined && h !== undefined) {
          raw.drawImage(image, x, y, w, h);
        } else {
          raw.drawImage(image, x, y);
        }
      },
    ),
    drawImageRegion: mock(
      (
        image: CanvasImageSource,
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        dx: number,
        dy: number,
        dw: number,
        dh: number,
      ) => {
        raw.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
      },
    ),
  };

  return { ctx, raw, calls };
}

// ── Tests ──

describe("Image Element", () => {
  // ── Construction & Defaults ──

  describe("defaults", () => {
    test("source is null by default", () => {
      const img = new Image();
      expect(img.source).toBeNull();
    });

    test("sourceRect is undefined by default", () => {
      const img = new Image();
      expect(img.sourceRect).toBeUndefined();
    });

    test("nineSlice is undefined by default", () => {
      const img = new Image();
      expect(img.nineSlice).toBeUndefined();
    });

    test("tint is undefined by default", () => {
      const img = new Image();
      expect(img.tint).toBeUndefined();
    });
  });

  // ── Property Setters & Dirty Flags ──

  describe("dirty flags", () => {
    test("setting source marks Visual and Layout dirty", () => {
      const img = new Image();
      // biome-ignore lint/complexity/useLiteralKeys: accessing protected field in test
      img["_dirtyFlags"] = DirtyFlags.None;
      const mockSrc = createMockImage(100, 50);
      img.source = mockSrc as unknown as CanvasImageSource;
      expect(img.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
      expect(img.dirtyFlags & DirtyFlags.Layout).toBeTruthy();
    });

    test("setting source to same value does not mark dirty", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 50);
      img.source = mockSrc as unknown as CanvasImageSource;
      // biome-ignore lint/complexity/useLiteralKeys: accessing protected field in test
      img["_dirtyFlags"] = DirtyFlags.None;
      img.source = mockSrc as unknown as CanvasImageSource;
      expect(img.dirtyFlags).toBe(DirtyFlags.None);
    });

    test("setting sourceRect marks Visual dirty", () => {
      const img = new Image();
      // biome-ignore lint/complexity/useLiteralKeys: accessing protected field in test
      img["_dirtyFlags"] = DirtyFlags.None;
      img.sourceRect = { x: 0, y: 0, width: 32, height: 32 };
      expect(img.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
    });

    test("setting nineSlice marks Visual dirty", () => {
      const img = new Image();
      // biome-ignore lint/complexity/useLiteralKeys: accessing protected field in test
      img["_dirtyFlags"] = DirtyFlags.None;
      img.nineSlice = [10, 10, 10, 10];
      expect(img.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
    });

    test("setting tint marks Visual dirty", () => {
      const img = new Image();
      // biome-ignore lint/complexity/useLiteralKeys: accessing protected field in test
      img["_dirtyFlags"] = DirtyFlags.None;
      img.tint = "rgba(255, 0, 0, 0.5)";
      expect(img.dirtyFlags & DirtyFlags.Visual).toBeTruthy();
    });

    test("setting tint to same value does not mark dirty", () => {
      const img = new Image();
      img.tint = "red";
      // biome-ignore lint/complexity/useLiteralKeys: accessing protected field in test
      img["_dirtyFlags"] = DirtyFlags.None;
      img.tint = "red";
      expect(img.dirtyFlags).toBe(DirtyFlags.None);
    });
  });

  // ── Intrinsic Sizing ──

  describe("intrinsic sizing", () => {
    test("null source returns 0x0", () => {
      const img = new Image();
      const size = img.getIntrinsicSize();
      expect(size.width).toBe(0);
      expect(size.height).toBe(0);
    });

    test("returns natural dimensions of source", () => {
      const img = new Image();
      img.source = createMockImage(200, 150) as unknown as CanvasImageSource;
      const size = img.getIntrinsicSize();
      expect(size.width).toBe(200);
      expect(size.height).toBe(150);
    });

    test("returns sourceRect dimensions when set", () => {
      const img = new Image();
      img.source = createMockImage(512, 512) as unknown as CanvasImageSource;
      img.sourceRect = { x: 0, y: 0, width: 64, height: 32 };
      const size = img.getIntrinsicSize();
      expect(size.width).toBe(64);
      expect(size.height).toBe(32);
    });

    test("getMinContentWidth returns intrinsic width", () => {
      const img = new Image();
      img.source = createMockImage(100, 50) as unknown as CanvasImageSource;
      expect(img.getMinContentWidth()).toBe(100);
    });

    test("getMaxContentWidth returns intrinsic width", () => {
      const img = new Image();
      img.source = createMockImage(100, 50) as unknown as CanvasImageSource;
      expect(img.getMaxContentWidth()).toBe(100);
    });

    test("source with only width/height (no naturalWidth)", () => {
      const img = new Image();
      const src = { width: 80, height: 60 };
      img.source = src as unknown as CanvasImageSource;
      const size = img.getIntrinsicSize();
      expect(size.width).toBe(80);
      expect(size.height).toBe(60);
    });
  });

  // ── Paint: Null Source ──

  describe("paint — null source", () => {
    test("does not draw when source is null", () => {
      const img = new Image();
      img.width = 100;
      img.height = 100;
      const { ctx, raw } = createMockCtx();
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);
      expect(raw.drawImage).not.toHaveBeenCalled();
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });
  });

  // ── Paint: Zero Dimensions ──

  describe("paint — zero dimensions", () => {
    test("does not draw when width is 0", () => {
      const img = new Image();
      img.source = createMockImage(100, 100) as unknown as CanvasImageSource;
      img.width = 0;
      img.height = 100;
      const { ctx, raw } = createMockCtx();
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);
      expect(raw.drawImage).not.toHaveBeenCalled();
    });

    test("does not draw when height is 0", () => {
      const img = new Image();
      img.source = createMockImage(100, 100) as unknown as CanvasImageSource;
      img.width = 100;
      img.height = 0;
      const { ctx, raw } = createMockCtx();
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);
      expect(raw.drawImage).not.toHaveBeenCalled();
    });
  });

  // ── Paint: Standard Image ──

  describe("paint — standard image", () => {
    test("draws image at (0,0) with element dimensions", () => {
      const img = new Image();
      const mockSrc = createMockImage(200, 150);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.width = 100;
      img.height = 75;
      const { ctx } = createMockCtx();
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);
      expect(ctx.drawImage).toHaveBeenCalledWith(mockSrc, 0, 0, 100, 75);
    });
  });

  // ── Paint: Source Rect ──

  describe("paint — source rect", () => {
    test("draws from source rect region to element bounds", () => {
      const img = new Image();
      const mockSrc = createMockImage(512, 512);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.sourceRect = { x: 32, y: 64, width: 48, height: 48 };
      img.width = 96;
      img.height = 96;
      const { ctx } = createMockCtx();
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);
      expect(ctx.drawImageRegion).toHaveBeenCalledWith(
        mockSrc,
        32,
        64,
        48,
        48,
        0,
        0,
        96,
        96,
      );
    });
  });

  // ── Paint: Tint ──

  describe("paint — tint", () => {
    test("applies tint via source-atop compositing", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 100);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.width = 100;
      img.height = 100;
      img.tint = "rgba(255, 0, 0, 0.5)";
      const { ctx, raw, calls } = createMockCtx();
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);

      // Should have drawn the image first, then the tint rect
      expect(calls.length).toBeGreaterThanOrEqual(2);

      // Verify tint was applied
      expect(raw.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    test("restores composite operation after tint", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 100);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.width = 100;
      img.height = 100;
      img.tint = "red";
      const { ctx, raw } = createMockCtx();
      raw.globalCompositeOperation = "source-over";
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);
      expect(raw.globalCompositeOperation).toBe("source-over");
    });

    test("no tint rect when tint is undefined", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 100);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.width = 100;
      img.height = 100;
      const { ctx, raw } = createMockCtx();
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);
      expect(raw.fillRect).not.toHaveBeenCalled();
    });
  });

  // ── Nine-Slice Math ──

  describe("nine-slice", () => {
    test("draws 9 regions for valid nine-slice", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 100);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.nineSlice = [10, 10, 10, 10];
      img.width = 200;
      img.height = 150;
      const { raw } = createMockCtx();
      const ctx = {
        raw,
        drawImage: raw.drawImage,
        drawImageRegion: raw.drawImage,
      };
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);

      // 9 drawImage calls: 4 corners + 4 edges + 1 center
      expect(raw.drawImage).toHaveBeenCalledTimes(9);
    });

    test("corners are drawn at natural size", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 100);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.nineSlice = [20, 15, 25, 10];
      img.width = 200;
      img.height = 150;
      const { raw } = createMockCtx();
      const ctx = {
        raw,
        drawImage: raw.drawImage,
        drawImageRegion: raw.drawImage,
      };
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);

      const drawCalls = raw.drawImage.mock.calls;

      // Top-left corner: src(0,0,10,20) -> dst(0,0,10,20)
      expect(drawCalls[0]).toEqual([mockSrc, 0, 0, 10, 20, 0, 0, 10, 20]);

      // Top-right corner: src(85,0,15,20) -> dst(185,0,15,20)
      expect(drawCalls[2]).toEqual([mockSrc, 85, 0, 15, 20, 185, 0, 15, 20]);

      // Bottom-left corner: src(0,75,10,25) -> dst(0,125,10,25)
      expect(drawCalls[6]).toEqual([mockSrc, 0, 75, 10, 25, 0, 125, 10, 25]);

      // Bottom-right corner: src(85,75,15,25) -> dst(185,125,15,25)
      expect(drawCalls[8]).toEqual([mockSrc, 85, 75, 15, 25, 185, 125, 15, 25]);
    });

    test("center region stretches to fill remaining space", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 100);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.nineSlice = [20, 15, 25, 10];
      img.width = 200;
      img.height = 150;
      const { raw } = createMockCtx();
      const ctx = {
        raw,
        drawImage: raw.drawImage,
        drawImageRegion: raw.drawImage,
      };
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);

      const drawCalls = raw.drawImage.mock.calls;

      // Center: src(10,20,75,55) -> dst(10,20,175,105)
      // srcCenterW = 100 - 10 - 15 = 75
      // srcCenterH = 100 - 20 - 25 = 55
      // dstCenterW = 200 - 10 - 15 = 175
      // dstCenterH = 150 - 20 - 25 = 105
      expect(drawCalls[4]).toEqual([mockSrc, 10, 20, 75, 55, 10, 20, 175, 105]);
    });

    test("nine-slice with sourceRect offsets correctly", () => {
      const img = new Image();
      const mockSrc = createMockImage(512, 512);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.sourceRect = { x: 100, y: 100, width: 100, height: 100 };
      img.nineSlice = [10, 10, 10, 10];
      img.width = 200;
      img.height = 200;
      const { raw } = createMockCtx();
      const ctx = {
        raw,
        drawImage: raw.drawImage,
        drawImageRegion: raw.drawImage,
      };
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);

      const drawCalls = raw.drawImage.mock.calls;

      // Top-left corner: src(100,100,10,10) -> dst(0,0,10,10)
      expect(drawCalls[0]).toEqual([mockSrc, 100, 100, 10, 10, 0, 0, 10, 10]);
    });

    test("degenerate nine-slice (dst smaller than insets) falls back", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 100);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.nineSlice = [30, 30, 30, 30];
      img.width = 40;
      img.height = 40;
      const { raw } = createMockCtx();
      const ctx = {
        raw,
        drawImage: raw.drawImage,
        drawImageRegion: raw.drawImage,
      };
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);

      // Should fall back to a single drawImage
      expect(raw.drawImage).toHaveBeenCalledTimes(1);
      expect(raw.drawImage.mock.calls[0]).toEqual([
        mockSrc,
        0,
        0,
        100,
        100,
        0,
        0,
        40,
        40,
      ]);
    });

    test("nine-slice with zero insets draws only center", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 100);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.nineSlice = [0, 0, 0, 0];
      img.width = 200;
      img.height = 150;
      const { raw } = createMockCtx();
      const ctx = {
        raw,
        drawImage: raw.drawImage,
        drawImageRegion: raw.drawImage,
      };
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);

      // Only center should be drawn (corners/edges have 0 size)
      expect(raw.drawImage).toHaveBeenCalledTimes(1);
      expect(raw.drawImage.mock.calls[0]).toEqual([
        mockSrc,
        0,
        0,
        100,
        100,
        0,
        0,
        200,
        150,
      ]);
    });
  });

  // ── Setting source to null clears ──

  describe("clearing source", () => {
    test("setting source to null clears the element", () => {
      const img = new Image();
      const mockSrc = createMockImage(100, 100);
      img.source = mockSrc as unknown as CanvasImageSource;
      img.width = 100;
      img.height = 100;

      img.source = null;
      expect(img.source).toBeNull();

      const { ctx, raw } = createMockCtx();
      img.paint(ctx as unknown as Parameters<typeof img.paint>[0]);
      expect(raw.drawImage).not.toHaveBeenCalled();
    });

    test("intrinsic size is 0x0 after clearing source", () => {
      const img = new Image();
      img.source = createMockImage(100, 100) as unknown as CanvasImageSource;
      img.source = null;
      const size = img.getIntrinsicSize();
      expect(size.width).toBe(0);
      expect(size.height).toBe(0);
    });
  });

  // ── Lifecycle ──

  describe("lifecycle", () => {
    test("destroy clears state", () => {
      const img = new Image();
      img.source = createMockImage(100, 100) as unknown as CanvasImageSource;
      img.destroy();
      expect(img.parent).toBeNull();
      expect(img.scene).toBeNull();
    });
  });
});
