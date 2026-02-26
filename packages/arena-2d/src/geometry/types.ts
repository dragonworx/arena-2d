/**
 * Core geometry interfaces and types.
 *
 * Defines the contract for all geometric primitives including distance,
 * intersection, and parametric operations.
 *
 * @module Geometry
 */

import type { IRect } from '../math/aabb';
import type { ITransform } from '../math/Transform';

/**
 * Base interface for all geometric shapes.
 * Extends ITransform to support hierarchical positioning and scaling.
 */
export interface IGeometry extends ITransform {
  /** The type identifier of the geometry (e.g., 'circle', 'rectangle'). */
  readonly type: string;

  /**
   * Calculates the shortest distance from a world-space point to this geometry.
   * @param x - The X coordinate in world space.
   * @param y - The Y coordinate in world space.
   * @returns The minimum distance to the geometry.
   */
  distanceTo(x: number, y: number): number;

  /**
   * Finds the closest point on this geometry to a world-space point.
   * @param x - The X coordinate in world space.
   * @param y - The Y coordinate in world space.
   * @returns The closest point on the geometry in world space.
   */
  closestPointTo(x: number, y: number): { x: number; y: number };

  /**
   * Finds all intersection points between this geometry and a line.
   * @param x1 - The X coordinate of the line start in world space.
   * @param y1 - The Y coordinate of the line start in world space.
   * @param x2 - The X coordinate of the line end in world space.
   * @param y2 - The Y coordinate of the line end in world space.
   * @returns An array of intersection points in world space.
   */
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }>;

  /**
   * Finds all intersection points between this geometry and another shape.
   * @param shape - The other geometry to test against.
   * @returns An array of intersection points in world space.
   */
  intersectsShape(shape: IGeometry): Array<{ x: number; y: number }>;

  /**
   * Checks if a world-space point is contained within this geometry.
   * @param x - The X coordinate in world space.
   * @param y - The Y coordinate in world space.
   * @returns True if the point is inside or on the boundary.
   */
  containsPoint(x: number, y: number): boolean;

  /** The area of the geometry in world units (affected by scale). */
  readonly area: number;
  /** The perimeter or arc length of the geometry in world units (affected by scale). */
  readonly perimeter: number;
  /** The axis-aligned bounding box of the geometry in world space. */
  readonly boundingBox: IRect;
  /** The geometric center of the shape in world space. */
  readonly centroid: { x: number; y: number };

  /**
   * Returns a point at a normalized parameter `t` along the geometry's boundary.
   * @param t - A value between 0 and 1.
   * @returns The point in world space.
   */
  pointAt(t: number): { x: number; y: number };

  /**
   * Returns a normalized tangent vector at a normalized parameter `t`.
   * @param t - A value between 0 and 1.
   * @returns The tangent vector { x, y }.
   */
  tangentAt(t: number): { x: number; y: number };

  /**
   * Returns an outward-facing normal vector at a normalized parameter `t`.
   * Derived by rotating the tangent and ensuring it faces away from the centroid.
   * @param t - A value between 0 and 1.
   * @returns The normal vector { x, y }.
   */
  normalAt(t: number): { x: number; y: number };

  /**
   * Returns the outward-facing surface normal at the closest point to a
   * world-space query point. More robust than `normalAt(t)` because it
   * does not require finding a parametric `t` value, and naturally handles
   * corners and discontinuities by interpolating between adjacent normals.
   * @param x - The X coordinate of the query point in world space.
   * @param y - The Y coordinate of the query point in world space.
   * @returns The outward unit normal vector { x, y }.
   */
  closestNormalTo(x: number, y: number): { x: number; y: number };

  /** Optional children for composite geometries. */
  readonly children?: ReadonlyArray<IGeometry>;
}

/**
 * Interface for 2D vector operations.
 */
export interface IVector {
  /** The X component. */
  x: number;
  /** The Y component. */
  y: number;
  /** The magnitude (length) of the vector. */
  readonly magnitude: number;
  /** The polar angle of the vector in radians. */
  readonly angle: number;

  /** Adds another vector to this one. */
  add(other: IVector): IVector;
  /** Subtracts another vector from this one. */
  subtract(other: IVector): IVector;
  /** Calculates the dot product with another vector. */
  dot(other: IVector): number;
  /** Calculates the 2D cross product with another vector. */
  cross(other: IVector): number;
  /** Returns a new normalized (unit length) version of this vector. */
  normalize(): IVector;
  /** Returns a new vector rotated by the given radians. */
  rotate(radians: number): IVector;
  /** Scales this vector by a scalar value. */
  scale(scalar: number): IVector;
  /** Reflects this vector across a surface normal. */
  reflect(normal: IVector): IVector;
  /** Returns a deep copy of this vector. */
  clone(): IVector;
}

