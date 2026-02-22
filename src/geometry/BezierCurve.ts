/**
 * Bezier Curve geometry primitive.
 *
 * Represents a Bezier curve of arbitrary degree (quadratic, cubic, quartic, etc.)
 * defined by a series of control points. The curve passes through the first and
 * last control points and is influenced by intermediate control points.
 *
 * @module Geometry
 * @example
 * ```typescript
 * import { BezierCurve } from 'arena-2d';
 *
 * const curve = new BezierCurve([
 *   { x: 0, y: 0 },
 *   { x: 50, y: 100 },
 *   { x: 150, y: 100 },
 *   { x: 200, y: 0 }
 * ]); // Cubic Bezier curve
 * const pt = curve.pointAt(0.5);
 * ```
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IBezierCurve } from './types';

/**
 * Concrete implementation of a Bezier curve.
 */
export class BezierCurve extends Geometry implements IBezierCurve {
  /** @inheritdoc */
  readonly type = 'bezierCurve';

  /** The control points defining the curve. */
  controlPoints: Array<{ x: number; y: number }> = [];

  /**
   * Creates a new BezierCurve.
   * @param controlPoints - Array of control points (minimum 2 required).
   */
  constructor(controlPoints: Array<{ x: number; y: number }> = []) {
    super();
    this.controlPoints = controlPoints.length >= 2 ? controlPoints.slice() : [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  }

  /** @inheritdoc */
  protected getLocalBounds(): IRect {
    if (this.controlPoints.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = this.controlPoints[0].x;
    let maxX = this.controlPoints[0].x;
    let minY = this.controlPoints[0].y;
    let maxY = this.controlPoints[0].y;

    // Sample the curve
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const pt = this.evaluate(t);
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Evaluates the Bezier curve at parameter t using De Casteljau's algorithm.
   * @private
   */
  private evaluate(t: number): { x: number; y: number } {
    if (this.controlPoints.length === 0) return { x: 0, y: 0 };
    if (this.controlPoints.length === 1) return { ...this.controlPoints[0] };

    const points = this.controlPoints.map(p => ({ ...p }));
    let n = points.length - 1;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i; j++) {
        points[j].x = points[j].x * (1 - t) + points[j + 1].x * t;
        points[j].y = points[j].y * (1 - t) + points[j + 1].y * t;
      }
    }

    return points[0];
  }

  /**
   * Gets the derivative (tangent) of the Bezier curve at parameter t.
   * @private
   */
  private derivative(t: number): { x: number; y: number } {
    if (this.controlPoints.length < 2) return { x: 0, y: 0 };

    // Derivative control points
    const n = this.controlPoints.length - 1;
    const derivativePoints = [];
    for (let i = 0; i < n; i++) {
      derivativePoints.push({
        x: n * (this.controlPoints[i + 1].x - this.controlPoints[i].x),
        y: n * (this.controlPoints[i + 1].y - this.controlPoints[i].y),
      });
    }

    // Evaluate derivative at t
    let points = derivativePoints.map(p => ({ ...p }));
    for (let i = 0; i < derivativePoints.length - 1; i++) {
      for (let j = 0; j < derivativePoints.length - 1 - i; j++) {
        points[j].x = points[j].x * (1 - t) + points[j + 1].x * t;
        points[j].y = points[j].y * (1 - t) + points[j + 1].y * t;
      }
    }

    return points[0];
  }

  /** @inheritdoc */
  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    let minDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const pt = this.evaluate(t);
      const dx = pt.x - local.x;
      const dy = pt.y - local.y;
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
      const pt = this.evaluate(t);
      const dx = pt.x - local.x;
      const dy = pt.y - local.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        bestT = t;
      }
    }

    const pt = this.evaluate(bestT);
    return this.localToWorld(pt.x, pt.y);
  }

  /** @inheritdoc */
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    const results: Array<{ x: number; y: number }> = [];
    const samples = 100;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pt = this.evaluate(t);

      const dx = local2.x - local1.x;
      const dy = local2.y - local1.y;
      const lengthSq = dx * dx + dy * dy;

      if (lengthSq === 0) continue;

      const u = ((pt.x - local1.x) * dx + (pt.y - local1.y) * dy) / lengthSq;
      if (u < 0 || u > 1) continue;

      const px = local1.x + u * dx;
      const py = local1.y + u * dy;
      const dist = Math.sqrt((pt.x - px) ** 2 + (pt.y - py) ** 2);

      if (dist < 1.0) {
        if (!results.some(r => {
          const lr = this.worldToLocal(r.x, r.y);
          return Math.abs(lr.x - pt.x) < 1.0 && Math.abs(lr.y - pt.y) < 1.0;
        })) {
          results.push(this.localToWorld(pt.x, pt.y));
        }
      }
    }

    return results;
  }


  /** @inheritdoc */
  get area(): number {
    return 0; // Curves have no area
  }

  /** @inheritdoc */
  get perimeter(): number {
    let length = 0;
    let prevPt = this.evaluate(0);

    for (let i = 1; i <= 64; i++) {
      const t = i / 64;
      const pt = this.evaluate(t);
      const dx = pt.x - prevPt.x;
      const dy = pt.y - prevPt.y;
      length += Math.sqrt(dx * dx + dy * dy);
      prevPt = pt;
    }

    return length * this.uniformScale;
  }

  /** @inheritdoc */
  pointAt(t: number): { x: number; y: number } {
    const clamped = Math.max(0, Math.min(1, t));
    const pt = this.evaluate(clamped);
    return this.localToWorld(pt.x, pt.y);
  }

  /** @inheritdoc */
  tangentAt(t: number): { x: number; y: number } {
    const clamped = Math.max(0, Math.min(1, t));
    const deriv = this.derivative(clamped);
    return this.transformVector(deriv.x, deriv.y);
  }

  /** @inheritdoc */
  get centroid(): { x: number; y: number } {
    const pt = this.evaluate(0.5);
    return this.localToWorld(pt.x, pt.y);
  }
}
