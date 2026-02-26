/**
 * Geometry module - Fundamental 2D geometric primitives with transform support.
 */

// Types
export type {
  IGeometry,
  IVector,
  IPoint,
  IRay,
  ILine,
  IRectangle,
  ICircle,
  IEllipse,
  IPolygon,
  IArc,
  IBezierCurve,
  IQuadraticCurve,
  IPath,
  ICompositeGeometry,
  PathSegment,
} from './types';

// Classes
export { Geometry } from './Geometry';
export { Vector } from './Vector';
export { Point } from './Point';
export { Ray } from './Ray';
export { Line } from './Line';
export { Rectangle } from './Rectangle';
export { Circle } from './Circle';
export { Ellipse } from './Ellipse';
export { Polygon } from './Polygon';
export { Arc } from './Arc';
export { QuadraticCurve } from './QuadraticCurve';
export { BezierCurve } from './BezierCurve';
export { Path } from './Path';
export { CompositeGeometry } from './CompositeGeometry';
