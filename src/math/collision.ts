/**
 * Advanced collision detection and spatial queries.
 *
 * Implements algorithms like Separating Axis Theorem (SAT) for convex polygons.
 *
 * @module Math
 * @example
 * ```typescript
 * import { collision } from 'arena-2d';
 *
 * const polyA = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
 * const polyB = [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 15 }, { x: 5, y: 15 }];
 *
 * if (collision.doPolygonsIntersect(polyA, polyB)) {
 *   console.log('Polygons overlap!');
 * }
 * ```
 */

import type { IRect } from "./aabb";
import { type MatrixArray, transformPoint } from "./matrix";

/**
 * A simple 2D point interface.
 */
export interface IPoint {
  /** The X coordinate. */
  x: number;
  /** The Y coordinate. */
  y: number;
}

/**
 * Gets the global quad coordinates (4 corners) of a local rectangle transformed by a world matrix.
 *
 * Useful for broad-phase or accurate overlap testing of transformed rectangles.
 *
 * @param localBounds - The rectangle in local coordinate space.
 * @param worldMatrix - The transformation matrix to apply.
 * @returns An array of 4 points in the order: [Top-Left, Top-Right, Bottom-Right, Bottom-Left].
 */
export function getGlobalQuad(
  localBounds: IRect,
  worldMatrix: MatrixArray,
): IPoint[] {
  const { x, y, width, height } = localBounds;

  return [
    transformPoint(worldMatrix, x, y), // Top-left
    transformPoint(worldMatrix, x + width, y), // Top-right
    transformPoint(worldMatrix, x + width, y + height), // Bottom-right
    transformPoint(worldMatrix, x, y + height), // Bottom-left
  ];
}

/**
 * Checks if two convex polygons intersect using the Separating Axis Theorem (SAT).
 *
 * The polygons are defined by an array of vertices in order (clockwise or counter-clockwise).
 *
 * @param polyA - Array of points defining the first polygon.
 * @param polyB - Array of points defining the second polygon.
 * @returns True if the polygons intersect, false otherwise.
 */
export function doPolygonsIntersect(polyA: IPoint[], polyB: IPoint[]): boolean {
  const polygons = [polyA, polyB];

  // Loop through both polygons
  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i];

    // Loop through all edges of the polygon
    for (let j = 0; j < polygon.length; j++) {
      // Get the edge
      const p1 = polygon[j];
      const p2 = polygon[(j + 1) % polygon.length];

      // Get the normal (perpendicular) vector to the edge
      const normal = { x: p2.y - p1.y, y: p1.x - p2.x };

      // Project both polygons onto this normal axis
      const minA = getMinMaxProjection(polyA, normal);
      const minB = getMinMaxProjection(polyB, normal);

      const maxA = minA.max;
      const maxB = minB.max;

      // Check for overlap
      if (maxA < minB.min || maxB < minA.min) {
        // Separating axis found!
        return false;
      }
    }
  }

  // No separating axis found, so they must intersect
  return true;
}

/**
 * Projects a polygon onto an axis and returns the min/max projection values.
 *
 * @internal
 * @param polygon - The polygon to project.
 * @param axis - The axis to project onto (normal vector).
 * @returns The minimum and maximum projection values.
 */
function getMinMaxProjection(
  polygon: IPoint[],
  axis: IPoint,
): { min: number; max: number } {
  let min = Number.MAX_VALUE;
  let max = -Number.MAX_VALUE;

  for (const point of polygon) {
    // Dot product
    const projected = point.x * axis.x + point.y * axis.y;
    if (projected < min) min = projected;
    if (projected > max) max = projected;
  }

  return { min, max };
}
