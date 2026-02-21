/**
 * Polygon geometry primitive.
 * Can be open (polyline) or closed.
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IPolygon } from './types';

export class Polygon extends Geometry implements IPolygon {
  readonly type = 'polygon';

  points: Array<{ x: number; y: number }> = [];
  closed: boolean = true;

  constructor(points: Array<{ x: number; y: number }> = [], closed: boolean = true) {
    super();
    this.points = points.slice();
    this.closed = closed;
  }

  addPoint(x: number, y: number): void {
    this.points.push({ x, y });
  }

  protected getLocalBounds(): IRect {
    if (this.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = this.points[0].x;
    let maxX = this.points[0].x;
    let minY = this.points[0].y;
    let maxY = this.points[0].y;

    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  distanceTo(x: number, y: number): number {
    if (this.points.length === 0) return 0;

    const local = this.worldToLocal(x, y);
    let minDistance = Number.POSITIVE_INFINITY;

    const pointCount = this.closed ? this.points.length : this.points.length - 1;
    for (let i = 0; i < pointCount; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthSq = dx * dx + dy * dy;

      let t = 0;
      if (lengthSq > 0) {
        t = Math.max(0, Math.min(1, ((local.x - p1.x) * dx + (local.y - p1.y) * dy) / lengthSq));
      }

      const px = p1.x + t * dx;
      const py = p1.y + t * dy;
      const distance = Math.sqrt((local.x - px) ** 2 + (local.y - py) ** 2);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  closestPointTo(x: number, y: number): { x: number; y: number } {
    if (this.points.length === 0) {
      return this.localToWorld(0, 0);
    }

    const local = this.worldToLocal(x, y);
    let minDistance = Number.POSITIVE_INFINITY;
    let closestPoint = this.points[0];

    const pointCount = this.closed ? this.points.length : this.points.length - 1;
    for (let i = 0; i < pointCount; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthSq = dx * dx + dy * dy;

      let t = 0;
      if (lengthSq > 0) {
        t = Math.max(0, Math.min(1, ((local.x - p1.x) * dx + (local.y - p1.y) * dy) / lengthSq));
      }

      const px = p1.x + t * dx;
      const py = p1.y + t * dy;
      const distance = Math.sqrt((local.x - px) ** 2 + (local.y - py) ** 2);

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = { x: px, y: py };
      }
    }

    return this.localToWorld(closestPoint.x, closestPoint.y);
  }

  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    const results: Array<{ x: number; y: number }> = [];

    const pointCount = this.closed ? this.points.length : this.points.length - 1;
    for (let i = 0; i < pointCount; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];

      const intersection = this.lineSegmentIntersection(
        local1.x, local1.y, local2.x, local2.y,
        p1.x, p1.y, p2.x, p2.y,
      );

      if (intersection) {
        results.push(this.localToWorld(intersection.x, intersection.y));
      }
    }

    return results;
  }

  private lineSegmentIntersection(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number,
  ): { x: number; y: number } | null {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      };
    }

    return null;
  }

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

  containsPoint(x: number, y: number): boolean {
    if (!this.closed || this.points.length < 3) return false;

    const local = this.worldToLocal(x, y);
    let crossings = 0;

    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];

      if (
        (p1.y <= local.y && local.y < p2.y) ||
        (p2.y <= local.y && local.y < p1.y)
      ) {
        const x_intersect = p1.x + ((local.y - p1.y) / (p2.y - p1.y)) * (p2.x - p1.x);
        if (local.x < x_intersect) {
          crossings++;
        }
      }
    }

    return (crossings & 1) === 1;
  }

  get area(): number {
    if (!this.closed || this.points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];
      area += p1.x * p2.y - p2.x * p1.y;
    }

    const scale = Math.abs(this.scaleX * this.scaleY);
    return Math.abs(area) * 0.5 * scale;
  }

  get perimeter(): number {
    if (this.points.length === 0) return 0;

    let perimeter = 0;
    const pointCount = this.closed ? this.points.length : this.points.length - 1;

    for (let i = 0; i < pointCount; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }

    const scale = Math.sqrt(Math.abs(this.scaleX * this.scaleY));
    return perimeter * scale;
  }

  pointAt(t: number): { x: number; y: number } {
    if (this.points.length === 0) {
      return this.localToWorld(0, 0);
    }

    if (this.points.length === 1) {
      return this.localToWorld(this.points[0].x, this.points[0].y);
    }

    const totalLength = this.perimeter;
    const targetDistance = (t % 1) * (this.closed ? totalLength : totalLength);
    let currentDistance = 0;

    const pointCount = this.closed ? this.points.length : this.points.length - 1;
    for (let i = 0; i < pointCount; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      if (currentDistance + segmentLength >= targetDistance) {
        const ratio = (targetDistance - currentDistance) / segmentLength;
        return this.localToWorld(p1.x + ratio * dx, p1.y + ratio * dy);
      }

      currentDistance += segmentLength;
    }

    return this.localToWorld(this.points[0].x, this.points[0].y);
  }

  tangentAt(t: number): { x: number; y: number } {
    if (this.points.length < 2) return { x: 0, y: 0 };

    const totalLength = this.perimeter;
    const targetDistance = (t % 1) * totalLength;
    let currentDistance = 0;

    const pointCount = this.closed ? this.points.length : this.points.length - 1;
    for (let i = 0; i < pointCount; i++) {
      const p1 = this.points[i];
      const p2 = this.points[(i + 1) % this.points.length];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      if (currentDistance + segmentLength >= targetDistance) {
        return this.transformVector(dx, dy);
      }

      currentDistance += segmentLength;
    }

    const p1 = this.points[this.points.length - 1];
    const p2 = this.points[0];
    return this.transformVector(p2.x - p1.x, p2.y - p1.y);
  }

  get centroid(): { x: number; y: number } {
    if (this.points.length === 0) {
      return this.localToWorld(0, 0);
    }

    let cx = 0, cy = 0;
    for (const p of this.points) {
      cx += p.x;
      cy += p.y;
    }

    cx /= this.points.length;
    cy /= this.points.length;

    return this.localToWorld(cx, cy);
  }
}
