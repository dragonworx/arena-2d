/**
 * Abstract base class for all geometry primitives.
 * Extends Transform to support hierarchical transformations.
 */

import { Transform, type ITransform } from '../math/Transform';
import { transformPoint, invert, type MatrixArray } from '../math/matrix';
import { computeAABB, type IRect } from '../math/aabb';
import type { IGeometry } from './types';

export abstract class Geometry extends Transform implements IGeometry {
  abstract readonly type: string;

  /**
   * Compute local bounds (before transform) used for AABB calculation.
   * Subclasses must override this.
   */
  protected abstract getLocalBounds(): IRect;

  /**
   * Distance from a point (in world space) to the closest point on this geometry.
   * Subclasses must implement this.
   */
  abstract distanceTo(x: number, y: number): number;

  /**
   * Find the closest point on this geometry to the given world-space point.
   * Subclasses must implement this.
   */
  abstract closestPointTo(x: number, y: number): { x: number; y: number };

  /**
   * Find all intersection points between this geometry and a line.
   * Line is defined in world space by two points.
   */
  abstract intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }>;

  /**
   * Find all intersection points between this geometry and another shape.
   * Both shapes are in world space.
   */
  abstract intersectsShape(shape: IGeometry): Array<{ x: number; y: number }>;

  /**
   * Check if a point (in world space) is contained within this geometry.
   */
  abstract containsPoint(x: number, y: number): boolean;

  /**
   * Area of this geometry (affected by scale transforms).
   */
  abstract get area(): number;

  /**
   * Perimeter of this geometry (affected by scale transforms).
   */
  abstract get perimeter(): number;

  /**
   * Get a point at parameter t (0 <= t <= 1) along this geometry.
   * For closed shapes, t=0 and t=1 should be the same point.
   */
  abstract pointAt(t: number): { x: number; y: number };

  /**
   * Get the normalized tangent vector at parameter t.
   * For closed shapes, returns the outward tangent.
   */
  abstract tangentAt(t: number): { x: number; y: number };

  /**
   * Get the bounding box in world space.
   */
  get boundingBox(): IRect {
    const localBounds = this.getLocalBounds();
    return computeAABB(localBounds, this.worldMatrix);
  }

  /**
   * Get the centroid in world space.
   */
  abstract get centroid(): { x: number; y: number };

  /**
   * Convert a point from world space to local space.
   * Used internally for geometry calculations.
   */
  protected worldToLocal(x: number, y: number): { x: number; y: number } {
    const invMatrix = invert(this.worldMatrix);
    if (!invMatrix) {
      return { x, y }; // Fallback if matrix is singular
    }
    return transformPoint(invMatrix, x, y);
  }

  /**
   * Convert a point from local space to world space.
   */
  protected localToWorld(x: number, y: number): { x: number; y: number } {
    return transformPoint(this.worldMatrix, x, y);
  }

  /**
   * Transform a vector (direction, not position) by the matrix.
   * Ignores translation component.
   */
  protected transformVector(dx: number, dy: number): { x: number; y: number } {
    const mat = this.worldMatrix;
    return {
      x: mat[0] * dx + mat[2] * dy,
      y: mat[1] * dx + mat[3] * dy,
    };
  }
}
