/**
 * Circle geometry primitive.
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { ICircle } from './types';
import { Vector } from './Vector';

export class Circle extends Geometry implements ICircle {
  readonly type = 'circle';

  cx: number = 0;
  cy: number = 0;
  radius: number = 1;

  constructor(cx: number = 0, cy: number = 0, radius: number = 1) {
    super();
    this.cx = cx;
    this.cy = cy;
    this.radius = Math.max(radius, Number.EPSILON);
  }

  protected getLocalBounds(): IRect {
    return {
      x: this.cx - this.radius,
      y: this.cy - this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    };
  }

  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.cx;
    const dy = local.y - this.cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, distance - this.radius);
  }

  closestPointTo(x: number, y: number): { x: number; y: number } {
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.cx;
    const dy = local.y - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      return this.localToWorld(this.cx + this.radius, this.cy);
    }

    const nx = dx / dist;
    const ny = dy / dist;
    return this.localToWorld(this.cx + nx * this.radius, this.cy + ny * this.radius);
  }

  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    // Vector from line start to circle center
    const fx = local1.x - this.cx;
    const fy = local1.y - this.cy;
    const dx = local2.x - local1.x;
    const dy = local2.y - local1.y;

    // Solve: |f + t*d|^2 = r^2
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - this.radius * this.radius;

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

  intersectsShape(shape: any): Array<{ x: number; y: number }> {
    // For now, use a simple approach: find closest point and check distance
    // More sophisticated algorithms would check circle-to-shape intersection
    const results: Array<{ x: number; y: number }> = [];

    // Sample the shape and check for intersections
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const pt = shape.pointAt(t);
      const dx = pt.x - this.cx;
      const dy = pt.y - this.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.radius + 1e-6) {
        results.push(pt);
      }
    }

    return results;
  }

  containsPoint(x: number, y: number): boolean {
    const local = this.worldToLocal(x, y);
    const dx = local.x - this.cx;
    const dy = local.y - this.cy;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  get area(): number {
    const scale = Math.sqrt(Math.abs(this.scaleX * this.scaleY));
    const r = this.radius * scale;
    return Math.PI * r * r;
  }

  get perimeter(): number {
    const scale = Math.sqrt(Math.abs(this.scaleX * this.scaleY));
    const r = this.radius * scale;
    return 2 * Math.PI * r;
  }

  pointAt(t: number): { x: number; y: number } {
    const angle = t * 2 * Math.PI;
    const lx = this.cx + Math.cos(angle) * this.radius;
    const ly = this.cy + Math.sin(angle) * this.radius;
    return this.localToWorld(lx, ly);
  }

  tangentAt(t: number): { x: number; y: number } {
    const angle = t * 2 * Math.PI;
    const dx = -Math.sin(angle);
    const dy = Math.cos(angle);
    return this.transformVector(dx, dy);
  }

  get centroid(): { x: number; y: number } {
    return this.localToWorld(this.cx, this.cy);
  }
}
