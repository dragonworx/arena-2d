/**
 * ITransform interface and concrete Transform class.
 *
 * Composes the local matrix as:
 *   T(x, y) × R(rotation) × S(scaleX, scaleY) × T(-pivotX, -pivotY)
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

/** Transform properties for 2D affine positioning. */
export interface ITransform {
  localMatrix: MatrixArray;
  worldMatrix: MatrixArray;
  x: number;
  y: number;
  /** Rotation in radians, clockwise. */
  rotation: number;
  /** Horizontal scale. Default: 1. Must not be 0. */
  scaleX: number;
  /** Vertical scale. Default: 1. Must not be 0. */
  scaleY: number;
  /** Horizontal skew in radians. Default: 0. */
  skewX: number;
  /** Vertical skew in radians. Default: 0. */
  skewY: number;
  /** Local-space pivot X. Default: 0. */
  pivotX: number;
  /** Local-space pivot Y. Default: 0. */
  pivotY: number;
  /** Recompute localMatrix from current property values. */
  updateLocalMatrix(): void;
}

/**
 * Concrete Transform implementation.
 *
 * Tracks transform properties and composes them into a local matrix.
 * The worldMatrix is computed as parentWorldMatrix × localMatrix.
 */
export class Transform implements ITransform {
  localMatrix: MatrixArray = identity();
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

  get x(): number {
    return this._x;
  }
  set x(value: number) {
    if (this._x !== value) {
      this._x = value;
      this._dirty = true;
    }
  }

  get y(): number {
    return this._y;
  }
  set y(value: number) {
    if (this._y !== value) {
      this._y = value;
      this._dirty = true;
    }
  }

  get rotation(): number {
    return this._rotation;
  }
  set rotation(value: number) {
    if (this._rotation !== value) {
      this._rotation = value;
      this._dirty = true;
    }
  }

  get scaleX(): number {
    return this._scaleX;
  }
  set scaleX(value: number) {
    if (this._scaleX !== value) {
      this._scaleX = value;
      this._dirty = true;
    }
  }

  get scaleY(): number {
    return this._scaleY;
  }
  set scaleY(value: number) {
    if (this._scaleY !== value) {
      this._scaleY = value;
      this._dirty = true;
    }
  }

  get skewX(): number {
    return this._skewX;
  }
  set skewX(value: number) {
    if (this._skewX !== value) {
      this._skewX = value;
      this._dirty = true;
    }
  }

  get skewY(): number {
    return this._skewY;
  }
  set skewY(value: number) {
    if (this._skewY !== value) {
      this._skewY = value;
      this._dirty = true;
    }
  }

  get pivotX(): number {
    return this._pivotX;
  }
  set pivotX(value: number) {
    if (this._pivotX !== value) {
      this._pivotX = value;
      this._dirty = true;
    }
  }

  get pivotY(): number {
    return this._pivotY;
  }
  set pivotY(value: number) {
    if (this._pivotY !== value) {
      this._pivotY = value;
      this._dirty = true;
    }
  }

  /** Returns true if transform properties have changed since last updateLocalMatrix(). */
  get isDirty(): boolean {
    return this._dirty;
  }

  /**
   * Recompute the local matrix from current property values.
   *
   * Composition: T(x, y) × R(rotation) × S(scaleX, scaleY) × T(-pivotX, -pivotY)
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
   * Update the world matrix given a parent's world matrix.
   * worldMatrix = parentWorldMatrix × localMatrix
   */
  updateWorldMatrix(parentWorldMatrix: MatrixArray): void {
    if (this._dirty) {
      this.updateLocalMatrix();
    }
    this.worldMatrix = multiply(parentWorldMatrix, this.localMatrix);
  }
}
