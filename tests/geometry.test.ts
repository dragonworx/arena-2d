/**
 * Comprehensive test suite for the Geometry module.
 */

import { describe, it, expect } from 'bun:test';
import { Vector } from '../src/geometry/Vector';
import { Point } from '../src/geometry/Point';
import { Circle } from '../src/geometry/Circle';
import { Rectangle } from '../src/geometry/Rectangle';
import { Line } from '../src/geometry/Line';
import { Ray } from '../src/geometry/Ray';
import { Ellipse } from '../src/geometry/Ellipse';
import { Polygon } from '../src/geometry/Polygon';
import { Arc } from '../src/geometry/Arc';
import { QuadraticCurve } from '../src/geometry/QuadraticCurve';
import { BezierCurve } from '../src/geometry/BezierCurve';
import { Path } from '../src/geometry/Path';

describe('Vector', () => {
  it('should create a vector with x and y components', () => {
    const v = new Vector(3, 4);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
  });

  it('should calculate magnitude correctly', () => {
    const v = new Vector(3, 4);
    expect(v.magnitude).toBe(5);
  });

  it('should calculate angle correctly', () => {
    const v = new Vector(1, 0);
    expect(Math.abs(v.angle - 0) < 1e-6).toBe(true);

    const v2 = new Vector(0, 1);
    expect(Math.abs(v2.angle - Math.PI / 2) < 1e-6).toBe(true);
  });

  it('should create vector from polar coordinates', () => {
    const v = Vector.fromPolar(5, 0);
    expect(Math.abs(v.x - 5) < 1e-6).toBe(true);
    expect(Math.abs(v.y - 0) < 1e-6).toBe(true);
  });

  it('should add vectors correctly', () => {
    const v1 = new Vector(1, 2);
    const v2 = new Vector(3, 4);
    const result = v1.add(v2);
    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
  });

  it('should subtract vectors correctly', () => {
    const v1 = new Vector(3, 4);
    const v2 = new Vector(1, 2);
    const result = v1.subtract(v2);
    expect(result.x).toBe(2);
    expect(result.y).toBe(2);
  });

  it('should compute dot product', () => {
    const v1 = new Vector(1, 0);
    const v2 = new Vector(0, 1);
    expect(v1.dot(v2)).toBe(0);

    const v3 = new Vector(2, 0);
    const v4 = new Vector(3, 0);
    expect(v3.dot(v4)).toBe(6);
  });

  it('should compute cross product (2D)', () => {
    const v1 = new Vector(1, 0);
    const v2 = new Vector(0, 1);
    expect(v1.cross(v2)).toBe(1);

    const v3 = new Vector(0, 1);
    const v4 = new Vector(1, 0);
    expect(v3.cross(v4)).toBe(-1);
  });

  it('should normalize vectors', () => {
    const v = new Vector(3, 4);
    const normalized = v.normalize();
    expect(Math.abs(normalized.magnitude - 1) < 1e-6).toBe(true);
  });

  it('should rotate vectors', () => {
    const v = new Vector(1, 0);
    const rotated = v.rotate(Math.PI / 2);
    expect(Math.abs(rotated.x - 0) < 1e-6).toBe(true);
    expect(Math.abs(rotated.y - 1) < 1e-6).toBe(true);
  });
});

describe('Point', () => {
  it('should create a point at given coordinates', () => {
    const p = new Point(5, 10);
    expect(p.px).toBe(5);
    expect(p.py).toBe(10);
  });

  it('should report type as "point"', () => {
    const p = new Point();
    expect(p.type).toBe('point');
  });

  it('should have zero area and perimeter', () => {
    const p = new Point(0, 0);
    expect(p.area).toBe(0);
    expect(p.perimeter).toBe(0);
  });

  it('should calculate distance to point', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(3, 4);

    // Distance from p2 to p1
    expect(Math.abs(p2.distanceTo(0, 0) - 5) < 1e-6).toBe(true);
  });

  it('should find closest point on itself', () => {
    const p = new Point(5, 10);
    const closest = p.closestPointTo(0, 0);
    expect(Math.abs(closest.x - 5) < 1e-6).toBe(true);
    expect(Math.abs(closest.y - 10) < 1e-6).toBe(true);
  });

  it('should contain itself', () => {
    const p = new Point(5, 10);
    expect(p.containsPoint(5, 10)).toBe(true);
  });
});

