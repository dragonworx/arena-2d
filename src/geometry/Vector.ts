/**
 * 2D Vector with support for both Cartesian and Polar coordinate systems.
 *
 * Vectors represent a direction and magnitude in 2D space.
 *
 * @module Geometry
 * @example
 * ```typescript
 * import { Vector } from 'arena-2d';
 *
 * const v1 = new Vector(10, 0);
 * const v2 = Vector.fromPolar(10, Math.PI / 2);
 * const v3 = v1.add(v2);
 * console.log(v3.magnitude); // ~14.14
 * ```
 */

import type { IVector } from './types';

/**
 * Concrete implementation of a 2D vector.
 */
export class Vector implements IVector {
  /** The X component. */
  x: number;
  /** The Y component. */
  y: number;

  /**
   * Creates a new Vector.
   * @param x - Initial X component.
   * @param y - Initial Y component.
   */
  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Returns the magnitude (length) of this vector.
   */
  get magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Returns the angle (in radians) of this vector.
   * Measured from the positive X axis, counter-clockwise.
   */
  get angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Creates a vector from polar coordinates.
   *
   * @param magnitude - The length of the vector.
   * @param angle - The direction in radians.
   * @returns A new Vector instance.
   */
  static fromPolar(magnitude: number, angle: number): Vector {
    return new Vector(magnitude * Math.cos(angle), magnitude * Math.sin(angle));
  }

  /**
   * Adds another vector to this one.
   *
   * @param other - The vector to add.
   * @returns A new Vector representing the sum.
   */
  add(other: IVector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtracts another vector from this one.
   *
   * @param other - The vector to subtract.
   * @returns A new Vector representing the difference.
   */
  subtract(other: IVector): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  /**
   * Computes the dot product with another vector.
   *
   * @param other - The vector to multiply with.
   * @returns The scalar dot product.
   */
  dot(other: IVector): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Computes the 2D cross product with another vector.
   *
   * Result is a scalar: `this.x * other.y - this.y * other.x`
   *
   * @param other - The vector to multiply with.
   * @returns The scalar cross product.
   */
  cross(other: IVector): number {
    return this.x * other.y - this.y * other.x;
  }

  /**
   * Returns a normalized copy of this vector (unit length).
   *
   * If the magnitude is 0, returns a zero vector {0, 0}.
   *
   * @returns A new normalized Vector.
   */
  normalize(): Vector {
    const mag = this.magnitude;
    if (mag === 0) return new Vector(0, 0);
    return new Vector(this.x / mag, this.y / mag);
  }

  /**
   * Rotates this vector by an angle.
   *
   * @param radians - The angle to rotate by in radians.
   * @returns A new rotated Vector.
   */
  rotate(radians: number): Vector {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return new Vector(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos,
    );
  }

  /**
   * Creates a deep copy of this vector.
   *
   * @returns A new Vector instance.
   */
  clone(): Vector {
    return new Vector(this.x, this.y);
  }
}
