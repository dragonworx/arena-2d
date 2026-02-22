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

    const intersection = Geometry.lineSegmentIntersection(
      this.x1, this.y1, this.x2, this.y2,
      local1.x, local1.y, local2.x, local2.y,
    );

    if (intersection) {
      return [this.localToWorld(intersection.x, intersection.y)];
    }

    return [];
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
    return 2 * length * this.uniformScale;
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
