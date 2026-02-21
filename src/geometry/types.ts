import type { IRect } from '../math/aabb';
import type { ITransform } from '../math/Transform';
import type { IArena2DContext } from '../rendering/Arena2DContext';

export interface IGeometry extends ITransform {
  readonly type: string;

  // Distance operations
  distanceTo(x: number, y: number): number;
  closestPointTo(x: number, y: number): { x: number; y: number };

  // Intersection & containment
  intersectsLine(x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }>;
  intersectsShape(shape: IGeometry): Array<{ x: number; y: number }>;
  containsPoint(x: number, y: number): boolean;

  // Geometric properties
  readonly area: number;
  readonly perimeter: number;
  readonly boundingBox: IRect;
  readonly centroid: { x: number; y: number };

  // Parametric interpolation
  pointAt(t: number): { x: number; y: number };
  tangentAt(t: number): { x: number; y: number };

  // Rendering (optional)
  paint?(ctx: IArena2DContext): void;
}

export interface IVector {
  x: number;
  y: number;
  readonly magnitude: number;
  readonly angle: number;

  add(other: IVector): IVector;
  subtract(other: IVector): IVector;
  dot(other: IVector): number;
  cross(other: IVector): number;
  normalize(): IVector;
  rotate(radians: number): IVector;
  clone(): IVector;
}

export interface IPoint extends IGeometry {
  px: number;
  py: number;
}

export interface IRay extends IGeometry {
  originX: number;
  originY: number;
  directionX: number;
  directionY: number;
}

export interface ILine extends IGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface IRectangle extends IGeometry {
  rectX: number;
  rectY: number;
  width: number;
  height: number;
}

export interface ICircle extends IGeometry {
  cx: number;
  cy: number;
  radius: number;
}

export interface IEllipse extends IGeometry {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface IPolygon extends IGeometry {
  readonly points: Array<{ x: number; y: number }>;
  closed: boolean;
}

export interface IArc extends IGeometry {
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  counterclockwise: boolean;
}

export interface IBezierCurve extends IGeometry {
  readonly controlPoints: Array<{ x: number; y: number }>;
}

export interface IQuadraticCurve extends IGeometry {
  x0: number;
  y0: number;
  cpx: number;
  cpy: number;
  x1: number;
  y1: number;
}

export interface IPath extends IGeometry {
  readonly segments: Array<PathSegment>;
  addMoveTo(x: number, y: number): void;
  addLineTo(x: number, y: number): void;
  addQuadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  addBezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  addArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  closePath(): void;
  clear(): void;
}

export type PathSegment =
  | { type: 'moveTo'; x: number; y: number }
  | { type: 'lineTo'; x: number; y: number }
  | { type: 'quadraticCurveTo'; cpx: number; cpy: number; x: number; y: number }
  | { type: 'bezierCurveTo'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { type: 'arc'; cx: number; cy: number; radius: number; startAngle: number; endAngle: number; counterclockwise: boolean }
  | { type: 'closePath' };
