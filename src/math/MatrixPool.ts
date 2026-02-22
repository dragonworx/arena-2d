/**
 * MatrixPool — Object pool for Float32Array matrices.
 *
 * Eliminates per-frame Float32Array allocations in matrix operations.
 * Typical usage: acquire a matrix for a temp calculation, use it, then release back to the pool.
 *
 * @module Math
 * @example
 * ```typescript
 * import { acquire, release } from './MatrixPool';
 *
 * const mat = acquire();
 * // Use mat...
 * release(mat);
 * ```
 */

/** Pool of reusable Float32Array matrices. */
const pool: Float32Array[] = [];
/** Maximum number of matrices to keep in the pool. Tune based on profiling. */
const MAX_POOL_SIZE = 256;

/**
 * Acquire a Float32Array matrix from the pool.
 * If the pool is empty, allocates a new one.
 * @returns A 6-element Float32Array (2x3 affine matrix) ready for use
 */
export function acquire(): Float32Array {
  if (pool.length > 0) {
    return pool.pop()!;
  }
  return new Float32Array(6);
}

/**
 * Release a matrix back to the pool for reuse.
 * Clears the data before returning to pool.
 * @param mat - The matrix to release
 */
export function release(mat: Float32Array): void {
  if (pool.length < MAX_POOL_SIZE) {
    // Clear data (set identity matrix for safety)
    mat[0] = 1; mat[1] = 0;
    mat[2] = 0; mat[3] = 1;
    mat[4] = 0; mat[5] = 0;
    pool.push(mat);
  }
}
