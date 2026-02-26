/**
 * Axis-Aligned Bounding Box (AABB) computation and intersection utilities.
 *
 * @module Math
 * @example
 * ```typescript
 * import { aabb } from 'arena-2d';
 *
 * const rect = { x: 0, y: 0, width: 100, height: 100 };
 * const worldMatrix = matrix.rotate(Math.PI / 4);
 * const bounds = aabb.computeAABB(rect, worldMatrix);
 * ```
 */

import { type MatrixArray, transformPoint } from "./matrix";

/**
 * A rectangle defined by its top-left position and size.
 */
export interface IRect {
  /** The X coordinate of the top-left corner. */
  x: number;
  /** The Y coordinate of the top-left corner. */
  y: number;
  /** The width of the rectangle. */
  width: number;
  /** The height of the rectangle. */
  height: number;
}

/**
 * Computes the world-space Axis-Aligned Bounding Box for a local-space rectangle
 * transformed by the given world matrix.
 *
 * Transforms all 4 corners of localBounds through worldMatrix and returns
 * the min/max bounding rectangle that encompasses them.
 *
 * @param localBounds - The rectangle in local space.
 * @param worldMatrix - The transformation matrix to apply.
 * @returns The bounding box in world space.
 */
export function computeAABB(
  localBounds: IRect,
  worldMatrix: MatrixArray,
): IRect {
  const { x, y, width, height } = localBounds;

  // Transform all four corners
  const tl = transformPoint(worldMatrix, x, y);
  const tr = transformPoint(worldMatrix, x + width, y);
  const bl = transformPoint(worldMatrix, x, y + height);
  const br = transformPoint(worldMatrix, x + width, y + height);

  const minX = Math.min(tl.x, tr.x, bl.x, br.x);
  const minY = Math.min(tl.y, tr.y, bl.y, br.y);
  const maxX = Math.max(tl.x, tr.x, bl.x, br.x);
  const maxY = Math.max(tl.y, tr.y, bl.y, br.y);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Checks if two Axis-Aligned Bounding Boxes intersect.
 *
 * @param a - The first rectangle.
 * @param b - The second rectangle.
 * @returns True if the rectangles overlap, false otherwise.
 */
export function intersect(a: IRect, b: IRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Computes the intersection rectangle of two AABBs.
 *
 * @param a - The first rectangle.
 * @param b - The second rectangle.
 * @returns The intersection rectangle, or null if the rectangles do not overlap.
 */
export function rectIntersection(a: IRect, b: IRect): IRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  if (right <= x || bottom <= y) return null;

  return { x, y, width: right - x, height: bottom - y };
}