/** Interface for a point-like geometry. */
export interface IPoint extends IGeometry {
  /** The X coordinate in local space. */
  px: number;
  /** The Y coordinate in local space. */
  py: number;
}

/** Interface for a ray geometry. */
export interface IRay extends IGeometry {
  /** The origin X in local space. */
  originX: number;
  /** The origin Y in local space. */
  originY: number;
  /** The normalized direction X. */
  directionX: number;
  /** The normalized direction Y. */
  directionY: number;
}

/** Interface for a line segment geometry. */
export interface ILine extends IGeometry {
  /** Start X in local space. */
  x1: number;
  /** Start Y in local space. */
  y1: number;
  /** End X in local space. */
  x2: number;
  /** End Y in local space. */
  y2: number;
}

/** Interface for a rectangle geometry. */
export interface IRectangle extends IGeometry {
  /** Local-space top-left X. */
  rectX: number;
  /** Local-space top-left Y. */
  rectY: number;
  /** Local-space width. */
  width: number;
  /** Local-space height. */
  height: number;
}

/** Interface for a circle geometry. */
export interface ICircle extends IGeometry {
  /** Center X in local space. */
  cx: number;
  /** Center Y in local space. */
  cy: number;
  /** The radius. */
  radius: number;
}

/** Interface for an ellipse geometry. */
export interface IEllipse extends IGeometry {
  /** Center X in local space. */
  cx: number;
  /** Center Y in local space. */
  cy: number;
  /** Horizontal radius. */
  rx: number;
  /** Vertical radius. */
  ry: number;
}

/** Interface for a polygon geometry. */
export interface IPolygon extends IGeometry {
  /** Array of local-space points defining the vertices. */
  readonly points: Array<{ x: number; y: number }>;
  /** Whether the polygon is closed. */
  closed: boolean;
}

/** Interface for an arc geometry. */
export interface IArc extends IGeometry {
  /** Center X in local space. */
  cx: number;
  /** Center Y in local space. */
  cy: number;
  /** The radius. */
  radius: number;
  /** Start angle in radians. */
  startAngle: number;
  /** End angle in radians. */
  endAngle: number;
  /** Whether to draw counter-clockwise. */
  counterclockwise: boolean;
}

/** Interface for a cubic Bezier curve. */
export interface IBezierCurve extends IGeometry {
  /** Four control points (start, cp1, cp2, end) in local space. */
  readonly controlPoints: Array<{ x: number; y: number }>;
}

/** Interface for a quadratic Bezier curve. */
export interface IQuadraticCurve extends IGeometry {
  /** Start X. */
  x0: number;
  /** Start Y. */
  y0: number;
  /** Control point X. */
  cpx: number;
  /** Control point Y. */
  cpy: number;
  /** End X. */
  x1: number;
  /** End Y. */
  y1: number;
}

/** Interface for a complex path composed of multiple segments. */
export interface IPath extends IGeometry {
  /** The list of segments defining the path. */
  readonly segments: Array<PathSegment>;
  /** Starts a new sub-path. */
  addMoveTo(x: number, y: number): void;
  /** Adds a line segment to the path. */
  addLineTo(x: number, y: number): void;
  /** Adds a quadratic Bezier curve to the path. */
  addQuadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  /** Adds a cubic Bezier curve to the path. */
  addBezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  /** Adds an arc to the path. */
  addArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  /** Closes the current sub-path. */
  closePath(): void;
  /** Clears all segments from the path. */
  clear(): void;
}

/** Defines the possible segments in an `IPath`. */
export type PathSegment =
  | { type: 'moveTo'; x: number; y: number }
  | { type: 'lineTo'; x: number; y: number }
  | { type: 'quadraticCurveTo'; cpx: number; cpy: number; x: number; y: number }
  | { type: 'bezierCurveTo'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { type: 'arc'; cx: number; cy: number; radius: number; startAngle: number; endAngle: number; counterclockwise: boolean }
  | { type: 'closePath' };

/** Interface for a composite geometry that holds child geometries. */
export interface ICompositeGeometry extends IGeometry {
  /** The child geometries in this composite. */
  readonly children: ReadonlyArray<IGeometry>;
  /** Adds a child geometry. */
  addChild(child: IGeometry): void;
  /** Removes a child geometry. */
  removeChild(child: IGeometry): void;
  /** Removes all child geometries. */
  removeAllChildren(): void;
}
