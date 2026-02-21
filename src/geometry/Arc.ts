/**
 * Arc geometry primitive.
 *
 * Represents a circular arc defined by center, radius, and angle range.
 * Arcs can be drawn clockwise or counter-clockwise.
 *
 * @module Geometry
 * @example
 * ```typescript
 * import { Arc } from 'arena-2d';
 *
 * const arc = new Arc(0, 0, 50, 0, Math.PI / 2); // Quarter circle
 * console.log(arc.perimeter); // Arc length + radii
 * ```
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IArc } from './types';

/**
 * Concrete implementation of an arc geometry.
 */
export class Arc extends Geometry implements IArc {
  /** @inheritdoc */
  readonly type = 'arc';

  /** The center X coordinate in local space. */
  cx: number = 0;
  /** The center Y coordinate in local space. */
  cy: number = 0;
  /** The radius of the arc. */
  radius: number = 1;
  /** The start angle in radians. */
  startAngle: number = 0;
  /** The end angle in radians. */
  endAngle: number = Math.PI * 2;
  /** Whether the arc is drawn counter-clockwise. */
  counterclockwise: boolean = false;

  /**
   * Creates a new Arc.
   * @param cx - Local center X.
   * @param cy - Local center Y.
   * @param radius - The radius.
   * @param startAngle - Start angle in radians.
   * @param endAngle - End angle in radians.
   * @param counterclockwise - Draw counter-clockwise if true.
   */
  constructor(
    cx: number = 0,
    cy: number = 0,
    radius: number = 1,
    startAngle: number = 0,
    endAngle: number = Math.PI * 2,
    counterclockwise: boolean = false,
  ) {
    super();
    this.cx = cx;
    this.cy = cy;
    this.radius = Math.max(radius, Number.EPSILON);
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.counterclockwise = counterclockwise;
  }

