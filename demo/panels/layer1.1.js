/**
 * Layer 1.1 Geometry Demo
 * Showcases all 12 geometry primitives with interactive ray intersection,
 * closest point detection, and geometric property display.
 */

export default async function (Arena2D) {
  // Import geometry classes
  const {
    Point, Vector, Circle, Rectangle, Line, Ray, Ellipse,
    Polygon, Arc, QuadraticCurve, BezierCurve, Path
  } = Arena2D;

  const canvas = document.getElementById('l1.1-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Setup canvas - get parent container size
  function resizeCanvas() {
    const parent = canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(rect.width, 800);
      canvas.height = Math.max(rect.height - 100, 600);
    } else {
      canvas.width = 800;
      canvas.height = 600;
    }
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Create geometry shapes
  const shapes = [];
  const cols = 4;
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / 3;

  // Helper to add shape to grid
  function addShape(shape, label, col, row) {
    shape.x = col * cellWidth + cellWidth / 2;
    shape.y = row * cellHeight + cellHeight / 2;
    shape.updateLocalMatrix();
    shape.worldMatrix = shape.localMatrix.slice();
    shapes.push({ shape, label, col, row });
  }

  // Row 0: Basic shapes
  addShape(new Point(0, -30), 'Point', 0, 0);
  addShape(new Circle(0, 0, 20), 'Circle', 1, 0);
  addShape(new Rectangle(-20, -20, 40, 40), 'Rectangle', 2, 0);
  addShape(new Line(-30, 0, 30, 0), 'Line', 3, 0);

  // Row 1: More shapes
  addShape(new Ellipse(0, 0, 25, 15), 'Ellipse', 0, 1);
  addShape(new Ray(0, 0, 1, 0.5), 'Ray', 1, 1);
  const poly = new Polygon([{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 15, y: 15 }, { x: -15, y: 15 }], true);
  addShape(poly, 'Polygon', 2, 1);
  addShape(new Arc(0, 0, 20, 0, Math.PI), 'Arc', 3, 1);

  // Row 2: Curves
  addShape(new QuadraticCurve(-20, 0, 0, -25, 20, 0), 'QuadraticCurve', 0, 2);
  addShape(new BezierCurve([{ x: -20, y: 0 }, { x: -10, y: -25 }, { x: 10, y: -25 }, { x: 20, y: 0 }]), 'BezierCurve', 1, 2);

  const path = new Path();
  path.addMoveTo(-20, 0);
  path.addLineTo(0, -20);
  path.addLineTo(20, 0);
  path.addQuadraticCurveTo(0, 20, -20, 0);
  path.closePath();
  addShape(path, 'Path', 2, 2);

  // Vector demo
  const vectorShape = new Circle(0, 0, 3);
  addShape(vectorShape, 'Vector', 3, 2);

  // Mouse tracking
  let mouseX = canvas.width / 2;
  let mouseY = canvas.height / 2;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  // Animation loop
  function render() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(canvas.width, i * cellHeight);
      ctx.stroke();
    }

    // Create ray from canvas center through mouse
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const rayDirX = mouseX - centerX;
    const rayDirY = mouseY - centerY;
    const rayLen = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY);
    const rayNormX = rayLen > 0 ? rayDirX / rayLen : 1;
    const rayNormY = rayLen > 0 ? rayDirY / rayLen : 0;
    const ray = new Ray(centerX, centerY, rayNormX, rayNormY);
    ray.updateLocalMatrix();
    ray.worldMatrix = ray.localMatrix.slice();

    // Draw shapes and check intersections
    const infoLines = ['Geometry Primitives - Interactive Ray Demo:'];
    let intersectionCount = 0;

    for (const { shape, label, col, row } of shapes) {
      const cellCenterX = (col + 0.5) * cellWidth;
      const cellCenterY = (row + 0.5) * cellHeight;

      // Draw shape
      ctx.save();
      ctx.translate(cellCenterX, cellCenterY);
      ctx.strokeStyle = '#00ff00';
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.lineWidth = 2;

      if (label === 'Circle') {
        ctx.beginPath();
        ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (label === 'Rectangle') {
        ctx.strokeRect(shape.rectX, shape.rectY, shape.width, shape.height);
      } else if (label === 'Line') {
        ctx.beginPath();
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
      } else if (label === 'Ray') {
        ctx.beginPath();
        ctx.moveTo(shape.originX, shape.originY);
        const rayScale = 80;
        ctx.lineTo(shape.originX + shape.directionX * rayScale, shape.originY + shape.directionY * rayScale);
        ctx.stroke();
      } else if (label === 'Ellipse') {
        ctx.beginPath();
        ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (label === 'Polygon') {
        if (shape.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          if (shape.closed) ctx.closePath();
          ctx.stroke();
        }
      } else if (label === 'Arc') {
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.radius, shape.startAngle, shape.endAngle);
        ctx.stroke();
      } else if (label === 'QuadraticCurve') {
        ctx.beginPath();
        ctx.moveTo(shape.x0, shape.y0);
        ctx.quadraticCurveTo(shape.cpx, shape.cpy, shape.x1, shape.y1);
        ctx.stroke();
      } else if (label === 'BezierCurve') {
        ctx.beginPath();
        if (shape.controlPoints.length >= 2) {
          ctx.moveTo(shape.controlPoints[0].x, shape.controlPoints[0].y);
          if (shape.controlPoints.length === 3) {
            ctx.quadraticCurveTo(
              shape.controlPoints[1].x, shape.controlPoints[1].y,
              shape.controlPoints[2].x, shape.controlPoints[2].y
            );
          } else if (shape.controlPoints.length === 4) {
            ctx.bezierCurveTo(
              shape.controlPoints[1].x, shape.controlPoints[1].y,
              shape.controlPoints[2].x, shape.controlPoints[2].y,
              shape.controlPoints[3].x, shape.controlPoints[3].y
            );
          }
          ctx.stroke();
        }
      } else if (label === 'Path') {
        const path2d = new Path2D();
        let currentX = 0;
        let currentY = 0;
        for (const seg of shape.segments) {
          if (seg.type === 'moveTo') {
            path2d.moveTo(seg.x, seg.y);
            currentX = seg.x;
            currentY = seg.y;
          } else if (seg.type === 'lineTo') {
            path2d.lineTo(seg.x, seg.y);
            currentX = seg.x;
            currentY = seg.y;
          } else if (seg.type === 'quadraticCurveTo') {
            path2d.quadraticCurveTo(seg.cpx, seg.cpy, seg.x, seg.y);
            currentX = seg.x;
            currentY = seg.y;
          } else if (seg.type === 'closePath') {
            path2d.closePath();
          }
        }
        ctx.stroke(path2d);
      } else if (label === 'Point') {
        ctx.fillRect(shape.px - 2, shape.py - 2, 4, 4);
      } else if (label === 'Vector') {
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw closest point
      const closest = shape.closestPointTo(cellCenterX, cellCenterY);
      const closestLocalX = closest.x - cellCenterX;
      const closestLocalY = closest.y - cellCenterY;

      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(closestLocalX, closestLocalY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw distance
      const dist = shape.distanceTo(cellCenterX, cellCenterY);
      const infoStr = `${label}: d=${dist.toFixed(1)} area=${shape.area.toFixed(0)}`;
      infoLines.push(infoStr);

      // Highlight if ray intersects
      const rayIntersections = shape.intersectsLine(centerX, centerY, mouseX, mouseY);
      if (rayIntersections.length > 0) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        if (label === 'Circle') {
          ctx.beginPath();
          ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (label === 'Rectangle') {
          ctx.strokeRect(shape.rectX, shape.rectY, shape.width, shape.height);
        }
        intersectionCount++;
      }

      // Draw ray intersection points
      for (const pt of rayIntersections) {
        const localX = pt.x - cellCenterX;
        const localY = pt.y - cellCenterY;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(localX, localY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Draw center ray
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();

    // Draw info
    const infoEl = document.getElementById('l1.1-info');
    if (infoEl) {
      infoEl.innerHTML = `${infoLines.slice(0, 3).join('<br/>')}...<br/>Ray Intersections: ${intersectionCount}`;
    }

    requestAnimationFrame(render);
  }

  render();
}
