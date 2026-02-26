/**
 * Abstract base class for all geometry primitives.
 *
 * Extends Transform to support hierarchical transformations. This allows all
 * geometry to be positioned, rotated, and scaled in a scene graph.
 *
 * @module Geometry
 * @example
 * ```typescript
 * class MyShape extends Geometry {
 *   readonly type = 'myshape';
 *   // ... implement abstract methods
 * }
 * ```
 */

import { Transform, type ITransform } from '../math/Transform';
import { transformPoint, invert, type MatrixArray } from '../math/matrix';
import { computeAABB, type IRect } from '../math/aabb';
import type { IGeometry } from './types';

export abstract class Geometry extends Transform implements IGeometry {
  /** @inheritdoc */
  abstract readonly type: string;

  /**
   * Computes the local bounds (before transform) of the geometry.
   * @public
   */
  abstract getLocalBounds(): IRect;

  /**
   * Calculates the shortest distance from a world-space point to this geometry.
   *
   * @param x - The X coordinate in world space.
   * @param y - The Y coordinate in world space.
   * @returns The minimum distance to the geometry.
   */
  abstract distanceTo(x: number, y: number): number;

  /**
   * Finds the closest point on this geometry to the given world-space point.
   *
   * @param x - The X coordinate in world space.
   * @param y - The Y coordinate in world space.
   * @returns The closest point on the geometry in world space.
   */
  abstract closestPointTo(x: number, y: number): { x: number; y: number };