describe('Circle', () => {
  it('should create a circle with center and radius', () => {
    const c = new Circle(0, 0, 5);
    expect(c.cx).toBe(0);
    expect(c.cy).toBe(0);
    expect(c.radius).toBe(5);
  });

  it('should report type as "circle"', () => {
    const c = new Circle();
    expect(c.type).toBe('circle');
  });

  it('should calculate area correctly', () => {
    const c = new Circle(0, 0, 5);
    const expectedArea = Math.PI * 25;
    expect(Math.abs(c.area - expectedArea) < 1).toBe(true);
  });

  it('should calculate perimeter correctly', () => {
    const c = new Circle(0, 0, 5);
    const expectedPerimeter = 2 * Math.PI * 5;
    expect(Math.abs(c.perimeter - expectedPerimeter) < 1).toBe(true);
  });

  it('should contain points inside', () => {
    const c = new Circle(0, 0, 5);
    expect(c.containsPoint(0, 0)).toBe(true);
    expect(c.containsPoint(3, 0)).toBe(true);
  });

  it('should not contain points outside', () => {
    const c = new Circle(0, 0, 5);
    expect(c.containsPoint(10, 0)).toBe(false);
  });

  it('should calculate distance to external point', () => {
    const c = new Circle(0, 0, 5);
    expect(Math.abs(c.distanceTo(10, 0) - 5) < 1e-6).toBe(true);
  });

  it('should find closest point on circle', () => {
    const c = new Circle(0, 0, 5);
    const closest = c.closestPointTo(10, 0);
    expect(Math.abs(closest.x - 5) < 1e-6).toBe(true);
  });

  it('should find point at parameter t', () => {
    const c = new Circle(0, 0, 1);
    const pt = c.pointAt(0);
    expect(Math.abs(pt.x - 1) < 1e-6).toBe(true);
  });

  it('should have centroid at center', () => {
    const c = new Circle(5, 10, 3);
    const centroid = c.centroid;
    expect(Math.abs(centroid.x - 5) < 1e-6).toBe(true);
    expect(Math.abs(centroid.y - 10) < 1e-6).toBe(true);
  });
});

describe('Rectangle', () => {
  it('should create a rectangle with position, width, height', () => {
    const r = new Rectangle(0, 0, 10, 20);
    expect(r.rectX).toBe(0);
    expect(r.rectY).toBe(0);
    expect(r.width).toBe(10);
    expect(r.height).toBe(20);
  });

  it('should report type as "rectangle"', () => {
    const r = new Rectangle();
    expect(r.type).toBe('rectangle');
  });

  it('should calculate area correctly', () => {
    const r = new Rectangle(0, 0, 10, 20);
    expect(r.area).toBe(200);
  });

  it('should calculate perimeter correctly', () => {
    const r = new Rectangle(0, 0, 10, 20);
    expect(r.perimeter).toBe(60);
  });

  it('should contain points inside', () => {
    const r = new Rectangle(0, 0, 10, 20);
    expect(r.containsPoint(5, 10)).toBe(true);
  });

  it('should not contain points outside', () => {
    const r = new Rectangle(0, 0, 10, 20);
    expect(r.containsPoint(-1, 10)).toBe(false);
  });

  it('should have centroid at center', () => {
    const r = new Rectangle(0, 0, 10, 20);
    const centroid = r.centroid;
    expect(Math.abs(centroid.x - 5) < 1e-6).toBe(true);
    expect(Math.abs(centroid.y - 10) < 1e-6).toBe(true);
  });
});

