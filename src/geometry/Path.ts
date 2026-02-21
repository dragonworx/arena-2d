/**
 * Path geometry primitive.
 *
 * Represents a composite shape made up of multiple path segments (lines, curves, arcs).
 * Paths are constructed using a builder pattern with moveTo, lineTo, curve, and arc
 * operations. Paths can be open or closed.
 *
 * @module Geometry
 * @example
 * ```typescript
 * import { Path } from 'arena-2d';
 *
 * const path = new Path();
 * path.addMoveTo(0, 0);
 * path.addLineTo(100, 0);
 * path.addBezierCurveTo(150, 50, 150, 150, 100, 200);
 * path.addLineTo(0, 200);
 * path.closePath();
 * console.log(path.perimeter);
 * ```
 */

import { Geometry } from './Geometry';
import type { IRect } from '../math/aabb';
import type { IPath, PathSegment } from './types';
import { Line } from './Line';
import { QuadraticCurve } from './QuadraticCurve';
import { BezierCurve } from './BezierCurve';
import { Arc } from './Arc';

/**
 * Concrete implementation of a path geometry.
 */
export class Path extends Geometry implements IPath {
  /** @inheritdoc */
  readonly type = 'path';

  /** The segments comprising this path. */
  segments: PathSegment[] = [];
  /** Cached perimeter value for performance. */
  private cachedPerimeter: number | null = null;

  /** @inheritdoc */
  protected getLocalBounds(): IRect {
    if (this.segments.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    // Sample all segments for bounds
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const pt = this.pointAt(t);
      const local = this.worldToLocal(pt.x, pt.y);
      minX = Math.min(minX, local.x);
      maxX = Math.max(maxX, local.x);
      minY = Math.min(minY, local.y);
      maxY = Math.max(maxY, local.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /** @inheritdoc */
  addMoveTo(x: number, y: number): void {
    this.segments.push({ type: 'moveTo', x, y });
    this.cachedPerimeter = null;
  }

  /** @inheritdoc */
  addLineTo(x: number, y: number): void {
    this.segments.push({ type: 'lineTo', x, y });
    this.cachedPerimeter = null;
  }

  /** @inheritdoc */
  addQuadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.segments.push({ type: 'quadraticCurveTo', cpx, cpy, x, y });
    this.cachedPerimeter = null;
  }

  /** @inheritdoc */
  addBezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.segments.push({ type: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y });
    this.cachedPerimeter = null;
  }

  /** @inheritdoc */
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

  /** @inheritdoc */
  closePath(): void {
    this.segments.push({ type: 'closePath' });
    this.cachedPerimeter = null;
  }

  /**
   * Clears all segments from the path.
   */
  clear(): void {
    this.segments = [];
    this.cachedPerimeter = null;
  }

  /** @inheritdoc */
  distanceTo(x: number, y: number): number {
    const local = this.worldToLocal(x, y);
    let minDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const pt = this.pointAt(t);
      const localPt = this.worldToLocal(pt.x, pt.y);
      const dx = localPt.x - local.x;
      const dy = localPt.y - local.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  /** @inheritdoc */
  closestPointTo(x: number, y: number): { x: number; y: number } {
    const local = this.worldToLocal(x, y);
    let minDistance = Number.POSITIVE_INFINITY;
    let bestT = 0;

    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const pt = this.pointAt(t);
      const localPt = this.worldToLocal(pt.x, pt.y);
      const dx = localPt.x - local.x;
      const dy = localPt.y - local.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        bestT = t;
      }
    }

    return this.pointAt(bestT);
  }

  /** @inheritdoc */
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const results: Array<{ x: number; y: number }> = [];
    
    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;

