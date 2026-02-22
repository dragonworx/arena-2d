/**
 * Ellipse geometry primitive.
 *
 * Represents an ellipse defined by a center point `(cx, cy)` and radii `(rx, ry)`.
 *
 * @module Geometry
 * @example
 * ```typescript
 * import { Ellipse } from 'arena-2d';
 *
 * const ellipse = new Ellipse(100, 100, 80, 40);
 * console.log(ellipse.perimeter); // Ramanujan's approximation
 * ```
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IEllipse } from './types';

/**
 * Concrete implementation of an ellipse.
 */
export class Ellipse extends Geometry implements IEllipse {
  /** @inheritdoc */
  readonly type = 'ellipse';

  /** The center X coordinate in local space. */
  cx: number = 0;
  /** The center Y coordinate in local space. */
  cy: number = 0;
  /** The horizontal radius. */
  rx: number = 1;
  /** The vertical radius. */
  ry: number = 1;

  /**
   * Creates a new Ellipse.
   * @param cx - Local center X.
   * @param cy - Local center Y.
   * @param rx - Horizontal radius.
   * @param ry - Vertical radius.
   */
  constructor(cx: number = 0, cy: number = 0, rx: number = 1, ry: number = 1) {
    super();
    this.cx = cx;
    this.cy = cy;
    this.rx = Math.max(rx, Number.EPSILON);
    this.ry = Math.max(ry, Number.EPSILON);
  }

  /** @inheritdoc */
  protected getLocalBounds(): IRect {
    return {
      x: this.cx - this.rx,
      y: this.cy - this.ry,
      width: this.rx * 2,
      height: this.ry * 2,
    };
  }

  /** @inheritdoc */
  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    const px = local.x - this.cx;
    const py = local.y - this.cy;

    // Approximate distance using iterative method
    let t = Math.atan2(py * this.rx, px * this.ry);
    for (let i = 0; i < 3; i++) {
      const cost = Math.cos(t);
      const sint = Math.sin(t);
      const fx = (this.rx * cost - px) * this.ry * sint - (this.ry * sint - py) * this.rx * cost;
      const fpx = (this.rx * cost - px) * (-this.rx * sint) - (this.ry * sint - py) * this.ry * cost;
      const fpy = (this.rx * cost - px) * this.ry * cost - (this.ry * sint - py) * (-this.rx * sint);
      const f = fx * fx + (fpx * fpx + fpy * fpy);
      if (f < 1e-12) break;
      t -= fx / (fpx * fpx + fpy * fpy);
    }

    const cost = Math.cos(t);
    const sint = Math.sin(t);
    const ex = this.rx * cost;
    const ey = this.ry * sint;
    const dx = px - ex;
    const dy = py - ey;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** @inheritdoc */
  closestPointTo(x: number, y: number): { x: number; y: number } {
    const local = this.worldToLocal(x, y);
    const px = local.x - this.cx;
    const py = local.y - this.cy;

    // Find closest point on ellipse
    let t = Math.atan2(py * this.rx, px * this.ry);
    for (let i = 0; i < 3; i++) {
      const cost = Math.cos(t);
      const sint = Math.sin(t);
      const fx = (this.rx * cost - px) * this.ry * sint - (this.ry * sint - py) * this.rx * cost;
      const fpx = (this.rx * cost - px) * (-this.rx * sint) - (this.ry * sint - py) * this.ry * cost;
      const fpy = (this.rx * cost - px) * this.ry * cost - (this.ry * sint - py) * (-this.rx * sint);
      const denom = fpx * fpx + fpy * fpy;
      if (denom < 1e-12) break;
      t -= fx / denom;
    }

    const cost = Math.cos(t);
    const sint = Math.sin(t);
    const ex = this.cx + this.rx * cost;
    const ey = this.cy + this.ry * sint;
    return this.localToWorld(ex, ey);
  }

  /** @inheritdoc */
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    // Parametric line: p(s) = p1 + s*(p2-p1)
    // Ellipse: (x-cx)²/rx² + (y-cy)²/ry² = 1
    const dx = local2.x - local1.x;
    const dy = local2.y - local1.y;
    const fx = local1.x - this.cx;
    const fy = local1.y - this.cy;

    const a = (dx * dx) / (this.rx * this.rx) + (dy * dy) / (this.ry * this.ry);
    const b = 2 * ((fx * dx) / (this.rx * this.rx) + (fy * dy) / (this.ry * this.ry));
    const c = (fx * fx) / (this.rx * this.rx) + (fy * fy) / (this.ry * this.ry) - 1;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return [];

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    const results: Array<{ x: number; y: number }> = [];

    if (t1 >= 0 && t1 <= 1) {
      results.push(this.localToWorld(local1.x + t1 * dx, local1.y + t1 * dy));
    }
    if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-6) {
      results.push(this.localToWorld(local1.x + t2 * dx, local1.y + t2 * dy));
    }

    return results;
  }

  /** @inheritdoc */
  containsPoint(x: number, y: number): boolean {
    const local = this.worldToLocal(x, y);
    const px = (local.x - this.cx) / this.rx;
    const py = (local.y - this.cy) / this.ry;
    return px * px + py * py <= 1;
  }

  /** @inheritdoc */
  get area(): number {
    const sx = Math.abs(this.scaleX);
    const sy = Math.abs(this.scaleY);
    const rx = this.rx * sx;
    const ry = this.ry * sy;
    return Math.PI * rx * ry;
  }

  /** @inheritdoc */
  get perimeter(): number {
    const sx = Math.abs(this.scaleX);
    const sy = Math.abs(this.scaleY);
    const rx = this.rx * sx;
    const ry = this.ry * sy;

    // Ramanujan's approximation
    const h = ((rx - ry) * (rx - ry)) / ((rx + ry) * (rx + ry));
    return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  }

  /** @inheritdoc */
  pointAt(t: number): { x: number; y: number } {
    const angle = (t % 1) * 2 * Math.PI;
    const x = this.cx + this.rx * Math.cos(angle);
    const y = this.cy + this.ry * Math.sin(angle);
    return this.localToWorld(x, y);
  }

  /** @inheritdoc */
  tangentAt(t: number): { x: number; y: number } {
    const angle = (t % 1) * 2 * Math.PI;
    const dx = -this.rx * Math.sin(angle);
    const dy = this.ry * Math.cos(angle);
    return this.transformVector(dx, dy);
  }

  /** @inheritdoc */
  get centroid(): { x: number; y: number } {
    return this.localToWorld(this.cx, this.cy);
  }
}