describe('Line', () => {
  it('should create a line segment with start and end points', () => {
    const l = new Line(0, 0, 10, 0);
    expect(l.x1).toBe(0);
    expect(l.y1).toBe(0);
    expect(l.x2).toBe(10);
    expect(l.y2).toBe(0);
  });

  it('should report type as "line"', () => {
    const l = new Line();
    expect(l.type).toBe('line');
  });

  it('should have zero area', () => {
    const l = new Line(0, 0, 10, 0);
    expect(l.area).toBe(0);
  });

  it('should calculate length as perimeter', () => {
    const l = new Line(0, 0, 3, 4);
    expect(Math.abs(l.perimeter - 10) < 1e-6).toBe(true);
  });

  it('should contain points on the line', () => {
    const l = new Line(0, 0, 10, 0);
    expect(l.containsPoint(5, 0)).toBe(true);
  });

  it('should not contain points off the line', () => {
    const l = new Line(0, 0, 10, 0);
    expect(l.containsPoint(5, 5)).toBe(false);
  });

  it('should have centroid at midpoint', () => {
    const l = new Line(0, 0, 10, 0);
    const centroid = l.centroid;
    expect(Math.abs(centroid.x - 5) < 1e-6).toBe(true);
  });
});

describe('Circle-Line Intersection', () => {
  it('should detect intersection of circle and line', () => {
    const c = new Circle(0, 0, 5);
    const intersections = c.intersectsLine(-10, 0, 10, 0);
    expect(intersections.length).toBeGreaterThan(0);
  });

  it('should detect no intersection when line is far away', () => {
    const c = new Circle(0, 0, 5);
    const intersections = c.intersectsLine(0, 10, 0, 20);
    expect(intersections.length).toBe(0);
  });
});

describe('Polygon', () => {
  it('should create a polygon from points', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const p = new Polygon(points, true);
    expect(p.points.length).toBe(4);
    expect(p.closed).toBe(true);
  });

  it('should report type as "polygon"', () => {
    const p = new Polygon();
    expect(p.type).toBe('polygon');
  });

  it('should calculate area of square', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const p = new Polygon(points, true);
    expect(Math.abs(p.area - 100) < 1).toBe(true);
  });

  it('should contain points inside', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const p = new Polygon(points, true);
    expect(p.containsPoint(5, 5)).toBe(true);
  });

  it('should not contain points outside', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const p = new Polygon(points, true);
    expect(p.containsPoint(-5, 5)).toBe(false);
  });
});

describe('Ellipse', () => {
  it('should create an ellipse with center and radii', () => {
    const e = new Ellipse(0, 0, 10, 5);
    expect(e.cx).toBe(0);
    expect(e.cy).toBe(0);
    expect(e.rx).toBe(10);
    expect(e.ry).toBe(5);
  });

  it('should report type as "ellipse"', () => {
    const e = new Ellipse();
    expect(e.type).toBe('ellipse');
  });

  it('should contain points inside', () => {
    const e = new Ellipse(0, 0, 10, 5);
    expect(e.containsPoint(0, 0)).toBe(true);
  });

  it('should not contain points outside', () => {
    const e = new Ellipse(0, 0, 10, 5);
    expect(e.containsPoint(20, 0)).toBe(false);
  });
});

describe('Arc', () => {
  it('should create an arc with center, radius, and angles', () => {
    const a = new Arc(0, 0, 5, 0, Math.PI / 2);
    expect(a.cx).toBe(0);
    expect(a.cy).toBe(0);
    expect(a.radius).toBe(5);
    expect(a.startAngle).toBe(0);
    expect(a.endAngle).toBe(Math.PI / 2);
  });

  it('should report type as "arc"', () => {
    const a = new Arc();
    expect(a.type).toBe('arc');
  });

  it('should contain points on the arc', () => {
    const a = new Arc(0, 0, 5, 0, Math.PI / 2);
    const pt = a.pointAt(0.5);
    expect(a.containsPoint(pt.x, pt.y)).toBe(true);
  });
});

