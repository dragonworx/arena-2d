/**
 * Point geometry primitive.
 * A point is a single location in space with optional transforms.
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IPoint } from './types';

export class Point extends Geometry implements IPoint {
  readonly type = 'point';

  px: number = 0;
  py: number = 0;

  constructor(px: number = 0, py: number = 0) {
    super();
    this.px = px;
    this.py = py;
  }

  protected getLocalBounds(): IRect {
    return { x: this.px, y: this.py, width: 0, height: 0 };
  }

  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.px;
    const dy = local.y - this.py;
    return Math.sqrt(dx * dx + dy * dy);
  }

  closestPointTo(x: number, y: number): { x: number; y: number } {
    return this.localToWorld(this.px, this.py);
  }

  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    // A point can only intersect a line if it lies on the line
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    // Check if point is collinear with the line
    const dx = local2.x - local1.x;
    const dy = local2.y - local1.y;
    const dpx = this.px - local1.x;
    const dpy = this.py - local1.y;

    // Cross product should be zero for collinearity
    const cross = dpx * dy - dpy * dx;
    if (Math.abs(cross) > 1e-6) return [];

    // Check if point is within the line segment
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) {
      // Both endpoints are the same
      if (Math.abs(dpx) < 1e-6 && Math.abs(dpy) < 1e-6) {
        return [this.localToWorld(this.px, this.py)];
      }
      return [];
    }

    const t = (dpx * dx + dpy * dy) / lengthSq;
    if (t >= 0 && t <= 1) {
      return [this.localToWorld(this.px, this.py)];
    }

    return [];
  }

  intersectsShape(shape: any): Array<{ x: number; y: number }> {
    // A point can only intersect a shape if it's contained within it
    const worldPt = this.localToWorld(this.px, this.py);
    if (shape.containsPoint(worldPt.x, worldPt.y)) {
      return [worldPt];
    }
    return [];
  }

  containsPoint(x: number, y: number): boolean {
    const local = this.worldToLocal(x, y);
    return Math.abs(local.x - this.px) < 1e-6 && Math.abs(local.y - this.py) < 1e-6;
  }

  get area(): number {
    return 0;
  }

  get perimeter(): number {
    return 0;
  }

  pointAt(t: number): { x: number; y: number } {
    return this.localToWorld(this.px, this.py);
  }

  tangentAt(t: number): { x: number; y: number } {
    return { x: 0, y: 0 };
  }

  get centroid(): { x: number; y: number } {
    return this.localToWorld(this.px, this.py);
  }
}
