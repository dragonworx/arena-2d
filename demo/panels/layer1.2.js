/**
 * Layer 1.2 — Composite Geometry & Element Subclasses Demo
 *
 * Demonstrates:
 * - GeometryElement: shapes as Elements in a Scene
 * - CompositeGeometry: nesting shapes under a composite
 * - All Element subclasses: LineElement, EllipseElement, PolygonElement,
 *   ArcElement, QuadraticCurveElement, BezierCurveElement, PathElement
 * - Interaction: hover detection on all elements
 * - Ray intersection: green ray from top-left through pointer
 * - Closest point: yellow dot + dashed line from pointer to body within 150px
 * - Intersection points: pink dots where the ray hits shapes
 */

export default async function (Arena2D) {
  const {
    Scene, View, Element, Container,
    GeometryElement, CompositeGeometry,
    Circle: CircleGeometry, Rectangle, Ellipse, Polygon,
    Line: LineGeometry, Arc: ArcGeometry,
    QuadraticCurve: QuadCurveGeometry, BezierCurve: BezierCurveGeometry,
    Path: PathGeometry,
    LineElement, EllipseElement, PolygonElement,
    ArcElement, QuadraticCurveElement, BezierCurveElement, PathElement,
    Vector,
    identity,
  } = Arena2D;

  const sceneContainer = document.getElementById('l1.2-scene-container');
  if (!sceneContainer) return;

  const W = 800, H = 600;
  const scene = new Scene(W, H);
  const view = new View(sceneContainer, scene);
  view.resize(W, H);

  // ── 1. Build the humanoid composite geometry ──

  const bodyComposite = new CompositeGeometry();

  // Torso
  const torso = new Rectangle(-120, -150, 240, 300);

  // Head
  const head = new CircleGeometry(0, -240, 90);

  // Arms — wrapped in sub-composites for shoulder pivots
  const leftArmGroup = new CompositeGeometry();
  const leftArmRect = new Rectangle(-30, 0, 60, 240);
  leftArmGroup.addChild(leftArmRect);
  leftArmGroup.x = -120; // shoulder joint on torso left
  leftArmGroup.y = -120;

  const rightArmGroup = new CompositeGeometry();
  const rightArmRect = new Rectangle(-30, 0, 60, 240);
  rightArmGroup.addChild(rightArmRect);
  rightArmGroup.x = 120; // shoulder joint on torso right
  rightArmGroup.y = -120;

  // Legs
  const leftLeg = new Rectangle(-90, 165, 66, 210);
  const rightLeg = new Rectangle(24, 165, 66, 210);

  // Belly
  const belly = new Ellipse(0, 0, 75, 60);

  bodyComposite.addChild(torso);
  bodyComposite.addChild(head);
  bodyComposite.addChild(leftArmGroup);
  bodyComposite.addChild(rightArmGroup);
  bodyComposite.addChild(leftLeg);
  bodyComposite.addChild(rightLeg);
  bodyComposite.addChild(belly);

  // ── 2. Create the Body Element ──

  const bodyEl = new GeometryElement(bodyComposite, 'body-element');
  bodyEl.x = W / 2;
  bodyEl.y = H / 2;
  bodyEl.scaleX = 0.6;
  bodyEl.scaleY = 0.6;
  bodyEl.interactive = true;
  bodyEl.cursor = 'pointer';
  bodyEl.fill = 'rgba(74, 144, 226, 0.35)';
  bodyEl.stroke = '#4a90e2';
  bodyEl.lineWidth = 2;

  let isHovered = false;
  bodyEl.on('pointerenter', () => {
    isHovered = true;
    bodyEl.fill = 'rgba(255, 60, 60, 0.6)';
    bodyEl.stroke = '#ff6060';
  });
  bodyEl.on('pointerleave', () => {
    isHovered = false;
    bodyEl.fill = 'rgba(74, 144, 226, 0.35)';
    bodyEl.stroke = '#4a90e2';
  });

  scene.root.addChild(bodyEl);

  // ── 3. Add Standalone shapes (geometry-based + element subclasses) ──

  const shapes = [];

  const addStandalone = (geo, id, x, y, color) => {
    const el = new GeometryElement(geo, id);
    el.x = x; el.y = y;
    el.interactive = true;
    el.fill = color + '55';
    el.stroke = color;
    el.lineWidth = 2;

    el.on('pointerenter', () => { el.fill = color + 'aa'; el.lineWidth = 4; });
    el.on('pointerleave', () => { el.fill = color + '55'; el.lineWidth = 2; });

    scene.root.addChild(el);
    shapes.push({ el, geo, baseX: x, baseY: y, phase: shapes.length });
  };

  // Helper to add Element subclass instances (closed shapes get fill + stroke)
  const addElementShape = (el, x, y, color, strokeOnly = false) => {
    el.x = x; el.y = y;
    el.interactive = true;
    if (!strokeOnly) el.fill = color + '55';
    el.stroke = color;
    el.lineWidth = 2;

    if (strokeOnly) {
      el.on('pointerenter', () => { el.lineWidth = 4; });
      el.on('pointerleave', () => { el.lineWidth = 2; });
    } else {
      el.on('pointerenter', () => { el.fill = color + 'aa'; el.lineWidth = 4; });
      el.on('pointerleave', () => { el.fill = color + '55'; el.lineWidth = 2; });
    }

    scene.root.addChild(el);
    shapes.push({ el, geo: el.geometry, baseX: x, baseY: y, phase: shapes.length });
  };

  // Row 1 — Original geometry-wrapped shapes (top)
  addStandalone(new CircleGeometry(0, 0, 45), 'circle', 100, 80, '#e74c3c');
  addStandalone(new Rectangle(-45, -45, 90, 90), 'rect', 250, 80, '#2ecc71');

  // Row 2 — Element subclass shapes (left side)
  const lineEl = new LineElement('line-el');
  lineEl.x1 = -50; lineEl.y1 = -30;
  lineEl.x2 = 50; lineEl.y2 = 30;
  addElementShape(lineEl, 100, 200, '#e67e22', true);

  const ellipseEl = new EllipseElement('ellipse-el');
  ellipseEl.rx = 55; ellipseEl.ry = 30;
  addElementShape(ellipseEl, 250, 200, '#f1c40f');

  // Row 3 — More element subclasses (left side)
  const triPoints = [
    { x: 0, y: -45 }, { x: 40, y: 30 }, { x: -40, y: 30 },
  ];
  const polyEl = new PolygonElement(triPoints, true, 'polygon-el');
  addElementShape(polyEl, 100, 340, '#1abc9c');

  const arcEl = new ArcElement('arc-el');
  arcEl.radius = 40;
  arcEl.startAngle = 0;
  arcEl.endAngle = Math.PI * 1.5;
  addElementShape(arcEl, 250, 340, '#3498db', true);

  // Row 4 — Curve elements (bottom left)
  const quadEl = new QuadraticCurveElement('quad-el');
  quadEl.x0 = -50; quadEl.y0 = 25;
  quadEl.cpx = 0; quadEl.cpy = -50;
  quadEl.x1 = 50; quadEl.y1 = 25;
  addElementShape(quadEl, 100, 480, '#e74c3c', true);

  const bezierEl = new BezierCurveElement([
    { x: -60, y: 20 }, { x: -20, y: -50 }, { x: 20, y: 50 }, { x: 60, y: -20 },
  ], 'bezier-el');
  addElementShape(bezierEl, 250, 480, '#9b59b6', true);

  // Pentagon polygon (right side)
  const pentPoints = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    pentPoints.push({ x: Math.cos(a) * 50, y: Math.sin(a) * 50 });
  }
  addStandalone(new Polygon(pentPoints, true), 'poly', W - 120, 80, '#9b59b6');

  // PathElement — star shape (right side)
  const pathEl = new PathElement('path-el');
  const starPath = pathEl.geometry;
  const outerR = 45, innerR = 20, spikes = 5;
  starPath.addMoveTo(0, -outerR);
  for (let i = 0; i < spikes; i++) {
    const outerAngle = (i / spikes) * Math.PI * 2 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / spikes;
    const nextOuterAngle = ((i + 1) / spikes) * Math.PI * 2 - Math.PI / 2;
    starPath.addLineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
    starPath.addLineTo(Math.cos(nextOuterAngle) * outerR, Math.sin(nextOuterAngle) * outerR);
  }
  starPath.closePath();
  addElementShape(pathEl, W - 120, 200, '#e91e63');

  // Open polyline (right side)
  const wavePoints = [];
  for (let i = 0; i <= 8; i++) {
    wavePoints.push({ x: -50 + i * 12.5, y: Math.sin(i * 0.8) * 30 });
  }
  const waveEl = new PolygonElement(wavePoints, false, 'wave-el');
  addElementShape(waveEl, W - 120, 340, '#00bcd4', true);

  // Another path — spiral-like curve (right side)
  const spiralPathEl = new PathElement('spiral-path-el');
  const sp = spiralPathEl.geometry;
  sp.addMoveTo(-40, 0);
  sp.addBezierCurveTo(-40, -40, 40, -40, 40, 0);
  sp.addBezierCurveTo(40, 30, -20, 30, -20, 0);
  sp.addBezierCurveTo(-20, -15, 15, -15, 15, 0);
  addElementShape(spiralPathEl, W - 120, 480, '#ff9800', true);

  // ── 4. Overlay for Ray/Closest Indicators ──

  let mouseX = -1000, mouseY = -1000;
  sceneContainer.addEventListener('mousemove', (e) => {
    const rect = sceneContainer.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  const overlay = new Element('overlay');
  overlay.zIndex = 1000;
  overlay.paint = (ctx) => {
    const raw = ctx.raw;

    const allObjects = [bodyComposite, ...shapes.map(s => s.geo)];

    // 1. Ray from Top-Left (20,20) through all objects
    const oX = 20, oY = 20;
    const dX = mouseX - oX, dY = mouseY - oY;
    const l = Math.sqrt(dX * dX + dY * dY);
    if (l > 1) {
      const eX = oX + (dX / l) * 1500;
      const eY = oY + (dY / l) * 1500;

      raw.strokeStyle = '#00ffaa';
      raw.globalAlpha = 0.3;
      raw.lineWidth = 1;
      raw.beginPath(); raw.moveTo(oX, oY); raw.lineTo(eX, eY); raw.stroke();
      raw.globalAlpha = 1.0;

      for (const obj of allObjects) {
        const hits = obj.intersectsLine(oX, oY, eX, eY);
        for (const h of hits) {
          raw.fillStyle = '#ff00ff';
          raw.beginPath(); raw.arc(h.x, h.y, 6, 0, Math.PI * 2); raw.fill();
          raw.strokeStyle = '#fff'; raw.lineWidth = 1; raw.stroke();
        }
      }
    }

    // 2. Closest Point for ALL objects within range
    for (const obj of allObjects) {
      const dist = obj.distanceTo(mouseX, mouseY);
      if (dist < 150 && dist > 0.1) {
        const closest = obj.closestPointTo(mouseX, mouseY);
        raw.strokeStyle = '#ffff00';
        raw.lineWidth = 1.5;
        raw.setLineDash([4, 4]);
        raw.beginPath();
        raw.moveTo(mouseX, mouseY);
        raw.lineTo(closest.x, closest.y);
        raw.stroke();
        raw.setLineDash([]);

        raw.fillStyle = '#ffff00';
        raw.beginPath(); raw.arc(closest.x, closest.y, 5, 0, Math.PI * 2); raw.fill();

        // Draw reflection vector
        try {
          const normal = obj.closestNormalTo(mouseX, mouseY);
          const incident = new Vector(closest.x - mouseX, closest.y - mouseY).normalize();
          const reflected = incident.reflect(normal);
          const refLen = 60;
          raw.strokeStyle = '#00ffff';
          raw.lineWidth = 1;
          raw.setLineDash([2, 2]);
          raw.beginPath();
          raw.moveTo(closest.x, closest.y);
          raw.lineTo(closest.x + reflected.x * refLen, closest.y + reflected.y * refLen);
          raw.stroke();
          raw.setLineDash([]);
        } catch (_) { /* skip if normalAt not available */ }
      }
    }

    // 3. Crosshair
    raw.strokeStyle = 'rgba(255,255,255,0.4)';
    raw.lineWidth = 1;
    raw.beginPath();
    raw.moveTo(mouseX - 10, mouseY); raw.lineTo(mouseX + 10, mouseY);
    raw.moveTo(mouseX, mouseY - 10); raw.lineTo(mouseX, mouseY + 10);
    raw.stroke();

    // 4. Labels for element types
    raw.font = '10px monospace';
    raw.textAlign = 'center';
    raw.fillStyle = 'rgba(255,255,255,0.5)';
    const labels = [
      [100, 125, 'Circle'], [250, 125, 'Rect'],
      [100, 240, 'LineElement'], [250, 240, 'EllipseElement'],
      [100, 385, 'PolygonElement'], [250, 385, 'ArcElement'],
      [100, 520, 'QuadCurveElement'], [250, 520, 'BezierCurveElement'],
      [W - 120, 125, 'Polygon'], [W - 120, 245, 'PathElement'],
      [W - 120, 385, 'Polyline (open)'], [W - 120, 520, 'PathElement (spiral)'],
    ];
    for (const [lx, ly, label] of labels) {
      raw.fillText(label, lx, ly);
    }

    // 5. Update status text
    const info = document.getElementById('l1.2-info');
    if (info) {
      info.innerHTML = `Body Hover: ${isHovered ? '<span style="color:#f66">TRUE</span>' : 'false'} | ` +
        `Mouse: (${Math.round(mouseX)}, ${Math.round(mouseY)}) | ` +
        `Elements: ${shapes.length + 1} (body + ${shapes.length} standalone)`;
    }
  };
  scene.root.addChild(overlay);

  // ── 5. Main Ticker ──

  scene.ticker.add({
    update: (dt) => {
      const t = Date.now() * 0.001;

      // Body animation
      bodyEl.rotation = 0.1 * Math.sin(t * 0.6);
      bodyEl.x = W / 2 + 10 * Math.sin(t * 0.4);
      bodyEl.y = H / 2 + 8 * Math.cos(t * 0.3);
      bodyEl.skewX = 0.2 * Math.sin(t * 0.8);

      // Recursive arm animation (child of composite)
      leftArmGroup.rotation = (Math.PI / 2) * Math.sin(t * 1.8);
      rightArmGroup.rotation = (Math.PI / 2) * Math.sin(t * 1.8 + Math.PI);

      // Standalone shape animations — gentle bob
      for (const s of shapes) {
        s.el.rotation = t * 0.5 + s.phase;
        s.el.x = s.baseX + 8 * Math.sin(t * 1.2 + s.phase);
        s.el.y = s.baseY + 6 * Math.cos(t * 1.0 + s.phase);
      }
    }
  });

  scene.ticker.start();
}
