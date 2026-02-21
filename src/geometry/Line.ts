/**
 * Line segment geometry primitive.
 *
 * Represents a finite line connecting two points `(x1, y1)` and `(x2, y2)`.
 *
 * @module Geometry
 * @example
 * ```typescript
 * import { Line } from 'arena-2d';
 *
 * const line = new Line(0, 0, 100, 100);
 * console.log(line.perimeter); // Length of the line
 * console.log(line.pointAt(0.5)); // Center point
 * ```
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { ILine } from './types';

/**
 * Concrete implementation of a line segment.
 */
export class Line extends Geometry implements ILine {
  /** @inheritdoc */
  readonly type = 'line';

  /** Start X coordinate in local space. */
  x1: number = 0;
  /** Start Y coordinate in local space. */
  y1: number = 0;
  /** End X coordinate in local space. */
  x2: number = 1;
  /** End Y coordinate in local space. */
  y2: number = 0;

  /**
   * Creates a new Line segment.
   * @param x1 - Start X.
   * @param y1 - Start Y.
   * @param x2 - End X.
   * @param y2 - End Y.
   */
  constructor(x1: number = 0, y1: number = 0, x2: number = 1, y2: number = 0) {
    super();
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  /** @inheritdoc */
  protected getLocalBounds(): IRect {
    const minX = Math.min(this.x1, this.x2);
    const maxX = Math.max(this.x1, this.x2);
    const minY = Math.min(this.y1, this.y2);
    const maxY = Math.max(this.y1, this.y2);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /** @inheritdoc */
  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      const px = local.x - this.x1;
      const py = local.y - this.y1;
      return Math.sqrt(px * px + py * py);
    }

    let t = ((local.x - this.x1) * dx + (local.y - this.y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const px = local.x - (this.x1 + t * dx);
    const py = local.y - (this.y1 + t * dy);
    return Math.sqrt(px * px + py * py);
  }

  /** @inheritdoc */
  closestPointTo(x: number, y: number): { x: number; y: number } {
    const local = this.worldToLocal(x, y);
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return this.localToWorld(this.x1, this.y1);
    }

    let t = ((local.x - this.x1) * dx + (local.y - this.y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    return this.localToWorld(this.x1 + t * dx, this.y1 + t * dy);
  }

  /** @inheritdoc */
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    // Check if this line segment intersects with the given line segment
    const p1x = this.x1, p1y = this.y1;
    const p2x = this.x2, p2y = this.y2;
    const p3x = local1.x, p3y = local1.y;
    const p4x = local2.x, p4y = local2.y;

    const denom = (p1x - p2x) * (p3y - p4y) - (p1y - p2y) * (p3x - p4x);
    if (Math.abs(denom) < 1e-10) return [];

    const t = ((p1x - p3x) * (p3y - p4y) - (p1y - p3y) * (p3x - p4x)) / denom;
    const u = -((p1x - p2x) * (p1y - p3y) - (p1y - p2y) * (p1x - p3x)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return [this.localToWorld(p1x + t * (p2x - p1x), p1y + t * (p2y - p1y))];
    }

    return [];
  }

  /** @inheritdoc */
  intersectsShape(shape: any): Array<{ x: number; y: number }> {
    // Check if any part of the shape intersects with this line
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
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return Math.abs(local.x - this.x1) < 1e-6 && Math.abs(local.y - this.y1) < 1e-6;
    }

    const t = ((local.x - this.x1) * dx + (local.y - this.y1) * dy) / lengthSq;
    if (t < 0 || t > 1) return false;

    const px = this.x1 + t * dx;
    const py = this.y1 + t * dy;
    const distance = Math.sqrt((local.x - px) ** 2 + (local.y - py) ** 2);
    return distance < 1e-6;
  }

  /** @inheritdoc */
  get area(): number {
    return 0;
  }

  /** @inheritdoc */
  get perimeter(): number {
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const scale = Math.sqrt(Math.abs(this.scaleX * this.scaleY));
    return 2 * length * scale;
  }

  /** @inheritdoc */
  pointAt(t: number): { x: number; y: number } {
    const x = this.x1 + (this.x2 - this.x1) * (t % 1);
    const y = this.y1 + (this.y2 - this.y1) * (t % 1);
    return this.localToWorld(x, y);
  }

  /** @inheritdoc */
  tangentAt(t: number): { x: number; y: number } {
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    return this.transformVector(dx, dy);
  }

  /** @inheritdoc */
  get centroid(): { x: number; y: number } {
    const cx = (this.x1 + this.x2) / 2;
    const cy = (this.y1 + this.y2) / 2;
    return this.localToWorld(cx, cy);
  }
}
