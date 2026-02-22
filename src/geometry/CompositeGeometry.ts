/**
 * Composite geometry — a collection of child geometries with cascading transforms.
 *
 * Enables building complex shapes from simpler primitives. The composite's transform
 * is applied to all children, and operations like `containsPoint()` and `distanceTo()`
 * aggregate across the entire child set (union semantics).
 *
 * @module Geometry
 * @example
 * ```typescript
 * import { CompositeGeometry, Circle, Rectangle } from 'arena-2d';
 *
 * const body = new CompositeGeometry();
 * body.addChild(new Rectangle(0, 0, 100, 60));  // torso
 * body.addChild(new Circle(50, -20, 20));        // head
 * body.x = 200;
 * body.rotation = Math.PI / 6;
 * body.updateLocalMatrix();
 * body.updateWorldMatrix(identity());
 *
 * // Hit-tests against entire composite
 * body.containsPoint(210, 180); // true if inside any child
 * ```
 */

import { Geometry } from './Geometry';
import { computeAABB, type IRect } from '../math/aabb';
import type { MatrixArray } from '../math/matrix';
import type { ICompositeGeometry } from './types';

/**
 * A geometry that composes multiple child geometries into a single unit.
 *
 * Transforms cascade from parent to children automatically via `updateWorldMatrix()`.
 * All spatial queries (containsPoint, distanceTo, etc.) use union semantics —
 * a point is "inside" the composite if it is inside **any** child.
 */
export class CompositeGeometry extends Geometry implements ICompositeGeometry {
  /** @inheritdoc */
  readonly type = 'composite';

  private _children: Geometry[] = [];

  /**
   * The child geometries in this composite.
   */
  get children(): ReadonlyArray<Geometry> {
    return this._children;
  }

  /**
   * Adds a child geometry to this composite.
   * @param child - The geometry to add.
   */
  addChild(child: Geometry): void {
    if (this._children.indexOf(child) === -1) {
      this._children.push(child);
    }
  }

  /**
   * Removes a child geometry from this composite.
   * @param child - The geometry to remove.
   */
  removeChild(child: Geometry): void {
    const index = this._children.indexOf(child);
    if (index !== -1) {
      this._children.splice(index, 1);
    }
  }

  /**
   * Removes all child geometries.
   */
  removeAllChildren(): void {
    this._children.length = 0;
  }

  /**
   * Updates the world matrix and cascades to all children.
   *
   * After this call, every child's `worldMatrix` reflects the full
   * parent → composite → child transform chain.
   *
   * @param parentWorldMatrix - The parent's cumulative world matrix.
   */
  override updateWorldMatrix(parentWorldMatrix: MatrixArray): void {
    super.updateWorldMatrix(parentWorldMatrix);
    for (const child of this._children) {
      child.updateWorldMatrix(this.worldMatrix);
    }
  }

  /** @inheritdoc */
  public override getLocalBounds(): IRect {
    if (this._children.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of this._children) {
      // Transform child's local bounds into OUR local space using its local matrix
      const childLocalBounds = (child as any).getLocalBounds();
      const bb = computeAABB(childLocalBounds, child.localMatrix);
      
      minX = Math.min(minX, bb.x);
      minY = Math.min(minY, bb.y);
      maxX = Math.max(maxX, bb.x + bb.width);
      maxY = Math.max(maxY, bb.y + bb.height);
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /**
   * Returns the world-space bounding box as the union of all children's bounding boxes.
   */
  override get boundingBox(): IRect {
    if (this._children.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of this._children) {
      // child.boundingBox is already world-space
      const bb = child.boundingBox;
      minX = Math.min(minX, bb.x);
      minY = Math.min(minY, bb.y);
      maxX = Math.max(maxX, bb.x + bb.width);
      maxY = Math.max(maxY, bb.y + bb.height);
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /**
   * A point is contained if it is inside **any** child (union semantics).
   */
  containsPoint(x: number, y: number): boolean {
    // console.log(`Composite.containsPoint checking: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    for (const child of this._children) {
      if (child.containsPoint(x, y)) {
        // console.log(`  -> Hit child: ${child.type}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the minimum distance from the point to any child.
   */
  distanceTo(x: number, y: number): number {
    if (this._children.length === 0) return Infinity;

    let minDist = Infinity;
    for (const child of this._children) {
      minDist = Math.min(minDist, child.distanceTo(x, y));
    }
    return minDist;
  }

  /**
   * Returns the closest point on any child to the given world-space point.
   */
  closestPointTo(x: number, y: number): { x: number; y: number } {
    if (this._children.length === 0) return { x, y };

    let minDist = Infinity;
    let closest = { x, y };
    for (const child of this._children) {
      const dist = child.distanceTo(x, y);
      if (dist < minDist) {
        minDist = dist;
        closest = child.closestPointTo(x, y);
      }
    }
    return closest;
  }

  /**
   * Returns the union of all children's line intersections.
   */
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> {
    const results: Array<{ x: number; y: number }> = [];
    for (const child of this._children) {
      results.push(...child.intersectsLine(x1, y1, x2, y2));
    }
    return results;
  }

  /** Sum of all children's areas. */
  get area(): number {
    let total = 0;
    for (const child of this._children) {
      total += child.area;
    }
    return total;
  }

  /** Sum of all children's perimeters. */
  get perimeter(): number {
    let total = 0;
    for (const child of this._children) {
      total += child.perimeter;
    }
    return total;
  }

  /**
   * Area-weighted average of child centroids.
   */
  get centroid(): { x: number; y: number } {
    if (this._children.length === 0) return this.localToWorld(0, 0);

    let totalArea = 0;
    let cx = 0;
    let cy = 0;

    for (const child of this._children) {
      const a = child.area;
      const c = child.centroid;
      cx += c.x * a;
      cy += c.y * a;
      totalArea += a;
    }

    if (totalArea === 0) {
      // Fallback: simple average if all areas are zero (e.g. lines/points)
      for (const child of this._children) {
        const c = child.centroid;
        cx += c.x;
        cy += c.y;
      }
      return { x: cx / this._children.length, y: cy / this._children.length };
    }

    return { x: cx / totalArea, y: cy / totalArea };
  }

  /**
   * Delegates to the first child's `pointAt()`.
   * For composites, parametric traversal across children is not well-defined.
   */
  pointAt(t: number): { x: number; y: number } {
    if (this._children.length === 0) return this.localToWorld(0, 0);
    return this._children[0].pointAt(t);
  }

  /**
   * Delegates to the first child's `tangentAt()`.
   */
  tangentAt(t: number): { x: number; y: number } {
    if (this._children.length === 0) return { x: 1, y: 0 };
    return this._children[0].tangentAt(t);
  }
}
