/**
 * 2D Affine Transformation system.
 *
 * Composes the local matrix as:
 * `Translate(x, y) × Rotate(rotation) × Skew(skewX, skewY) × Scale(scaleX, scaleY) × Translate(-pivotX, -pivotY)`
 *
 * @module Math
 * @example
 * ```typescript
 * import { Transform } from 'arena-2d';
 *
 * const transform = new Transform();
 * transform.x = 100;
 * transform.y = 50;
 * transform.rotation = Math.PI / 4;
 * transform.updateLocalMatrix();
 * ```
 */

import {
  type MatrixArray,
  identity,
  multiply,
  rotate,
  scale,
  skew,
  translate,
} from "./matrix";

/**
 * Interface for 2D transform properties and operations.
 */
export interface ITransform {
  /** The 6-element local transformation matrix. */
  localMatrix: MatrixArray;
  /** The 6-element world transformation matrix (accumulated through parent chain). */
  worldMatrix: MatrixArray;
  /** The X coordinate of the transform origin in parent space. */
  x: number;
  /** The Y coordinate of the transform origin in parent space. */
  y: number;
  /** The rotation angle in radians, clockwise. */
  rotation: number;
  /** Horizontal scale factor. Default: 1. Must not be 0. */
  scaleX: number;
  /** Vertical scale factor. Default: 1. Must not be 0. */
  scaleY: number;
  /** Horizontal skew angle in radians. Default: 0. */
  skewX: number;
  /** Vertical skew angle in radians. Default: 0. */
  skewY: number;
  /** The X coordinate of the local pivot point. Default: 0. */
  pivotX: number;
  /** The Y coordinate of the local pivot point. Default: 0. */
  pivotY: number;
  /**
   * Recomputes the local matrix from the current property values.
   */
  updateLocalMatrix(): void;
}

/**
 * Concrete implementation of a 2D transform.
 *
 * It manages individual properties (position, rotation, scale, skew, pivot)
 * and composes them into a single affine transformation matrix.
 */
export class Transform implements ITransform {
  /** @inheritdoc */
  localMatrix: MatrixArray = identity();
  /** @inheritdoc */
  worldMatrix: MatrixArray = identity();

  private _x = 0;
  private _y = 0;
  private _rotation = 0;
  private _scaleX = 1;
  private _scaleY = 1;
  private _skewX = 0;
  private _skewY = 0;
  private _pivotX = 0;
  private _pivotY = 0;
  private _dirty = true;

  /** The X coordinate of the transform origin in parent space. */
  get x(): number {
    return this._x;
  }
  set x(value: number) {
    if (this._x !== value) {
      this._x = value;
      this._dirty = true;
    }
  }

  /** The Y coordinate of the transform origin in parent space. */
  get y(): number {
    return this._y;
  }
  set y(value: number) {
    if (this._y !== value) {
      this._y = value;
      this._dirty = true;
    }
  }

  /** The rotation angle in radians, clockwise. */
  get rotation(): number {
    return this._rotation;
  }
  set rotation(value: number) {
    if (this._rotation !== value) {
      this._rotation = value;
      this._dirty = true;
    }
  }

  /** Horizontal scale factor. Default: 1. */
  get scaleX(): number {
    return this._scaleX;
  }
  set scaleX(value: number) {
    if (this._scaleX !== value) {
      this._scaleX = value;
      this._dirty = true;
    }
  }

  /** Vertical scale factor. Default: 1. */
  get scaleY(): number {
    return this._scaleY;
  }
  set scaleY(value: number) {
    if (this._scaleY !== value) {
      this._scaleY = value;
      this._dirty = true;
    }
  }

  /** Horizontal skew angle in radians. Default: 0. */
  get skewX(): number {
    return this._skewX;
  }
  set skewX(value: number) {
    if (this._skewX !== value) {
      this._skewX = value;
      this._dirty = true;
    }
  }

  /** Vertical skew angle in radians. Default: 0. */
  get skewY(): number {
    return this._skewY;
  }
  set skewY(value: number) {
    if (this._skewY !== value) {
      this._skewY = value;
      this._dirty = true;
    }
  }

  /** The X coordinate of the local pivot point. Default: 0. */
  get pivotX(): number {
    return this._pivotX;
  }
  set pivotX(value: number) {
    if (this._pivotX !== value) {
      this._pivotX = value;
      this._dirty = true;
    }
  }

  /** The Y coordinate of the local pivot point. Default: 0. */
  get pivotY(): number {
    return this._pivotY;
  }
  set pivotY(value: number) {
    if (this._pivotY !== value) {
      this._pivotY = value;
      this._dirty = true;
    }
  }

  /**
   * Returns true if any transform properties have changed since the last matrix update.
   */
  get isDirty(): boolean {
    return this._dirty;
  }

  /**
   * Recomputes the local matrix from the current property values.
   *
   * Composition order:
   * `Translate(x, y) × Rotate(rotation) × Skew(skewX, skewY) × Scale(scaleX, scaleY) × Translate(-pivotX, -pivotY)`
   *
   * The pivot point (pivotX, pivotY) in local space always maps to (x, y) in parent space.
   */
  updateLocalMatrix(): void {
    // T(x, y)
    const t1 = translate(this._x, this._y);
    // R(rotation)
    const r = rotate(this._rotation);
    // Skew(skewX, skewY)
    const sk = skew(this._skewX, this._skewY);
    // S(scaleX, scaleY)
    const s = scale(this._scaleX, this._scaleY);
    // T(-px, -py)
    const t2 = translate(-this._pivotX, -this._pivotY);

    // Compose: T1 × R × Sk × S × T2
    this.localMatrix = multiply(multiply(multiply(multiply(t1, r), sk), s), t2);
    this._dirty = false;
  }

  /**
   * Updates the world matrix given a parent's world matrix.
   *
   * Result: `worldMatrix = parentWorldMatrix × localMatrix`
   *
   * @param parentWorldMatrix - The cumulative transformation of the parent element.
   */
  updateWorldMatrix(parentWorldMatrix: MatrixArray): void {
    if (this._dirty) {
      this.updateLocalMatrix();
    }
    this.worldMatrix = multiply(parentWorldMatrix, this.localMatrix);
  }
}
