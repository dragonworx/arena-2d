import { describe, expect, test } from "bun:test";
import { doPolygonsIntersect, getGlobalQuad } from "../src/math/collision";
import { identity, rotate, translate, multiply } from "../src/math/matrix";

describe("SAT Collision Detection", () => {
  test("Detects intersection of overlapping axis-aligned rectangles", () => {
    // Rect A: 0,0 100x100
    const rectA = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    // Rect B: 50,50 100x100 (overlaps A)
    const rectB = [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 150 },
      { x: 50, y: 150 },
    ];

    expect(doPolygonsIntersect(rectA, rectB)).toBe(true);
  });

  test("Detects no intersection of non-overlapping axis-aligned rectangles", () => {
    // Rect A: 0,0 100x100
    const rectA = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    // Rect B: 200,200 100x100 (far away)
    const rectB = [
      { x: 200, y: 200 },
      { x: 300, y: 200 },
      { x: 300, y: 300 },
      { x: 200, y: 300 },
    ];

    expect(doPolygonsIntersect(rectA, rectB)).toBe(false);
  });

  test("Detects intersection of rotated rectangles", () => {
    // Rect A: 0,0 100x100, rotated 45 deg around center (50,50)
    // Center at 50,50
    // simplified: just use transformed points manually or via helper
    
    // Instead of manual points, let's use getGlobalQuad with matrices
    const matA = multiply(translate(50, 50), rotate(Math.PI / 4)); // Pivot/translate logic simplified for test
    // Let's use the actual Element-like logic: local 0,0 -> 100,100 placed at 100,100 rotated 45
    
    // Rect A: at 100,100, 100x100, rotated 45
    // center of A is approx 150, 150 (if origin is top-left)
    
    const quadA = getGlobalQuad(
      { x: 0, y: 0, width: 100, height: 100 },
      multiply(translate(100, 100), rotate(Math.PI / 4))
    );
    
    // Rect B: at 150, 150, 10x10 (should be inside A)
    const quadB = getGlobalQuad(
      { x: 0, y: 0, width: 10, height: 10 },
      translate(150, 150)
    );

    expect(doPolygonsIntersect(quadA, quadB)).toBe(true);
  });

  test("Detects NO intersection when AABBs overlap but Quads do not", () => {
    // This is the key test case for the feature.
    
    // Rect A: 100x100 at 100,100 rotated 45 degrees.
    // Diagonal length is ~141.4
    // AABB will range from approx x: 100-50+50 = 100? No.
    // 0,0 -> 100,100. Center 50,50. 
    // rotated 45 around 0,0 (default).
    // corners: 0,0;  70.7, 70.7;  0, 141.4; -70.7, 70.7
    // AABB: x[-70.7, 70.7], y[0, 141.4]
    
    // Let's position it so it's clear.
    // Rect A: 100x100, rotated 45deg.
    // corners relative to origin:
    // (0,0) -> (0,0)
    // (100,0) -> (70.7, 70.7)
    // (100,100) -> (0, 141.4)
    // (0,100) -> (-70.7, 70.7)
    // AABB: Left: -70.7, Right: 70.7, Top: 0, Bottom: 141.4
    
    const matA = rotate(Math.PI / 4);
    const quadA = getGlobalQuad({ x: 0, y: 0, width: 100, height: 100 }, matA);
    
    // Rect B: Small rect at (60, 10). 
    // Point (60, 10) is inside the AABB (since -70 < 60 < 70 and 0 < 10 < 141).
    // But is it inside the Diamond shape? 
    // The edge from (0,0) to (70.7, 70.7) follows line y=x.
    // Point (60,10) is below y=x (10 < 60).
    // Wait, y increases downwards? Yes usually in canvas.
    // rotated +45 deg (clockwise):
    // (100,0) goes to (70, 70).
    // So edge is x=t, y=t. 
    // (60,10) is "above" (numerically smaller y) or "right" of that line?
    // Let's just trust SAT.
    
    // 60, 10 is clearly inside AABB's right-top quadrant. 
    // But the diamond's edge connects (0,0) to (70.7, 70.7).
    // At x=60, the line is at y=60. 
    // Our point is y=10. So it is outside the diamond (too high/up).
    
    const quadB = getGlobalQuad(
      { x: 0, y: 0, width: 10, height: 10 },
      translate(60, 10)
    );
    
    expect(doPolygonsIntersect(quadA, quadB)).toBe(false);
  });
});
