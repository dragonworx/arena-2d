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
    // Sync CSS size to prevent stretching
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
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
    shape.rotation = 0;
    shape.updateLocalMatrix();
    shape.worldMatrix = shape.localMatrix.slice();
    shapes.push({ shape, label, col, row });
  }

  // Row 0: Basic shapes
  const polyline = new Polygon([
    { x: -45, y: 15 }, { x: -22.5, y: -30 }, { x: 0, y: 15 },
    { x: 22.5, y: -30 }, { x: 45, y: 15 }, { x: 60, y: -15 }
  ], false);
  addShape(polyline, 'Polyline', 0, 0);
  addShape(new Circle(0, 0, 30), 'Circle', 1, 0);
  addShape(new Rectangle(-30, -30, 60, 60), 'Rectangle', 2, 0);
  addShape(new Line(-45, 0, 45, 0), 'Line', 3, 0);

  // Row 1: More shapes
  addShape(new Ellipse(0, 0, 37.5, 22.5), 'Ellipse', 0, 1);
  const bezier5 = new BezierCurve([
    { x: -45, y: 0 }, { x: -22.5, y: -45 }, { x: 0, y: 45 }, { x: 22.5, y: -45 }, { x: 45, y: 0 }
  ]);
  addShape(bezier5, 'Bezier-5', 1, 1);
  const poly = new Polygon([{ x: -30, y: -30 }, { x: 30, y: -30 }, { x: 22.5, y: 22.5 }, { x: -22.5, y: 22.5 }], true);
  addShape(poly, 'Polygon', 2, 1);
  addShape(new Arc(0, 0, 30, 0, Math.PI), 'Arc', 3, 1);

  // Row 2: Curves
  addShape(new QuadraticCurve(-30, 0, 0, -37.5, 30, 0), 'QuadraticCurve', 0, 2);
  addShape(new BezierCurve([{ x: -30, y: 0 }, { x: -15, y: -37.5 }, { x: 15, y: -37.5 }, { x: 30, y: 0 }]), 'BezierCurve', 1, 2);

  const path = new Path();
  path.addMoveTo(-45, -15);
  path.addLineTo(-15, 22.5);
  path.addQuadraticCurveTo(7.5, -30, 30, 15);
  path.addLineTo(52.5, -22.5);
  addShape(path, 'Path', 2, 2);

  // Spline (9-point Bezier)
  const spline = new BezierCurve([
    { x: -52.5, y: 22.5 }, { x: -37.5, y: -37.5 }, { x: -22.5, y: 30 },
    { x: -7.5, y: -30 }, { x: 7.5, y: 37.5 }, { x: 22.5, y: -30 },
    { x: 37.5, y: 30 }, { x: 45, y: -22.5 }, { x: 52.5, y: 15 }
  ]);
  addShape(spline, 'Spline', 3, 2);

  // Mouse tracking
  let mouseX = canvas.width / 2;
  let mouseY = canvas.height / 2;
  let parametricT = 0;
  let rotation = 0;
  let scale = 1;
  let skewX = 0;

  const tSlider = document.getElementById('l1.1-t-slider');
  const tValue = document.getElementById('l1.1-t-value');
  if (tSlider && tValue) {
    tSlider.addEventListener('input', (e) => {
      parametricT = parseFloat(e.target.value);
      tValue.textContent = parametricT.toFixed(2);
    });
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  // Helper to draw shape geometry
  function drawShapeGeometry(ctx, shape, label) {
    if (label === 'Circle') {
      ctx.beginPath();
      ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
    } else if (label === 'Rectangle') {
      ctx.beginPath();
      ctx.rect(shape.rectX, shape.rectY, shape.width, shape.height);
    } else if (label === 'Line') {
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
    } else if (label === 'Ellipse') {
      ctx.beginPath();
      ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
    } else if (label === 'Polygon' || label === 'Polyline') {
      if (shape.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        if (shape.closed) ctx.closePath();
      }
    } else if (label === 'Arc') {
      ctx.beginPath();
      ctx.arc(shape.cx, shape.cy, shape.radius, shape.startAngle, shape.endAngle);
    } else if (label === 'QuadraticCurve') {
      ctx.beginPath();
      ctx.moveTo(shape.x0, shape.y0);
      ctx.quadraticCurveTo(shape.cpx, shape.cpy, shape.x1, shape.y1);
    } else if (label === 'BezierCurve' || label === 'Bezier-5' || label === 'Spline') {
      ctx.beginPath();
      if (shape.controlPoints && shape.controlPoints.length >= 2) {
        ctx.moveTo(shape.controlPoints[0].x, shape.controlPoints[0].y);
        if (label === 'BezierCurve' && shape.controlPoints.length === 4) {
          ctx.bezierCurveTo(
            shape.controlPoints[1].x, shape.controlPoints[1].y,
            shape.controlPoints[2].x, shape.controlPoints[2].y,
            shape.controlPoints[3].x, shape.controlPoints[3].y
          );
        } else {
          // Sample high-order Beziers
          for (let i = 1; i <= 64; i++) {
            const pt = shape.pointAt(i / 64);
            const local = shape.worldToLocal(pt.x, pt.y);
            ctx.lineTo(local.x, local.y);
          }
        }
      }
    } else if (label === 'Path') {
      ctx.beginPath();
      for (const seg of shape.segments) {
        if (seg.type === 'moveTo') ctx.moveTo(seg.x, seg.y);
        else if (seg.type === 'lineTo') ctx.lineTo(seg.x, seg.y);
        else if (seg.type === 'quadraticCurveTo') ctx.quadraticCurveTo(seg.cpx, seg.cpy, seg.x, seg.y);
        else if (seg.type === 'bezierCurveTo') ctx.bezierCurveTo(seg.cp1x, seg.cp1y, seg.cp2x, seg.cp2y, seg.x, seg.y);
        else if (seg.type === 'arc') ctx.arc(seg.cx, seg.cy, seg.radius, seg.startAngle, seg.endAngle, seg.counterclockwise);
        else if (seg.type === 'closePath') ctx.closePath();
      }
    }
  }

  // Animation loop
  function render() {
    rotation += 0.002; // Slowly rotate shapes
    scale = 0.8 + 0.2 * Math.sin(Date.now() * 0.001); // Pulse scale
    skewX = 0.2 * Math.sin(Date.now() * 0.0015); // Oscillate skew

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

    // Update shape transforms
    for (const { shape } of shapes) {
      shape.rotation = rotation;
      shape.scaleX = scale;
      shape.scaleY = scale;
      shape.skewX = skewX;
      shape.updateLocalMatrix();
      shape.worldMatrix = shape.localMatrix.slice();
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
      const cellLeft = col * cellWidth;
      const cellTop = row * cellHeight;
      const cellCenterX = cellLeft + cellWidth / 2;
      const cellCenterY = cellTop + cellHeight / 2;

      // Draw label in top left
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label.toUpperCase(), cellLeft + 5, cellTop + 5);

      // Draw shape (transforms are applied via worldMatrix)
      ctx.save();
      // Apply worldMatrix to canvas: transform = translate × rotation × scale × skew
      const m = shape.worldMatrix;
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

      const rayIntersections = shape.intersectsLine(centerX, centerY, mouseX, mouseY);

      // Highlight if ray intersects (outline only, no fill)
      if (rayIntersections.length > 0) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        intersectionCount++;
      } else {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
      }

      drawShapeGeometry(ctx, shape, label);
      ctx.stroke();

      // Draw segment points (white dots) for multi-segment shapes
      ctx.fillStyle = '#ffffff';
      if (label === 'Path' && shape.segments) {
        for (const seg of shape.segments) {
          if (seg.x !== undefined && seg.y !== undefined) {
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if ((label === 'Polyline' || label === 'Polygon') && shape.points) {
        for (const pt of shape.points) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if ((label === 'BezierCurve' || label === 'Bezier-5' || label === 'Spline') && shape.controlPoints) {
        // Draw control handles
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(shape.controlPoints[0].x, shape.controlPoints[0].y);
        for (let i = 1; i < shape.controlPoints.length; i++) {
          ctx.lineTo(shape.controlPoints[i].x, shape.controlPoints[i].y);
        }
        ctx.stroke();

        // Draw control point dots
        for (const pt of shape.controlPoints) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Calculate distance and closest point (before restore so we can use them later)
      const dist = shape.distanceTo(mouseX, mouseY);
      const closest = shape.closestPointTo(mouseX, mouseY);
      const infoStr = `${label}: d=${dist.toFixed(1)} area=${shape.area.toFixed(0)}`;
      infoLines.push(infoStr);

      ctx.restore();

      // Draw closest point (from pointer location) in world space
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(closest.x, closest.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw dotted line to pointer if within 20px
      if (dist < 80) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(closest.x, closest.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw parametric point (cyan dot) in world space
      try {
        const pT = shape.pointAt(parametricT);
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(pT.x, pT.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } catch (e) {
        // Some shapes might not implement pointAt correctly yet
      }

      // Draw ray intersection points in world space (outside rotation)
      for (const pt of rayIntersections) {
        ctx.fillStyle = '#ff69b4'; // Pink
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2); // 200% size
        ctx.fill();
      }
    }

    // Draw center ray
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw info
    const infoEl = document.getElementById('l1.1-info');
    if (infoEl) {
      infoEl.innerHTML = `${infoLines.slice(0, 3).join('<br/>')}...<br/>Ray Intersections: ${intersectionCount}`;
    }

    requestAnimationFrame(render);
  }

  render();
}
