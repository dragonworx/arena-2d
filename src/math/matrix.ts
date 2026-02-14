/**
 * Core 2D affine transformation matrix operations.
 *
 * Matrices are stored as Float32Array(6) in column-major order: [a, b, c, d, tx, ty]
 * matching the HTML Canvas setTransform(a, b, c, d, e, f) parameter order.
 *
 * | a  c  tx |
 * | b  d  ty |
 * | 0  0   1 |
 */

/** A 2D affine transformation matrix stored as Float32Array(6). */
export type MatrixArray = Float32Array;

/** Create a new identity matrix. */
export function identity(): MatrixArray {
  return new Float32Array([1, 0, 0, 1, 0, 0]);
}

/**
 * Multiply two matrices: out = a × b (left-multiply; a is left operand).
 * Returns a new MatrixArray.
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

/** Create a translation matrix. */
export function translate(tx: number, ty: number): MatrixArray {
  return new Float32Array([1, 0, 0, 1, tx, ty]);
}

/** Create a rotation matrix (angle in radians, clockwise). */
export function rotate(angle: number): MatrixArray {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Float32Array([cos, sin, -sin, cos, 0, 0]);
}

/** Create a scale matrix. */
export function scale(sx: number, sy: number): MatrixArray {
  return new Float32Array([sx, 0, 0, sy, 0, 0]);
}

/** Create a skew matrix (angles in radians). */
export function skew(sx: number, sy: number): MatrixArray {
  return new Float32Array([1, Math.tan(sy), Math.tan(sx), 1, 0, 0]);
}

/**
 * Invert a matrix. Returns a new MatrixArray, or null if the matrix is singular.
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
 * Transform a point by a matrix.
 * Returns the transformed { x, y }.
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
