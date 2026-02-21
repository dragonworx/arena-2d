/**
 * Core 2D affine transformation matrix operations.
 *
 * Matrices are stored as Float32Array(6) in column-major order: [a, b, c, d, tx, ty]
 * matching the HTML Canvas setTransform(a, b, c, d, e, f) parameter order.
 *
 * ```
 * | a  c  tx |
 * | b  d  ty |
 * | 0  0   1 |
 * ```
 *
 * @module Math
 * @example
 * ```typescript
 * import { matrix } from 'arena-2d';
 *
 * const mat = matrix.identity();
 * const translated = matrix.translate(10, 20);
 * const combined = matrix.multiply(mat, translated);
 * ```
 */

/**
 * A 2D affine transformation matrix stored as Float32Array(6).
 * Follows the order: [a, b, c, d, tx, ty].
 */
export type MatrixArray = Float32Array;

/**
 * Creates a new identity matrix.
 * @returns A new MatrixArray initialized to identity [1, 0, 0, 1, 0, 0].
 */
export function identity(): MatrixArray {
  return new Float32Array([1, 0, 0, 1, 0, 0]);
}

/**
 * Multiplies two matrices: out = a × b (left-multiply; a is left operand).
 *
 * @param a - The first matrix (left operand).
 * @param b - The second matrix (right operand).
 * @returns A new MatrixArray representing the product.
 */
export function multiply(a: MatrixArray, b: MatrixArray): MatrixArray {
  // | a0 a2 a4 |   | b0 b2 b4 |
  // | a1 a3 a5 | × | b1 b3 b5 |
  // |  0  0  1 |   |  0  0  1 |
  return new Float32Array([
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ]);
}

/**
 * Creates a translation matrix.
 *
 * @param tx - Translation along the X axis.
 * @param ty - Translation along the Y axis.
 * @returns A new MatrixArray [1, 0, 0, 1, tx, ty].
 */
export function translate(tx: number, ty: number): MatrixArray {
  return new Float32Array([1, 0, 0, 1, tx, ty]);
}

/**
 * Creates a rotation matrix.
 *
 * @param angle - The rotation angle in radians, clockwise.
 * @returns A new MatrixArray representing the rotation.
 */
export function rotate(angle: number): MatrixArray {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Float32Array([cos, sin, -sin, cos, 0, 0]);
}

/**
 * Creates a scale matrix.
 *
 * @param sx - Scale factor along the X axis.
 * @param sy - Scale factor along the Y axis.
 * @returns A new MatrixArray [sx, 0, 0, sy, 0, 0].
 */
export function scale(sx: number, sy: number): MatrixArray {
  return new Float32Array([sx, 0, 0, sy, 0, 0]);
}

/**
 * Creates a skew matrix.
 *
 * @param sx - Skew angle along the X axis in radians.
 * @param sy - Skew angle along the Y axis in radians.
 * @returns A new MatrixArray [1, tan(sy), tan(sx), 1, 0, 0].
 */
export function skew(sx: number, sy: number): MatrixArray {
  return new Float32Array([1, Math.tan(sy), Math.tan(sx), 1, 0, 0]);
}

/**
 * Inverts a matrix.
 *
 * @param mat - The matrix to invert.
 * @returns A new MatrixArray, or null if the matrix is singular (determinant is zero).
 */
export function invert(mat: MatrixArray): MatrixArray | null {
  const [a, b, c, d, tx, ty] = mat;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-10) {
    return null;
  }
  const invDet = 1 / det;
  return new Float32Array([
    d * invDet,
    -b * invDet,
    -c * invDet,
    a * invDet,
    (c * ty - d * tx) * invDet,
    (b * tx - a * ty) * invDet,
  ]);
}

/**
 * Transforms a point by a matrix.
 *
 * @param mat - The transformation matrix.
 * @param x - The X coordinate of the point.
 * @param y - The Y coordinate of the point.
 * @returns The transformed { x, y } coordinates.
 */
export function transformPoint(
  mat: MatrixArray,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: mat[0] * x + mat[2] * y + mat[4],
    y: mat[1] * x + mat[3] * y + mat[5],
  };
}
