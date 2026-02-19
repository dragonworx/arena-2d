/**
 * Collision detection utilities.
 */

import type { IRect } from "./aabb";
import { type MatrixArray, transformPoint } from "./matrix";

/** A point in 2D space. */
export interface IPoint {
  x: number;
  y: number;
}

/**
 * Get the global quad coordinates (4 corners) of a local rectangle transformed by a world matrix.
 * Returns [tl, tr, br, bl]
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
 * Check if two convex polygons intersect using the Separating Axis Theorem (SAT).
 * @param polyA Array of points defining the first polygon (vertices in order).
 * @param polyB Array of points defining the second polygon (vertices in order).
 * @returns true if they intersect, false otherwise.
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

      // Optional: Normalize the normal? Not strictly necessary for overlap *check* (just projection),
      // effectively we represent the axis direction. But magnitude differences affect projection values.
      // Since we just compare min/max on the same axis, it cancels out.
      // So no normalization needed for simple boolean intersection.

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
