/**
 * Axis-Aligned Bounding Box computation.
 */

import { type MatrixArray, transformPoint } from "./matrix";

/** A rectangle defined by position and size. */
export interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute the world-space Axis-Aligned Bounding Box for a local-space rectangle
 * transformed by the given world matrix.
 *
 * Transforms all 4 corners of localBounds through worldMatrix and returns
 * the min/max bounding rectangle.
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
