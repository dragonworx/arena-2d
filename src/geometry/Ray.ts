/**
 * Ray geometry primitive.
 * A ray has an origin and a direction, and extends infinitely in that direction.
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IRay } from './types';

export class Ray extends Geometry implements IRay {
  readonly type = 'ray';

  originX: number = 0;
  originY: number = 0;
  directionX: number = 1;
  directionY: number = 0;

  constructor(originX: number = 0, originY: number = 0, directionX: number = 1, directionY: number = 0) {
    super();
    this.originX = originX;
    this.originY = originY;
    this.directionX = directionX;
    this.directionY = directionY;
  }

  /**
   * Set the direction.
   */
  setDirection(dx: number, dy: number): void {
    this.directionX = dx;
    this.directionY = dy;
  }

  protected getLocalBounds(): IRect {
    // Rays extend to infinity, so use a large bounding box
    const large = 1e6;
    const dx = this.directionX;
    const dy = this.directionY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len > 0 ? dx / len : 1;
    const ny = len > 0 ? dy / len : 0;

    return {
      x: Math.min(this.originX, this.originX + nx * large),
      y: Math.min(this.originY, this.originY + ny * large),
      width: Math.abs(nx * large) || 1,
      height: Math.abs(ny * large) || 1,
    };
  }

  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.originX;
    const dy = local.y - this.originY;

    // Project point onto ray
    const lenSq = this.directionX * this.directionX + this.directionY * this.directionY;
    if (lenSq === 0) return Math.sqrt(dx * dx + dy * dy);

    const dot = (dx * this.directionX + dy * this.directionY) / lenSq;
    if (dot < 0) {
      // Point is behind the origin
      return Math.sqrt(dx * dx + dy * dy);
    }

    const projX = this.originX + dot * this.directionX;
    const projY = this.originY + dot * this.directionY;
    const px = local.x - projX;
    const py = local.y - projY;
    return Math.sqrt(px * px + py * py);
  }

  closestPointTo(x: number, y: number): { x: number; y: number } {
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.originX;
    const dy = local.y - this.originY;

    const lenSq = this.directionX * this.directionX + this.directionY * this.directionY;
    if (lenSq === 0) return this.localToWorld(this.originX, this.originY);

    const dot = (dx * this.directionX + dy * this.directionY) / lenSq;
    const t = Math.max(0, dot);
    const projX = this.originX + t * this.directionX;
    const projY = this.originY + t * this.directionY;

    return this.localToWorld(projX, projY);
  }

  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    const ldx = local2.x - local1.x;
    const ldy = local2.y - local1.y;

    const denom = this.directionX * ldy - this.directionY * ldx;
    if (Math.abs(denom) < 1e-10) return [];

    const diffx = local1.x - this.originX;
    const diffy = local1.y - this.originY;

    const t = (diffx * ldy - diffy * ldx) / denom;
    const u = (diffx * this.directionY - diffy * this.directionX) / denom;

    if (t >= 0 && u >= 0 && u <= 1) {
      return [this.localToWorld(this.originX + t * this.directionX, this.originY + t * this.directionY)];
    }

    return [];
  }

  intersectsShape(shape: any): Array<{ x: number; y: number }> {
    // Sample the shape and find intersections with the ray
    const results: Array<{ x: number; y: number }> = [];
    let lastInside = this.containsPoint(shape.pointAt(0).x, shape.pointAt(0).y);

    for (let i = 1; i <= 64; i++) {
      const t = i / 64;
      const pt = shape.pointAt(t);
      const inside = this.containsPoint(pt.x, pt.y);

      if (inside !== lastInside) {
        // Boundary crossing, use binary search for more precision
        results.push(pt);
      }

      lastInside = inside;
    }

    return results;
  }

  containsPoint(x: number, y: number): boolean {
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.originX;
    const dy = local.y - this.originY;

    // Check if point is on the ray
    const lenSq = this.directionX * this.directionX + this.directionY * this.directionY;
    if (lenSq === 0) return Math.sqrt(dx * dx + dy * dy) < 1e-6;

    const t = (dx * this.directionX + dy * this.directionY) / lenSq;
    if (t < 0) return false;

    const projX = this.originX + t * this.directionX;
    const projY = this.originY + t * this.directionY;
    const px = local.x - projX;
    const py = local.y - projY;
    return Math.sqrt(px * px + py * py) < 1e-6;
  }

  get area(): number {
    return 0;
  }

  get perimeter(): number {
    return Number.POSITIVE_INFINITY;
  }

  pointAt(t: number): { x: number; y: number } {
    const x = this.originX + this.directionX * t;
    const y = this.originY + this.directionY * t;
    return this.localToWorld(x, y);
  }

  tangentAt(t: number): { x: number; y: number } {
    return this.transformVector(this.directionX, this.directionY);
  }

  get centroid(): { x: number; y: number } {
    return this.localToWorld(this.originX, this.originY);
  }
}