describe('QuadraticCurve', () => {
  it('should create a quadratic curve', () => {
    const qc = new QuadraticCurve(0, 0, 5, 5, 10, 0);
    expect(qc.x0).toBe(0);
    expect(qc.y0).toBe(0);
    expect(qc.cpx).toBe(5);
    expect(qc.cpy).toBe(5);
    expect(qc.x1).toBe(10);
    expect(qc.y1).toBe(0);
  });

  it('should report type as "quadraticCurve"', () => {
    const qc = new QuadraticCurve();
    expect(qc.type).toBe('quadraticCurve');
  });

  it('should have point at start parameter', () => {
    const qc = new QuadraticCurve(0, 0, 5, 5, 10, 0);
    const pt = qc.pointAt(0);
    expect(Math.abs(pt.x - 0) < 1e-6).toBe(true);
  });

  it('should calculate perimeter', () => {
    const qc = new QuadraticCurve(0, 0, 5, 5, 10, 0);
    expect(qc.perimeter > 10).toBe(true); // Should be longer than straight line
  });
});

describe('BezierCurve', () => {
  it('should create a bezier curve', () => {
    const bc = new BezierCurve([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }]);
    expect(bc.controlPoints.length).toBe(3);
  });

  it('should report type as "bezierCurve"', () => {
    const bc = new BezierCurve();
    expect(bc.type).toBe('bezierCurve');
  });

  it('should have point at start parameter', () => {
    const bc = new BezierCurve([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }]);
    const pt = bc.pointAt(0);
    expect(Math.abs(pt.x - 0) < 1e-6).toBe(true);
  });

  it('should calculate perimeter', () => {
    const bc = new BezierCurve([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }]);
    expect(bc.perimeter > 10).toBe(true); // Should be longer than straight line
  });
});

describe('Path', () => {
  it('should create an empty path', () => {
    const p = new Path();
    expect(p.segments.length).toBe(0);
  });

  it('should report type as "path"', () => {
    const p = new Path();
    expect(p.type).toBe('path');
  });

  it('should add line segments', () => {
    const p = new Path();
    p.addMoveTo(0, 0);
    p.addLineTo(10, 0);
    expect(p.segments.length).toBe(2);
  });

  it('should add curves', () => {
    const p = new Path();
    p.addMoveTo(0, 0);
    p.addQuadraticCurveTo(5, 5, 10, 0);
    expect(p.segments.length).toBe(2);
  });

  it('should clear segments', () => {
    const p = new Path();
    p.addMoveTo(0, 0);
    p.addLineTo(10, 0);
    p.clear();
    expect(p.segments.length).toBe(0);
  });
});

describe('Transformations', () => {
  it('should apply scale to rectangle area', () => {
    const r = new Rectangle(0, 0, 10, 10);
    r.scaleX = 2;
    r.scaleY = 2;
    r.updateLocalMatrix();

    expect(Math.abs(r.area - 400) < 1).toBe(true);
  });

  it('should apply rotation to vector', () => {
    const v = new Vector(1, 0);
    const rotated = v.rotate(Math.PI / 2);
    expect(Math.abs(rotated.x) < 1e-6).toBe(true);
    expect(Math.abs(rotated.y - 1) < 1e-6).toBe(true);
  });

  it('should calculate bounding box with scale', () => {
    const c = new Circle(0, 0, 5);
    c.scaleX = 2;
    c.scaleY = 2;
    c.updateLocalMatrix();
    c.updateWorldMatrix(c.localMatrix);

    const bbox = c.boundingBox;
    expect(bbox.width > 10).toBe(true);
    expect(bbox.height > 10).toBe(true);
  });
});
