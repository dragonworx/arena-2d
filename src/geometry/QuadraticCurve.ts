/**
 * Quadratic Bezier Curve geometry primitive.
 *
 * Represents a quadratic (2nd-degree) Bezier curve defined by a start point,
 * control point, and end point. The curve passes through both endpoints and is
 * influenced by the control point.
 *
 * @module Geometry
 * @example
 * ```typescript
 * import { QuadraticCurve } from 'arena-2d';
 *
 * const curve = new QuadraticCurve(0, 0, 50, 100, 100, 0);
 * const midpoint = curve.pointAt(0.5);
 * console.log(curve.perimeter); // Arc length
 * ```
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IQuadraticCurve } from './types';

/**
 * Concrete implementation of a quadratic Bezier curve.
 */
export class QuadraticCurve extends Geometry implements IQuadraticCurve {
  /** @inheritdoc */
  readonly type = 'quadraticCurve';

  /** Start point X coordinate. */
  x0: number = 0;
  /** Start point Y coordinate. */
  y0: number = 0;
  /** Control point X coordinate. */
  cpx: number = 0.5;
  /** Control point Y coordinate. */
  cpy: number = 0.5;
  /** End point X coordinate. */
  x1: number = 1;
  /** End point Y coordinate. */
  y1: number = 0;

  /**
   * Creates a new QuadraticCurve.
   * @param x0 - Start X.
   * @param y0 - Start Y.
   * @param cpx - Control point X.
   * @param cpy - Control point Y.
   * @param x1 - End X.
   * @param y1 - End Y.
   */
  constructor(x0: number = 0, y0: number = 0, cpx: number = 0.5, cpy: number = 0.5, x1: number = 1, y1: number = 0) {
    super();
    this.x0 = x0;
    this.y0 = y0;
    this.cpx = cpx;
    this.cpy = cpy;
    this.x1 = x1;
    this.y1 = y1;
  }

  /** @inheritdoc */
  protected getLocalBounds(): IRect {
    let minX = Math.min(this.x0, this.cpx, this.x1);
    let maxX = Math.max(this.x0, this.cpx, this.x1);
    let minY = Math.min(this.y0, this.cpy, this.y1);
    let maxY = Math.max(this.y0, this.cpy, this.y1);

    // Check for extrema
    const denom = 2 * (this.x0 - 2 * this.cpx + this.x1);
    if (Math.abs(denom) > 1e-6) {
      const t = (this.x0 - this.cpx) / denom;
      if (t > 0 && t < 1) {
        const x = this.getX(t);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }

    const denomY = 2 * (this.y0 - 2 * this.cpy + this.y1);
    if (Math.abs(denomY) > 1e-6) {
      const t = (this.y0 - this.cpy) / denomY;
      if (t > 0 && t < 1) {
        const y = this.getY(t);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Evaluates the X coordinate at parameter t.
   * @private
   */
  private getX(t: number): number {
    const mt = 1 - t;
    return mt * mt * this.x0 + 2 * mt * t * this.cpx + t * t * this.x1;
  }

  /**
   * Evaluates the Y coordinate at parameter t.
   * @private
   */
  private getY(t: number): number {
    const mt = 1 - t;
    return mt * mt * this.y0 + 2 * mt * t * this.cpy + t * t * this.y1;
  }

  /**
   * Evaluates the X derivative at parameter t.
   * @private
   */
  private getDerivativeX(t: number): number {
    const mt = 1 - t;
    return 2 * mt * (this.cpx - this.x0) + 2 * t * (this.x1 - this.cpx);
  }

  /**
   * Evaluates the Y derivative at parameter t.
   * @private
   */
  private getDerivativeY(t: number): number {
    const mt = 1 - t;
    return 2 * mt * (this.cpy - this.y0) + 2 * t * (this.y1 - this.cpy);
  }

  /** @inheritdoc */
  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    let minDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const cx = this.getX(t);
      const cy = this.getY(t);
      const dx = cx - local.x;
      const dy = cy - local.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  /** @inheritdoc */
  closestPointTo(x: number, y: number): { x: number; y: number } {
    const local = this.worldToLocal(x, y);
    let minDistance = Number.POSITIVE_INFINITY;
    let bestT = 0;

    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const cx = this.getX(t);
      const cy = this.getY(t);
      const dx = cx - local.x;
      const dy = cy - local.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        bestT = t;
      }
    }

    return this.localToWorld(this.getX(bestT), this.getY(bestT));
  }

  /** @inheritdoc */
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    const results: Array<{ x: number; y: number }> = [];
    const samples = 100;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const cx = this.getX(t);
      const cy = this.getY(t);

      // Check if point is close to line
      const dx = local2.x - local1.x;
      const dy = local2.y - local1.y;
      const lengthSq = dx * dx + dy * dy;

      if (lengthSq === 0) continue;

      const u = ((cx - local1.x) * dx + (cy - local1.y) * dy) / lengthSq;
      if (u < 0 || u > 1) continue;

      const px = local1.x + u * dx;
      const py = local1.y + u * dy;
      const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);

      if (dist < 1.0) {
        // Remove duplicates
        if (!results.some(r => {
          const lr = this.worldToLocal(r.x, r.y);
          return Math.abs(lr.x - cx) < 1.0 && Math.abs(lr.y - cy) < 1.0;
        })) {
          results.push(this.localToWorld(cx, cy));
        }
      }
    }

    return results;
  }

  /** @inheritdoc */
  intersectsShape(shape: any): Array<{ x: number; y: number }> {
    const results: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const pt = shape.pointAt(t);
      if (this.containsPoint(pt.x, pt.y)) {
        results.push(pt);
      }
    }
    return results;
  }

  /** @inheritdoc */
  containsPoint(x: number, y: number): boolean {
    const closest = this.closestPointTo(x, y);
    return Math.abs(closest.x - x) < 1e-6 && Math.abs(closest.y - y) < 1e-6;
  }

  /** @inheritdoc */
  get area(): number {
    return 0; // Curves have no area
  }

  /** @inheritdoc */
  get perimeter(): number {
    let length = 0;
    let prevX = this.x0;
    let prevY = this.y0;

    for (let i = 1; i <= 64; i++) {
      const t = i / 64;
      const x = this.getX(t);
      const y = this.getY(t);
      const dx = x - prevX;
      const dy = y - prevY;
      length += Math.sqrt(dx * dx + dy * dy);
      prevX = x;
      prevY = y;
    }

    const scale = Math.sqrt(Math.abs(this.scaleX * this.scaleY));
    return length * scale;
  }

  /** @inheritdoc */
  pointAt(t: number): { x: number; y: number } {
    const clamped = Math.max(0, Math.min(1, t));
    const x = this.getX(clamped);
    const y = this.getY(clamped);
    return this.localToWorld(x, y);
  }

  /** @inheritdoc */
  tangentAt(t: number): { x: number; y: number } {
    const clamped = Math.max(0, Math.min(1, t));
    const dx = this.getDerivativeX(clamped);
    const dy = this.getDerivativeY(clamped);
    return this.transformVector(dx, dy);
  }

  /** @inheritdoc */
  get centroid(): { x: number; y: number } {
    return this.localToWorld(this.getX(0.5), this.getY(0.5));
  }
}
