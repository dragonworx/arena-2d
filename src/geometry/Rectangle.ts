/**
 * Rectangle geometry primitive.
 *
 * Represents an axis-aligned rectangle in local space, defined by a top-left
 * corner `(rectX, rectY)` and dimensions `(width, height)`.
 *
 * @module Geometry
 * @example
 * ```typescript
 * import { Rectangle } from 'arena-2d';
 *
 * const rect = new Rectangle(0, 0, 200, 100);
 * rect.rotation = Math.PI / 4; // Rotate the rectangle
 * console.log(rect.containsPoint(50, 50)); // Hit test in world space
 * ```
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IRectangle } from './types';

/**
 * Concrete implementation of a rectangle.
 */
export class Rectangle extends Geometry implements IRectangle {
  /** @inheritdoc */
  readonly type = 'rectangle';

  /** The top-left X coordinate in local space. */
  rectX: number = 0;
  /** The top-left Y coordinate in local space. */
  rectY: number = 0;
  /** The width of the rectangle. */
  width: number = 1;
  /** The height of the rectangle. */
  height: number = 1;

  /**
   * Creates a new Rectangle.
   * @param rectX - Local X.
   * @param rectY - Local Y.
   * @param width - The width.
   * @param height - The height.
   */
  constructor(rectX: number = 0, rectY: number = 0, width: number = 1, height: number = 1) {
    super();
    this.rectX = rectX;
    this.rectY = rectY;
    this.width = Math.max(width, Number.EPSILON);
    this.height = Math.max(height, Number.EPSILON);
  }

  /** @inheritdoc */
  protected getLocalBounds(): IRect {
    return {
      x: this.rectX,
      y: this.rectY,
      width: this.width,
      height: this.height,
    };
  }

  /** @inheritdoc */
  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    const x1 = this.rectX;
    const y1 = this.rectY;
    const x2 = this.rectX + this.width;
    const y2 = this.rectY + this.height;

    const dx = Math.max(x1 - local.x, 0, local.x - x2);
    const dy = Math.max(y1 - local.y, 0, local.y - y2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** @inheritdoc */
  closestPointTo(x: number, y: number): { x: number; y: number } {
    const local = this.worldToLocal(x, y);
    const x1 = this.rectX;
    const y1 = this.rectY;
    const x2 = this.rectX + this.width;
    const y2 = this.rectY + this.height;

    const cx = Math.max(x1, Math.min(local.x, x2));
    const cy = Math.max(y1, Math.min(local.y, y2));
    return this.localToWorld(cx, cy);
  }

  /** @inheritdoc */
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    const rx1 = this.rectX;
    const ry1 = this.rectY;
    const rx2 = this.rectX + this.width;
    const ry2 = this.rectY + this.height;

    const intersections: Array<{ x: number; y: number }> = [];

    // Check intersection with four edges
    // Top edge
    this.checkLineSegmentIntersection(local1, local2, { x: rx1, y: ry1 }, { x: rx2, y: ry1 }, intersections);
    // Bottom edge
    this.checkLineSegmentIntersection(local1, local2, { x: rx1, y: ry2 }, { x: rx2, y: ry2 }, intersections);
    // Left edge
    this.checkLineSegmentIntersection(local1, local2, { x: rx1, y: ry1 }, { x: rx1, y: ry2 }, intersections);
    // Right edge
    this.checkLineSegmentIntersection(local1, local2, { x: rx2, y: ry1 }, { x: rx2, y: ry2 }, intersections);

    // Remove duplicates
    const unique: Array<{ x: number; y: number }> = [];
    for (const pt of intersections) {
      if (!unique.some(p => Math.abs(p.x - pt.x) < 1e-6 && Math.abs(p.y - pt.y) < 1e-6)) {
        unique.push(pt);
      }
    }

    return unique.map(pt => this.localToWorld(pt.x, pt.y));
  }

  /**
   * Helper to check intersection between two line segments.
   *
   * @private
   */
  private checkLineSegmentIntersection(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number },
    results: Array<{ x: number; y: number }>,
  ): void {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      results.push({
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      });
    }
  }

  /** @inheritdoc */
  intersectsShape(shape: any): Array<{ x: number; y: number }> {
    // Simple approach: sample the shape and check containment
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
    return (
      local.x >= this.rectX &&
      local.x <= this.rectX + this.width &&
      local.y >= this.rectY &&
      local.y <= this.rectY + this.height
    );
  }

  /** @inheritdoc */
  get area(): number {
    const sx = Math.abs(this.scaleX);
    const sy = Math.abs(this.scaleY);
    return this.width * this.height * sx * sy;
  }

  /** @inheritdoc */
  get perimeter(): number {
    const sx = Math.abs(this.scaleX);
    const sy = Math.abs(this.scaleY);
    return 2 * (this.width * sx + this.height * sy);
  }

  /** @inheritdoc */
  pointAt(t: number): { x: number; y: number } {
    const perimeter = 2 * (this.width + this.height);
    const distance = (t % 1) * perimeter;
    let d = 0;

    // Top edge (left to right)
    if (distance < this.width) {
      return this.localToWorld(this.rectX + distance, this.rectY);
    }
    d += this.width;

    // Right edge (top to bottom)
    if (distance < d + this.height) {
      return this.localToWorld(this.rectX + this.width, this.rectY + (distance - d));
    }
    d += this.height;

    // Bottom edge (right to left)
    if (distance < d + this.width) {
      return this.localToWorld(this.rectX + this.width - (distance - d), this.rectY + this.height);
    }

    // Left edge (bottom to top)
    return this.localToWorld(this.rectX, this.rectY + this.height - (distance - d - this.width));
  }

  /** @inheritdoc */
  tangentAt(t: number): { x: number; y: number } {
    const perimeter = 2 * (this.width + this.height);
    const distance = (t % 1) * perimeter;

    if (distance < this.width) {
      return this.transformVector(1, 0);
    }
    if (distance < this.width + this.height) {
      return this.transformVector(0, 1);
    }
    if (distance < 2 * this.width + this.height) {
      return this.transformVector(-1, 0);
    }
    return this.transformVector(0, -1);
  }

  /** @inheritdoc */
  get centroid(): { x: number; y: number } {
    const cx = this.rectX + this.width / 2;
    const cy = this.rectY + this.height / 2;
    return this.localToWorld(cx, cy);
  }
}