    for (const segment of this.segments) {
      const segmentIntersections: Array<{ x: number; y: number }> = [];
      
      if (segment.type === 'moveTo') {
        curX = startX = segment.x;
        curY = startY = segment.y;
        continue;
      }

      // Convert segment to a concrete geometry to use its intersectsLine
      let subShape: any = null;
      if (segment.type === 'lineTo') {
        subShape = new Line(curX, curY, segment.x, segment.y);
      } else if (segment.type === 'quadraticCurveTo') {
        subShape = new QuadraticCurve(curX, curY, segment.cpx, segment.cpy, segment.x, segment.y);
      } else if (segment.type === 'bezierCurveTo') {
        subShape = new BezierCurve([{ x: curX, y: curY }, { x: segment.cp1x, y: segment.cp1y }, { x: segment.cp2x, y: segment.cp2y }, { x: segment.x, y: segment.y }]);
      } else if (segment.type === 'arc') {
        subShape = new Arc(segment.cx, segment.cy, segment.radius, segment.startAngle, segment.endAngle, segment.counterclockwise);
      } else if (segment.type === 'closePath') {
        subShape = new Line(curX, curY, startX, startY);
      }

      if (subShape) {
        // We need to pass world coordinates to the subshape's intersectsLine,
        // but it will internally call worldToLocal. 
        // Our subshapes are in local space of the Path.
        // So we should temporarily set the subshape's transform to match the Path's world transform.
        subShape.worldMatrix = this.worldMatrix.slice();
        const hits = subShape.intersectsLine(x1, y1, x2, y2);
        results.push(...hits);
      }

      // Update current position
      if (segment.type === 'lineTo' || segment.type === 'quadraticCurveTo' || segment.type === 'bezierCurveTo') {
        curX = segment.x;
        curY = segment.y;
      } else if (segment.type === 'arc') {
        curX = segment.cx + Math.cos(segment.endAngle) * segment.radius;
        curY = segment.cy + Math.sin(segment.endAngle) * segment.radius;
      } else if (segment.type === 'closePath') {
        curX = startX;
        curY = startY;
      }
    }

    // Remove duplicates
    const unique: Array<{ x: number; y: number }> = [];
    for (const pt of results) {
      if (!unique.some(p => Math.abs(p.x - pt.x) < 1e-6 && Math.abs(p.y - pt.y) < 1e-6)) {
        unique.push(pt);
      }
    }

