/**
 * Path geometry primitive.
 * A composite shape made up of multiple path segments (line, curve, arc).
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IPath, PathSegment } from './types';
import { Line } from './Line';
import { QuadraticCurve } from './QuadraticCurve';
import { BezierCurve } from './BezierCurve';
import { Arc } from './Arc';

export class Path extends Geometry implements IPath {
  readonly type = 'path';

  segments: PathSegment[] = [];
  private currentX: number = 0;
  private currentY: number = 0;
  private cachedPerimeter: number | null = null;

  protected getLocalBounds(): IRect {
    if (this.segments.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    // Sample all segments
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const pt = this.pointAt(t);
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

  addMoveTo(x: number, y: number): void {
    this.segments.push({ type: 'moveTo', x, y });
    this.currentX = x;
    this.currentY = y;
    this.cachedPerimeter = null;
  }

  addLineTo(x: number, y: number): void {
    this.segments.push({ type: 'lineTo', x, y });
    this.currentX = x;
    this.currentY = y;
    this.cachedPerimeter = null;
  }

  addQuadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.segments.push({ type: 'quadraticCurveTo', cpx, cpy, x, y });
    this.currentX = x;
    this.currentY = y;
    this.cachedPerimeter = null;
  }

  addBezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.segments.push({ type: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y });
    this.currentX = x;
    this.currentY = y;
    this.cachedPerimeter = null;
  }

  addArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.segments.push({
      type: 'arc',
      cx,
      cy,
      radius,
      startAngle,
      endAngle,
      counterclockwise: counterclockwise ?? false,
    });
    this.cachedPerimeter = null;
  }

  closePath(): void {
    this.segments.push({ type: 'closePath' });
    this.cachedPerimeter = null;
  }

  clear(): void {
    this.segments = [];
    this.currentX = 0;
    this.currentY = 0;
    this.cachedPerimeter = null;
  }

  /**
   * Get a point at parameter t along the entire path.
   */
  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    let minDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const pt = this.pointAt(t);
      const dx = pt.x - local.x;
      const dy = pt.y - local.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  closestPointTo(x: number, y: number): { x: number; y: number } {
    const local = this.worldToLocal(x, y);
    let minDistance = Number.POSITIVE_INFINITY;
    let bestT = 0;

    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const pt = this.pointAt(t);
      const dx = pt.x - local.x;
      const dy = pt.y - local.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        bestT = t;
      }
    }

    const pt = this.pointAt(bestT);
    return this.localToWorld(pt.x, pt.y);
  }

  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const local1 = this.worldToLocal(x1, y1);
    const local2 = this.worldToLocal(x2, y2);

    const results: Array<{ x: number; y: number }> = [];

    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const pt = this.pointAt(t);

      const dx = local2.x - local1.x;
      const dy = local2.y - local1.y;
      const lengthSq = dx * dx + dy * dy;

      if (lengthSq === 0) continue;

      const u = ((pt.x - local1.x) * dx + (pt.y - local1.y) * dy) / lengthSq;
      if (u < 0 || u > 1) continue;

      const px = local1.x + u * dx;
      const py = local1.y + u * dy;
      const dist = Math.sqrt((pt.x - px) ** 2 + (pt.y - py) ** 2);

      if (dist < 0.5) {
        if (!results.some(r => Math.abs(r.x - pt.x) < 0.5 && Math.abs(r.y - pt.y) < 0.5)) {
          results.push(this.localToWorld(pt.x, pt.y));
        }
      }
    }

    return results;
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
    const closest = this.closestPointTo(x, y);
    return Math.abs(closest.x - x) < 1e-6 && Math.abs(closest.y - y) < 1e-6;
  }

  get area(): number {
    return 0; // Paths have no area unless filled
  }

  get perimeter(): number {
    if (this.cachedPerimeter !== null) {
      return this.cachedPerimeter;
    }

    let length = 0;

    // Calculate perimeter by summing all segment lengths
    for (const segment of this.segments) {
      length += this.estimateSegmentLength(segment);
    }

    const scale = Math.sqrt(Math.abs(this.scaleX * this.scaleY));
    this.cachedPerimeter = length * scale;
    return this.cachedPerimeter;
  }

  pointAt(t: number): { x: number; y: number } {
    if (this.segments.length === 0) {
      return this.localToWorld(0, 0);
    }

    // Find which segment we're in based on normalized parameter
    const normalizedT = t % 1;
    const segmentIndex = Math.floor(normalizedT * this.segments.length);
    const clampedIndex = Math.min(segmentIndex, this.segments.length - 1);

    if (clampedIndex < 0) {
      return this.localToWorld(0, 0);
    }

    const segment = this.segments[clampedIndex];
    const segmentT = (normalizedT * this.segments.length) % 1;
    const { x, y } = this.pointOnSegment(segment, segmentT);

    return this.localToWorld(x, y);
  }

  tangentAt(t: number): { x: number; y: number } {
    // Approximate tangent using finite differences
    const delta = 0.001;
    const p1 = this.pointAt(t - delta);
    const p2 = this.pointAt(t + delta);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return this.transformVector(dx, dy);
  }

  get centroid(): { x: number; y: number } {
    return this.localToWorld(this.pointAt(0.5).x, this.pointAt(0.5).y);
  }

  private estimateSegmentLength(segment: PathSegment): number {
    if (segment.type === 'moveTo') return 0;

    const from = this.currentX || 0; // Approximate
    const y = this.currentY || 0;

    if (segment.type === 'lineTo') {
      const dx = segment.x - from;
      const dy = segment.y - y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    // For curves, estimate by sampling
    let length = 0;
    let prevX = from;
    let prevY = y;

    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const { x, y } = this.pointOnSegment(segment, t);
      const dx = x - prevX;
      const dy = y - prevY;
      length += Math.sqrt(dx * dx + dy * dy);
      prevX = x;
      prevY = y;
    }

    return length;
  }

  private pointOnSegment(segment: PathSegment, t: number): { x: number; y: number } {
    const clamped = Math.max(0, Math.min(1, t));

    switch (segment.type) {
      case 'moveTo':
      case 'lineTo':
        return { x: segment.x, y: segment.y };

      case 'quadraticCurveTo': {
        const mt = 1 - clamped;
        const x = mt * mt * (this.currentX || 0) + 2 * mt * clamped * segment.cpx + clamped * clamped * segment.x;
        const y = mt * mt * (this.currentY || 0) + 2 * mt * clamped * segment.cpy + clamped * clamped * segment.y;
        return { x, y };
      }

      case 'bezierCurveTo': {
        const mt = 1 - clamped;
        const x =
          mt * mt * mt * (this.currentX || 0) +
          3 * mt * mt * clamped * segment.cp1x +
          3 * mt * clamped * clamped * segment.cp2x +
          clamped * clamped * clamped * segment.x;
        const y =
          mt * mt * mt * (this.currentY || 0) +
          3 * mt * mt * clamped * segment.cp1y +
          3 * mt * clamped * clamped * segment.cp2y +
          clamped * clamped * clamped * segment.y;
        return { x, y };
      }

      case 'arc': {
        const angle =
          segment.startAngle +
          (segment.counterclockwise ? -1 : 1) * clamped * (segment.endAngle - segment.startAngle);
        return {
          x: segment.cx + Math.cos(angle) * segment.radius,
          y: segment.cy + Math.sin(angle) * segment.radius,
        };
      }

      case 'closePath':
        return { x: 0, y: 0 };
    }
  }
}
