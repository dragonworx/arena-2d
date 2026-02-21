/**
 * 2D Vector with support for both Cartesian and Polar coordinate systems.
 */

import type { IVector } from './types';

export class Vector implements IVector {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Get the magnitude (length) of this vector.
   */
  get magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Get the angle (in radians) of this vector.
   * Returns the angle from the positive x-axis, counterclockwise.
   */
  get angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Create a vector from polar coordinates.
   */
  static fromPolar(magnitude: number, angle: number): Vector {
    return new Vector(magnitude * Math.cos(angle), magnitude * Math.sin(angle));
  }

  /**
   * Add another vector to this one and return a new vector.
   */
  add(other: IVector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract another vector from this one and return a new vector.
   */
  subtract(other: IVector): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  /**
   * Compute the dot product with another vector.
   */
  dot(other: IVector): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Compute the cross product (2D) with another vector.
   * Returns a scalar: this.x * other.y - this.y * other.x
   */
  cross(other: IVector): number {
    return this.x * other.y - this.y * other.x;
  }

  /**
   * Return a normalized copy of this vector.
   * If the magnitude is 0, returns a zero vector.
   */
  normalize(): Vector {
    const mag = this.magnitude;
    if (mag === 0) return new Vector(0, 0);
    return new Vector(this.x / mag, this.y / mag);
  }

  /**
   * Rotate this vector by an angle (in radians) and return a new vector.
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
   * Create a copy of this vector.
   */
  clone(): Vector {
    return new Vector(this.x, this.y);
  }
}