    return unique;
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
    const closest = this.closestPointTo(x, y);
    return Math.abs(closest.x - x) < 1e-6 && Math.abs(closest.y - y) < 1e-6;
  }

  /** @inheritdoc */
  get area(): number {
    return 0; // Paths have no area unless filled
  }

  /** @inheritdoc */
  get perimeter(): number {
    if (this.cachedPerimeter !== null) {
      return this.cachedPerimeter;
    }

    let length = 0;
    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;

    for (const segment of this.segments) {
      length += this.estimateSegmentLength(segment, curX, curY, startX, startY);
      if (segment.type === 'moveTo') {
        curX = startX = segment.x;
        curY = startY = segment.y;
      } else if (segment.type === 'lineTo' || segment.type === 'quadraticCurveTo' || segment.type === 'bezierCurveTo') {
        curX = segment.x;
        curY = segment.y;
      } else if (segment.type === 'arc') {
        curX = segment.cx + Math.cos(segment.endAngle) * segment.radius;
        curY = segment.cy + Math.sin(segment.endAngle) * segment.radius;
      } else if (segment.type === 'closePath') {
        curX = startX;
        curY = startY;
      }
    }

    const scale = Math.sqrt(Math.abs(this.scaleX * this.scaleY));
    this.cachedPerimeter = length * scale;
    return this.cachedPerimeter;
  }

  /** @inheritdoc */
  pointAt(t: number): { x: number; y: number } {
    if (this.segments.length === 0) {
      return this.localToWorld(0, 0);
    }

    // Count only drawable segments (skip moveTo, closePath)
    const drawableSegments: number[] = [];
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (seg.type !== 'moveTo' && seg.type !== 'closePath') {
        drawableSegments.push(i);
      }
    }

    if (drawableSegments.length === 0) {
      return this.localToWorld(0, 0);
    }

    const clamped = Math.max(0, Math.min(1, t));
    const drawableIndex = Math.floor(clamped * drawableSegments.length);
    const clampedDrawableIndex = Math.min(drawableIndex, drawableSegments.length - 1);
    const actualSegmentIndex = drawableSegments[clampedDrawableIndex];

    // Find current start position for this segment
    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;
    for (let i = 0; i < actualSegmentIndex; i++) {
      const seg = this.segments[i];
      if (seg.type === 'moveTo') {
        curX = startX = seg.x;
        curY = startY = seg.y;
      } else if (seg.type === 'lineTo' || seg.type === 'quadraticCurveTo' || seg.type === 'bezierCurveTo') {
        curX = seg.x;
        curY = seg.y;
      } else if (seg.type === 'arc') {
        curX = seg.cx + Math.cos(seg.endAngle) * seg.radius;
        curY = seg.cy + Math.sin(seg.endAngle) * seg.radius;
      } else if (seg.type === 'closePath') {
        curX = startX;
        curY = startY;
      }
    }

    const segment = this.segments[actualSegmentIndex];
    const segmentT = (clamped * drawableSegments.length) % 1;
    // If we're at the very end of the path (t=1), segmentT will be 0 but we want 1 for the last segment
    const finalT = (clamped === 1) ? 1 : segmentT;
    const { x, y } = this.pointOnSegment(segment, finalT, curX, curY, startX, startY);

    return this.localToWorld(x, y);
  }

  /** @inheritdoc */
  tangentAt(t: number): { x: number; y: number } {
    const delta = 0.001;
    const p1 = this.pointAt(t - delta);
    const p2 = this.pointAt(t + delta);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return this.transformVector(dx, dy);
  }

  /** @inheritdoc */
  get centroid(): { x: number; y: number } {
    return this.pointAt(0.5);
  }

  /**
   * Estimates the length of a single path segment.
   * @private
   */
  private estimateSegmentLength(segment: PathSegment, curX: number, curY: number, startX: number, startY: number): number {
    if (segment.type === 'moveTo') return 0;

    if (segment.type === 'lineTo') {
      const dx = segment.x - curX;
      const dy = segment.y - curY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    if (segment.type === 'closePath') {
      const dx = startX - curX;
      const dy = startY - curY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    // For curves and arcs, estimate by sampling
    let length = 0;
    let prevX = curX;
    let prevY = curY;

    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const { x, y } = this.pointOnSegment(segment, t, curX, curY, startX, startY);
      const dx = x - prevX;
      const dy = y - prevY;
      length += Math.sqrt(dx * dx + dy * dy);
      prevX = x;
      prevY = y;
    }

    return length;
  }

  /**
   * Gets a point on a single path segment at parameter t.
   * @private
   */
  private pointOnSegment(segment: PathSegment, t: number, curX: number, curY: number, startX: number, startY: number): { x: number; y: number } {
    const clamped = Math.max(0, Math.min(1, t));

    switch (segment.type) {
      case 'moveTo':
        return { x: segment.x, y: segment.y };
      case 'lineTo':
        return { 
          x: curX + (segment.x - curX) * clamped, 
          y: curY + (segment.y - curY) * clamped 
        };

      case 'quadraticCurveTo': {
        const mt = 1 - clamped;
        const x = mt * mt * curX + 2 * mt * clamped * segment.cpx + clamped * clamped * segment.x;
        const y = mt * mt * curY + 2 * mt * clamped * segment.cpy + clamped * clamped * segment.y;
        return { x, y };
      }

      case 'bezierCurveTo': {
        const mt = 1 - clamped;
        const x =
          mt * mt * mt * curX +
          3 * mt * mt * clamped * segment.cp1x +
          3 * mt * clamped * clamped * segment.cp2x +
          clamped * clamped * clamped * segment.x;
        const y =
          mt * mt * mt * curY +
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
        return { 
          x: curX + (startX - curX) * clamped, 
          y: curY + (startY - curY) * clamped 
        };
    }
  }
}
