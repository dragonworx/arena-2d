import { describe, expect, test } from "bun:test";
import { Transform } from "../src/math/Transform";
import { computeAABB } from "../src/math/aabb";
import type { IRect } from "../src/math/aabb";
import {
  identity,
  invert,
  multiply,
  rotate,
  scale,
  skew,
  transformPoint,
  translate,
} from "../src/math/matrix";
import type { MatrixArray } from "../src/math/matrix";

// Helper: check two matrices are approximately equal within tolerance
function expectMatrixClose(
  actual: MatrixArray,
  expected: MatrixArray | number[],
  tolerance = 1e-6,
) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThanOrEqual(tolerance);
  }
}

// Helper: check two points are approximately equal
function expectPointClose(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
  tolerance = 1e-6,
) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance);
}

// Helper: check two rects are approximately equal
function expectRectClose(actual: IRect, expected: IRect, tolerance = 1e-6) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(
    tolerance,
  );
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(
    tolerance,
  );
}

describe("Layer 1 — Core Math & Transformation Engine", () => {
  // ─── Matrix Identity ──────────────────────────────────
  describe("identity", () => {
    test("produces [1, 0, 0, 1, 0, 0]", () => {
      const id = identity();
      expectMatrixClose(id, [1, 0, 0, 1, 0, 0]);
    });

    test("multiply with identity is no-op", () => {
      const mat = new Float32Array([2, 3, 4, 5, 6, 7]);
      const id = identity();
      const result = multiply(id, mat);
      expectMatrixClose(result, mat);
    });

    test("multiply identity on the right is no-op", () => {
      const mat = new Float32Array([2, 3, 4, 5, 6, 7]);
      const id = identity();
      const result = multiply(mat, id);
      expectMatrixClose(result, mat);
    });
  });

  // ─── Translate ─────────────────────────────────────────
  describe("translate", () => {
    test("creates correct translation matrix", () => {
      const t = translate(10, 20);
      expectMatrixClose(t, [1, 0, 0, 1, 10, 20]);
    });

    test("translating a point", () => {
      const t = translate(10, 20);
      const p = transformPoint(t, 5, 5);
      expectPointClose(p, { x: 15, y: 25 });
    });
  });

  // ─── Rotate ────────────────────────────────────────────
  describe("rotate", () => {
    test("rotation by 0 is identity-like", () => {
      const r = rotate(0);
      expectMatrixClose(r, [1, 0, 0, 1, 0, 0]);
    });

    test("rotation by PI/2 (90° clockwise)", () => {
      const r = rotate(Math.PI / 2);
      const cos = Math.cos(Math.PI / 2);
      const sin = Math.sin(Math.PI / 2);
      expectMatrixClose(r, [cos, sin, -sin, cos, 0, 0]);
    });

    test("rotating point (1, 0) by PI/2 gives (0, 1)", () => {
      const r = rotate(Math.PI / 2);
      const p = transformPoint(r, 1, 0);
      expectPointClose(p, { x: 0, y: 1 });
    });

    test("rotating point (1, 0) by PI gives (-1, 0)", () => {
      const r = rotate(Math.PI);
      const p = transformPoint(r, 1, 0);
      expectPointClose(p, { x: -1, y: 0 });
    });

    test("very small angle is approximately identity", () => {
      const r = rotate(1e-10);
      expectMatrixClose(r, [1, 0, 0, 1, 0, 0], 1e-6);
    });
  });

  // ─── Scale ─────────────────────────────────────────────
  describe("scale", () => {
    test("creates correct scale matrix", () => {
      const s = scale(2, 3);
      expectMatrixClose(s, [2, 0, 0, 3, 0, 0]);
    });

    test("scaling a point", () => {
      const s = scale(2, 3);
      const p = transformPoint(s, 5, 10);
      expectPointClose(p, { x: 10, y: 30 });
    });

    test("scaleX = -1 mirrors horizontally", () => {
      const s = scale(-1, 1);
      const p = transformPoint(s, 5, 10);
      expectPointClose(p, { x: -5, y: 10 });
    });

    test("scaleY = -1 mirrors vertically", () => {
      const s = scale(1, -1);
      const p = transformPoint(s, 5, 10);
      expectPointClose(p, { x: 5, y: -10 });
    });
  });

  // ─── Skew ──────────────────────────────────────────────
  describe("skew", () => {
    test("skew(0,0) is identity", () => {
      const s = skew(0, 0);
      expectMatrixClose(s, [1, 0, 0, 1, 0, 0]);
    });

    test("skewX creates horizontal shear", () => {
      const s = skew(1, 0); // tan(1) ≈ 1.557
      expectMatrixClose(s, [1, 0, Math.tan(1), 1, 0, 0]);
    });

    test("skewY creates vertical shear", () => {
      const s = skew(0, 1); // tan(1)
      expectMatrixClose(s, [1, Math.tan(1), 0, 1, 0, 0]);
    });

    test("transforming points with skew", () => {
      // Skew X by 45° (tan(PI/4) = 1)
      // x' = x + y*1
      // y' = y
      const s = skew(Math.PI / 4, 0);
      const p = transformPoint(s, 10, 5);
      expectPointClose(p, { x: 15, y: 5 });
    });
  });

  // ─── Multiply (composition) ───────────────────────────
  describe("multiply", () => {
    test("T × R produces correct result", () => {
      const t = translate(10, 0);
      const r = rotate(Math.PI / 2);
      // T × R: first rotate, then translate
      const m = multiply(t, r);
      // Point (1, 0) → rotated to (0, 1) → translated to (10, 1)
      const p = transformPoint(m, 1, 0);
      expectPointClose(p, { x: 10, y: 1 });
    });

    test("R × T produces correct result (different order)", () => {
      const t = translate(10, 0);
      const r = rotate(Math.PI / 2);
      // R × T: first translate, then rotate
      const m = multiply(r, t);
      // Point (0, 0) → translated to (10, 0) → rotated to (0, 10)
      const p = transformPoint(m, 0, 0);
      expectPointClose(p, { x: 0, y: 10 });
    });

    test("hand-calculated T(5,10) × S(2,3)", () => {
      const t = translate(5, 10);
      const s = scale(2, 3);
      const m = multiply(t, s);
      // Expected: [2, 0, 0, 3, 5, 10]
      expectMatrixClose(m, [2, 0, 0, 3, 5, 10]);
    });
  });

  // ─── Inversion ─────────────────────────────────────────
  describe("invert", () => {
    test("inverse of identity is identity", () => {
      const id = identity();
      const inv = invert(id);
      if (!inv) throw new Error("Expected non-null");
      expectMatrixClose(inv, [1, 0, 0, 1, 0, 0]);
    });

    test("M × M⁻¹ ≈ I for translation", () => {
      const t = translate(42, -17);
      const inv = invert(t);
      if (!inv) throw new Error("Expected non-null");
      const product = multiply(t, inv);
      expectMatrixClose(product, [1, 0, 0, 1, 0, 0]);
    });

    test("M × M⁻¹ ≈ I for rotation", () => {
      const r = rotate(1.234);
      const inv = invert(r);
      if (!inv) throw new Error("Expected non-null");
      const product = multiply(r, inv);
      expectMatrixClose(product, [1, 0, 0, 1, 0, 0]);
    });

    test("M × M⁻¹ ≈ I for complex composition", () => {
      const t = translate(15, -7);
      const r = rotate(0.7);
      const s = scale(2, 0.5);
      const m = multiply(multiply(t, r), s);
      const inv = invert(m);
      if (!inv) throw new Error("Expected non-null");
      const product = multiply(m, inv);
      expectMatrixClose(product, [1, 0, 0, 1, 0, 0], 1e-4);
    });

    test("singular matrix returns null", () => {
      const singular = new Float32Array([0, 0, 0, 0, 5, 5]);
      const inv = invert(singular);
      expect(inv).toBeNull();
    });

    test("inverse undoes transformation on a point", () => {
      const t = translate(10, 20);
      const r = rotate(Math.PI / 4);
      const m = multiply(t, r);
      const p = transformPoint(m, 3, 7);
      const inv = invert(m);
      if (!inv) throw new Error("Expected non-null");
      const restored = transformPoint(inv, p.x, p.y);
      expectPointClose(restored, { x: 3, y: 7 }, 1e-4);
    });
  });

  // ─── transformPoint ────────────────────────────────────
  describe("transformPoint", () => {
    test("identity transforms point to itself", () => {
      const id = identity();
      const p = transformPoint(id, 42, -13);
      expectPointClose(p, { x: 42, y: -13 });
    });

    test("combined rotation + scale", () => {
      const r = rotate(Math.PI / 2);
      const s = scale(2, 2);
      const m = multiply(s, r); // scale then rotate
      const p = transformPoint(m, 1, 0);
      // scale(1,0) → (2,0), rotate((2,0), π/2) → (0,2)
      expectPointClose(p, { x: 0, y: 2 });
    });
  });

  // ─── AABB ──────────────────────────────────────────────
  describe("computeAABB", () => {
    test("identity matrix returns same rect", () => {
      const rect: IRect = { x: 10, y: 20, width: 100, height: 50 };
      const aabb = computeAABB(rect, identity());
      expectRectClose(aabb, rect);
    });

    test("translation shifts AABB", () => {
      const rect: IRect = { x: 0, y: 0, width: 10, height: 10 };
      const t = translate(5, 15);
      const aabb = computeAABB(rect, t);
      expectRectClose(aabb, { x: 5, y: 15, width: 10, height: 10 });
    });

    test("90° rotation of unit square", () => {
      const rect: IRect = { x: 0, y: 0, width: 10, height: 10 };
      const r = rotate(Math.PI / 2);
      const aabb = computeAABB(rect, r);
      // After 90° rotation:
      // (0,0)→(0,0), (10,0)→(0,10), (0,10)→(-10,0), (10,10)→(-10,10)
      // AABB: x=-10, y=0, w=10, h=10
      expectRectClose(aabb, { x: -10, y: 0, width: 10, height: 10 }, 1e-4);
    });

    test("45° rotation of square produces larger AABB", () => {
      const rect: IRect = { x: -5, y: -5, width: 10, height: 10 };
      const r = rotate(Math.PI / 4);
      const aabb = computeAABB(rect, r);
      // A 10×10 square centered at origin rotated 45° has AABB side = 10√2 ≈ 14.142
      const halfDiag = (10 * Math.SQRT2) / 2;
      expectRectClose(
        aabb,
        {
          x: -halfDiag,
          y: -halfDiag,
          width: 10 * Math.SQRT2,
          height: 10 * Math.SQRT2,
        },
        1e-4,
      );
    });

    test("scale enlarges AABB", () => {
      const rect: IRect = { x: 0, y: 0, width: 10, height: 10 };
      const s = scale(3, 2);
      const aabb = computeAABB(rect, s);
      expectRectClose(aabb, { x: 0, y: 0, width: 30, height: 20 });
    });

    test("negative scale mirrors AABB", () => {
      const rect: IRect = { x: 0, y: 0, width: 10, height: 10 };
      const s = scale(-1, 1);
      const aabb = computeAABB(rect, s);
      expectRectClose(aabb, { x: -10, y: 0, width: 10, height: 10 });
    });
  });

  // ─── Transform class ──────────────────────────────────
  describe("Transform", () => {
    test("default transform produces identity local matrix", () => {
      const t = new Transform();
      t.updateLocalMatrix();
      expectMatrixClose(t.localMatrix, [1, 0, 0, 1, 0, 0]);
    });

    test("setting x, y produces translation", () => {
      const t = new Transform();
      t.x = 10;
      t.y = 20;
      t.updateLocalMatrix();
      expectMatrixClose(t.localMatrix, [1, 0, 0, 1, 10, 20]);
    });

    test("setting rotation produces rotation matrix", () => {
      const t = new Transform();
      t.rotation = Math.PI / 2;
      t.updateLocalMatrix();
      const cos = Math.cos(Math.PI / 2);
      const sin = Math.sin(Math.PI / 2);
      expectMatrixClose(t.localMatrix, [cos, sin, -sin, cos, 0, 0], 1e-5);
    });

    test("setting scaleX, scaleY produces scale", () => {
      const t = new Transform();
      t.scaleX = 2;
      t.scaleY = 3;
      t.updateLocalMatrix();
      expectMatrixClose(t.localMatrix, [2, 0, 0, 3, 0, 0]);
    });

    test("setting skewX, skewY produces skew", () => {
      const t = new Transform();
      t.skewX = Math.PI / 4;
      t.updateLocalMatrix();
      // SkewX(45°) -> [1, 0, 1, 1, 0, 0]
      expectMatrixClose(t.localMatrix, [1, 0, 1, 1, 0, 0]);
    });

    test("pivoted rotation rotates around pivot", () => {
      const t = new Transform();
      t.pivotX = 5;
      t.pivotY = 5;
      t.rotation = Math.PI / 2;
      t.updateLocalMatrix();

      // With T(0,0) × R(π/2) × S(1,1) × T(-5, -5):
      // Pivot (5,5) → T(-5,-5) → (0,0) → S → (0,0) → R → (0,0) → T(0,0) → (0,0)
      const pivot = transformPoint(t.localMatrix, 5, 5);
      expectPointClose(pivot, { x: 0, y: 0 }, 1e-4);

      // Point (10, 5) → T(-5,-5) → (5,0) → R(π/2) → (0,5) → T(0,0) → (0,5)
      const right = transformPoint(t.localMatrix, 10, 5);
      expectPointClose(right, { x: 0, y: 5 }, 1e-4);
    });

    test("pivoted scale scales around pivot", () => {
      const t = new Transform();
      t.pivotX = 5;
      t.pivotY = 5;
      t.scaleX = 2;
      t.scaleY = 2;
      t.updateLocalMatrix();

      // With T(0,0) × S(2,2) × T(-5,-5):
      // Pivot (5,5) → T(-5,-5) → (0,0) → S(2,2) → (0,0) → T(0,0) → (0,0)
      const pivot = transformPoint(t.localMatrix, 5, 5);
      expectPointClose(pivot, { x: 0, y: 0 }, 1e-4);

      // Point (10, 5) → T(-5,-5) → (5,0) → S(2,2) → (10,0) → T(0,0) → (10,0)
      const right = transformPoint(t.localMatrix, 10, 5);
      expectPointClose(right, { x: 10, y: 0 }, 1e-4);
    });

    test("dirty flag tracks changes", () => {
      const t = new Transform();
      expect(t.isDirty).toBe(true);
      t.updateLocalMatrix();
      expect(t.isDirty).toBe(false);
      t.x = 5;
      expect(t.isDirty).toBe(true);
    });

    test("setting same value does not mark dirty", () => {
      const t = new Transform();
      t.updateLocalMatrix();
      expect(t.isDirty).toBe(false);
      t.x = 0; // same as default
      expect(t.isDirty).toBe(false);
    });

    test("updateWorldMatrix computes parent × local", () => {
      const parentMatrix = translate(100, 50);
      const t = new Transform();
      t.x = 10;
      t.y = 20;
      t.updateWorldMatrix(parentMatrix);

      // worldMatrix = T(100,50) × T(10,20) = T(110, 70)
      expectMatrixClose(t.worldMatrix, [1, 0, 0, 1, 110, 70]);
    });

    test("updateWorldMatrix auto-updates local if dirty", () => {
      const t = new Transform();
      t.x = 10;
      // Don't call updateLocalMatrix directly
      t.updateWorldMatrix(identity());
      expectMatrixClose(t.worldMatrix, [1, 0, 0, 1, 10, 0]);
      expect(t.isDirty).toBe(false);
    });

    test("pivot always maps to (x, y) in parent space", () => {
      const t = new Transform();
      t.x = 100;
      t.y = 50;
      t.rotation = Math.PI / 4;
      t.scaleX = 2;
      t.scaleY = 2;

      // With pivotX=0, pivotY=0: pivot (0,0) maps to (100, 50)
      t.pivotX = 0;
      t.pivotY = 0;
      t.updateLocalMatrix();
      const p1 = transformPoint(t.localMatrix, 0, 0);
      expectPointClose(p1, { x: 100, y: 50 }, 1e-3);

      // Change pivot to (25, 25): pivot (25,25) still maps to (100, 50)
      t.pivotX = 25;
      t.pivotY = 25;
      t.updateLocalMatrix();
      const p2 = transformPoint(t.localMatrix, 25, 25);
      expectPointClose(p2, { x: 100, y: 50 }, 1e-3);

      // Change pivot to (50, 10): pivot (50,10) still maps to (100, 50)
      t.pivotX = 50;
      t.pivotY = 10;
      t.updateLocalMatrix();
      const p3 = transformPoint(t.localMatrix, 50, 10);
      expectPointClose(p3, { x: 100, y: 50 }, 1e-3);
    });

    test("full composition: position + rotation + scale + pivot", () => {
      const t = new Transform();
      t.x = 100;
      t.y = 50;
      t.rotation = Math.PI / 4;
      t.scaleX = 2;
      t.scaleY = 2;
      t.pivotX = 25;
      t.pivotY = 25;
      t.updateLocalMatrix();

      // Pivot point (25, 25) should map to (x, y) = (100, 50)
      // Because T(x,y) × R × S × T(-px,-py)
      // pivot → T(-25,-25) → (0,0) → S → (0,0) → R → (0,0) → T(100,50) → (100, 50)
      const pivot = transformPoint(t.localMatrix, 25, 25);
      expectPointClose(pivot, { x: 100, y: 50 }, 1e-3);
    });
  });
});