  /**
   * Finds all intersection points between this geometry and a line.
   *
   * @param x1 - The X coordinate of the line start in world space.
   * @param y1 - The Y coordinate of the line start in world space.
   * @param x2 - The X coordinate of the line end in world space.
   * @param y2 - The Y coordinate of the line end in world space.
   * @returns An array of intersection points in world space.
   */
  abstract intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }>;

  /**
   * Finds all intersection points between this geometry and another shape.
   * Both shapes are processed in world space.
   * Default implementation samples 32 points along the shape boundary.
   *
   * @param shape - The other geometry to test against.
   * @returns An array of intersection points in world space.
   */
  intersectsShape(shape: IGeometry): Array<{ x: number; y: number }> {
    const results: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 32; i++) {
      const pt = shape.pointAt(i / 32);
      if (this.containsPoint(pt.x, pt.y)) results.push(pt);
    }
    return results;
  }

  /**
   * Checks if a world-space point is contained within this geometry.
   * Default implementation checks proximity to the closest point using closestPointTo().
   *
   * @param x - The X coordinate in world space.
   * @param y - The Y coordinate in world space.
   * @returns True if the point is inside or on the boundary.
   */
  containsPoint(x: number, y: number): boolean {
    const closest = this.closestPointTo(x, y);
    return Math.abs(closest.x - x) < 1e-6 && Math.abs(closest.y - y) < 1e-6;
  }

  /** The area of the geometry in world units (affected by scale). */
  abstract get area(): number;

  /** The perimeter or arc length of the geometry in world units (affected by scale). */
  abstract get perimeter(): number;

  /**
   * Computes the uniform scale factor from the geometry's scale transform.
   * Useful for scaling-dependent calculations like stroke width.
   * @protected
   */
  protected get uniformScale(): number {
    return Math.sqrt(Math.abs(this.scaleX * this.scaleY));
  }

  /**
   * Finds the intersection point between two line segments.
   * Uses parametric line intersection algorithm.
   *
   * @protected
   * @param x1 - First segment start X
   * @param y1 - First segment start Y
   * @param x2 - First segment end X
   * @param y2 - First segment end Y
   * @param x3 - Second segment start X
   * @param y3 - Second segment start Y
   * @param x4 - Second segment end X
   * @param y4 - Second segment end Y
   * @returns The intersection point, or null if lines don't intersect
   */
  protected static lineSegmentIntersection(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number,
  ): { x: number; y: number } | null {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    }
    return null;
  }

  /**
   * Returns a point at standardized parameter `t` (0 to 1) along the geometry's boundary.
   * For closed shapes, `t=0` and `t=1` usually represent the same point.
   *
   * @param t - A value between 0 and 1.
   * @returns The point in world space.
   */
  abstract pointAt(t: number): { x: number; y: number };

  /**
   * Returns a normalized tangent vector at normalized parameter `t`.
   *
   * @param t - A value between 0 and 1.
   * @returns The tangent vector { x, y }.
   */
  abstract tangentAt(t: number): { x: number; y: number };

  /**
   * Returns an outward-facing normal vector at normalized parameter `t`.
   * Computed by rotating the tangent 90° and ensuring it points away from
   * the shape's centroid so that it consistently faces outward regardless
   * of parameterization winding order.
   *
   * @param t - A value between 0 and 1.
   * @returns The normal vector { x, y }.
   */
  normalAt(t: number): { x: number; y: number } {
    const tan = this.tangentAt(t);
    const nx = tan.y, ny = -tan.x;
    // Ensure normal faces away from centroid (outward)
    const pt = this.pointAt(t);
    const c = this.centroid;
    const toCentroidX = c.x - pt.x;
    const toCentroidY = c.y - pt.y;
    if (nx * toCentroidX + ny * toCentroidY > 0) {
      return { x: -nx, y: -ny };
    }
    return { x: nx, y: ny };
  }

  /**
   * Returns the outward-facing surface normal at the closest point to a
   * world-space query point. Computed as `normalize(query - closestPoint)`,
   * which is mathematically exact for smooth curves and gives natural
   * interpolation at corners/discontinuities.
   *
   * Falls back to parametric `normalAt` if the query point is on or
   * inside the shape (distance ≈ 0).
   *
   * @param x - The X coordinate of the query point in world space.
   * @param y - The Y coordinate of the query point in world space.
   * @returns The outward unit normal vector { x, y }.
   */
  closestNormalTo(x: number, y: number): { x: number; y: number } {
    const closest = this.closestPointTo(x, y);
    const dx = x - closest.x;
    const dy = y - closest.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) {
      // Point is on/inside the shape — fall back to parametric normal
      return this.normalAt(0);
    }
    return { x: dx / len, y: dy / len };
  }

  /**
   * Gets the Axis-Aligned Bounding Box (AABB) of this geometry in world space.
   * Computed by transforming the local bounds through the world matrix.
   */
  get boundingBox(): IRect {
    const localBounds = this.getLocalBounds();
    return computeAABB(localBounds, this.worldMatrix);
  }

  /** The geometric center point of the shape in world space. */
  abstract get centroid(): { x: number; y: number };

  /**
   * Converts a point from world space to this geometry's local coordinate space.
   *
   * @protected
   * @param x - World X.
   * @param y - World Y.
   * @returns Local { x, y }.
   */
  protected worldToLocal(x: number, y: number): { x: number; y: number } {
    const invMatrix = invert(this.worldMatrix);
    if (!invMatrix) {
      return { x, y }; // Fallback if matrix is singular
    }
    return transformPoint(invMatrix, x, y);
  }

  /**
   * Converts a point from this geometry's local space to world space.
   *
   * @protected
   * @param x - Local X.
   * @param y - Local Y.
   * @returns World { x, y }.
   */
  protected localToWorld(x: number, y: number): { x: number; y: number } {
    return transformPoint(this.worldMatrix, x, y);
  }

  /**
   * Transforms a vector (direction, not position) by this geometry's world matrix.
   * This ignores the translation component of the matrix.
   *
   * @protected
   * @param dx - Vector X component.
   * @param dy - Vector Y component.
   * @returns Transformed { x, y }.
   */
  protected transformVector(dx: number, dy: number): { x: number; y: number } {
    const mat = this.worldMatrix;
    return {
      x: mat[0] * dx + mat[2] * dy,
      y: mat[1] * dx + mat[3] * dy,
    };
  }
}