  /** @inheritdoc */
  protected getLocalBounds(): IRect {
    // Approximate bounds by checking arc endpoints and extrema
    const startX = this.cx + Math.cos(this.startAngle) * this.radius;
    const startY = this.cy + Math.sin(this.startAngle) * this.radius;
    const endX = this.cx + Math.cos(this.endAngle) * this.radius;
    const endY = this.cy + Math.sin(this.endAngle) * this.radius;

    let minX = Math.min(startX, endX);
    let maxX = Math.max(startX, endX);
    let minY = Math.min(startY, endY);
    let maxY = Math.max(startY, endY);

    // Check if extrema are within the arc
    for (const extrema of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      if (this.angleInArc(extrema)) {
        const x = this.cx + Math.cos(extrema) * this.radius;
        const y = this.cy + Math.sin(extrema) * this.radius;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
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
   * Checks if an angle is within the arc's angle range.
   * @private
   */
  private angleInArc(angle: number): boolean {
    let a = angle % (2 * Math.PI);
    let start = this.startAngle % (2 * Math.PI);
    let end = this.endAngle % (2 * Math.PI);

    if (!this.counterclockwise) {
      if (start <= end) {
        return a >= start && a <= end;
      } else {
        return a >= start || a <= end;
      }
    } else {
      if (start >= end) {
        return a <= start && a >= end;
      } else {
        return a <= start || a >= end;
      }
    }
  }

  /** @inheritdoc */
  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.cx;
    const dy = local.y - this.cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    if (this.angleInArc(angle)) {
      return Math.max(0, distance - this.radius);
    }

    // Point is not in arc angle range, find distance to nearest endpoint
    const startX = this.cx + Math.cos(this.startAngle) * this.radius;
    const startY = this.cy + Math.sin(this.startAngle) * this.radius;
    const endX = this.cx + Math.cos(this.endAngle) * this.radius;
    const endY = this.cy + Math.sin(this.endAngle) * this.radius;

    const d1 = Math.sqrt((local.x - startX) ** 2 + (local.y - startY) ** 2);
    const d2 = Math.sqrt((local.x - endX) ** 2 + (local.y - endY) ** 2);

    return Math.min(d1, d2);
  }

  /** @inheritdoc */
  closestPointTo(x: number, y: number): { x: number; y: number } {
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.cx;
    const dy = local.y - this.cy;
    const angle = Math.atan2(dy, dx);

    if (this.angleInArc(angle)) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / dist;
      const ny = dy / dist;
      return this.localToWorld(this.cx + nx * this.radius, this.cy + ny * this.radius);
    }

    // Find closest endpoint
    const startX = this.cx + Math.cos(this.startAngle) * this.radius;
    const startY = this.cy + Math.sin(this.startAngle) * this.radius;
    const endX = this.cx + Math.cos(this.endAngle) * this.radius;
    const endY = this.cy + Math.sin(this.endAngle) * this.radius;

    const d1 = (local.x - startX) ** 2 + (local.y - startY) ** 2;
    const d2 = (local.x - endX) ** 2 + (local.y - endY) ** 2;

    return d1 < d2 ? this.localToWorld(startX, startY) : this.localToWorld(endX, endY);
  }

  /** @inheritdoc */
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    const fx = local1.x - this.cx;
    const fy = local1.y - this.cy;
    const dx = local2.x - local1.x;
    const dy = local2.y - local1.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - this.radius * this.radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return [];

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    const results: Array<{ x: number; y: number }> = [];

    for (const t of [t1, t2]) {
      if (t >= 0 && t <= 1) {
        const ix = local1.x + t * dx;
        const iy = local1.y + t * dy;
        const angle = Math.atan2(iy - this.cy, ix - this.cx);
        if (this.angleInArc(angle)) {
          results.push(this.localToWorld(ix, iy));
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
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.cx;
    const dy = local.y - this.cy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (Math.abs(distance - this.radius) > 1e-6) return false;

    const angle = Math.atan2(dy, dx);
    return this.angleInArc(angle);
  }

  /** @inheritdoc */
  get area(): number {
    // Area of circular sector
    let angle = this.endAngle - this.startAngle;
    if (this.counterclockwise && angle > 0) angle = 2 * Math.PI - angle;
    if (!this.counterclockwise && angle < 0) angle = 2 * Math.PI + angle;

    const scale = Math.abs(this.scaleX * this.scaleY);
    const r = this.radius * Math.sqrt(Math.abs(this.scaleX * this.scaleY));
    return Math.abs(angle) * r * r * 0.5;
  }

  /** @inheritdoc */
  get perimeter(): number {
    // Arc length + radii to endpoints
    let angle = this.endAngle - this.startAngle;
    if (this.counterclockwise && angle > 0) angle = 2 * Math.PI - angle;
    if (!this.counterclockwise && angle < 0) angle = 2 * Math.PI + angle;

    const scale = Math.sqrt(Math.abs(this.scaleX * this.scaleY));
    const r = this.radius * scale;
    return Math.abs(angle) * r + 2 * r;
  }

  /** @inheritdoc */
  pointAt(t: number): { x: number; y: number } {
    let angle = this.startAngle + ((t % 1) * (this.endAngle - this.startAngle));
    if (this.counterclockwise) angle = this.startAngle - ((t % 1) * (this.startAngle - this.endAngle));

    const x = this.cx + Math.cos(angle) * this.radius;
    const y = this.cy + Math.sin(angle) * this.radius;
    return this.localToWorld(x, y);
  }

  /** @inheritdoc */
  tangentAt(t: number): { x: number; y: number } {
    let angle = this.startAngle + ((t % 1) * (this.endAngle - this.startAngle));
    if (this.counterclockwise) angle = this.startAngle - ((t % 1) * (this.startAngle - this.endAngle));

    const dx = -Math.sin(angle);
    const dy = Math.cos(angle);
    return this.transformVector(dx, dy);
  }

  /** @inheritdoc */
  get centroid(): { x: number; y: number } {
    return this.localToWorld(this.cx, this.cy);
  }
}
