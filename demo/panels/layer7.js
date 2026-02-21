export default async function (Arena2D) {
  const { Scene, View, Container, Element, Rect, CircleElement } = Arena2D;

  // ── Controls ──

  const speedSlider = document.getElementById("ctrl-speed");
  const speedVal = document.getElementById("speed-val");
  const statFps = document.getElementById("stat-fps");

  // ── Output canvas (the visible quad-view) ──

  const outputCanvas = document.getElementById("quad-canvas");
  const outCtx = outputCanvas.getContext("2d");
  const outW = outputCanvas.width;
  const outH = outputCanvas.height;
  const gap = 4;

  // ── Scene ──

  const sceneW = 400;
  const sceneH = 300;
  const scene = new Scene(sceneW, sceneH);

  // Hidden container for the internal View
  const hiddenContainer = document.createElement("div");
  hiddenContainer.style.cssText =
    "position:absolute;left:-9999px;top:-9999px;width:" +
    sceneW +
    "px;height:" +
    sceneH +
    "px;overflow:hidden;";
  document.body.appendChild(hiddenContainer);

  const view = new View(hiddenContainer, scene, {
    enableMousePan: false,
    enableMouseZoom: false,
  });
  view.resize(sceneW, sceneH);

  // Box and Circle removed in favor of core Rect/CircleElement

  class GradientBackground extends Element {
    constructor(width, height) {
      super();
      this.width = width;
      this.height = height;
    }

    paint(ctx) {
      const gradient = ctx.createLinearGradient(0, 0, this.width, this.height, [
        { offset: 0, color: "#1a1a2e" },
        { offset: 0.5, color: "#16213e" },
        { offset: 1, color: "#0f3460" },
      ]);
      ctx.drawRect(0, 0, this.width, this.height, gradient);
    }
  }

  // ── Scene content ──

  const root = scene.root;

  const bg = new GradientBackground(sceneW, sceneH);
  root.addChild(bg);

  // Static shapes — one per quadrant
  const createBox = (c1, c2) => {
    const r = new Rect();
    r.width = 60;
    r.height = 60;
    r.paint = (ctx) => {
      const g = ctx.createLinearGradient(0, 0, r.width, r.height, [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 },
      ]);
      ctx.drawRect(0, 0, r.width, r.height, g);
    };
    return r;
  };

  const createCircle = (radius, c1, c2) => {
    const c = new CircleElement();
    c.radius = radius;
    c.paint = (ctx) => {
      const g = ctx.createRadialGradient(radius, radius, radius, [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 },
      ]);
      ctx.drawCircle(radius, radius, radius, g);
    };
    return c;
  };

  const box1 = createBox("#ffffff", "#4299e1");
  box1.x = 30;
  box1.y = 30;
  root.addChild(box1);

  const box2 = createBox("#ffffff", "#667eea");
  box2.x = 250;
  box2.y = 40;
  root.addChild(box2);

  const box3 = createBox("#ffffff", "#ed64a6");
  box3.x = 40;
  box3.y = 190;
  root.addChild(box3);

  const box4 = createBox("#ffffff", "#38b2ac");
  box4.x = 280;
  box4.y = 200;
  root.addChild(box4);

  const circle1 = createCircle(25, "#ffffff", "#f56565");
  circle1.x = 150;
  circle1.y = 20;
  root.addChild(circle1);

  const circle2 = createCircle(30, "#ffffff", "#9f7aea");
  circle2.x = 160;
  circle2.y = 180;
  root.addChild(circle2);

  // ── Animated elements ──

  let speedMultiplier = 1.0;

  // Bouncing box
  const animBox = createBox("#ffffff", "#f56565");
  animBox.width = 50;
  animBox.height = 50;
  animBox.x = 80;
  animBox.y = 60;
  let boxVx = 100;
  let boxVy = 70;
  let boxRot = 0;
  root.addChild(animBox);

  const origBoxUpdate = animBox.update.bind(animBox);
  animBox.update = (dt) => {
    origBoxUpdate(dt);
    const adt = dt * speedMultiplier;
    animBox.x += boxVx * adt;
    animBox.y += boxVy * adt;
    boxRot += Math.PI * 0.4 * adt;
    animBox.rotation = boxRot;

    if (animBox.x <= 0) {
      boxVx = Math.abs(boxVx);
      animBox.x = 0;
    } else if (animBox.x + animBox.width >= sceneW) {
      boxVx = -Math.abs(boxVx);
      animBox.x = sceneW - animBox.width;
    }
    if (animBox.y <= 0) {
      boxVy = Math.abs(boxVy);
      animBox.y = 0;
    } else if (animBox.y + animBox.height >= sceneH) {
      boxVy = -Math.abs(boxVy);
      animBox.y = sceneH - animBox.height;
    }
  };

  // Orbiting circle
  const animCircle = createCircle(20, "#ffffff", "#48bb78");
  let angle = 0;
  root.addChild(animCircle);

  const origCircleUpdate = animCircle.update.bind(animCircle);
  animCircle.update = (dt) => {
    origCircleUpdate(dt);
    const adt = dt * speedMultiplier;
    angle += Math.PI * 2 * 0.3 * adt;
    animCircle.x = sceneW / 2 + Math.cos(angle) * 120 - animCircle.radius;
    animCircle.y = sceneH / 2 + Math.sin(angle) * 80 - animCircle.radius;
  };

  // Orbiting circle 2 (opposite phase)
  const animCircle2 = createCircle(15, "#ffffff", "#ecc94b");
  let angle2 = Math.PI;
  root.addChild(animCircle2);

  const origCircle2Update = animCircle2.update.bind(animCircle2);
  animCircle2.update = (dt) => {
    origCircle2Update(dt);
    const adt = dt * speedMultiplier;
    angle2 += Math.PI * 2 * 0.5 * adt;
    animCircle2.x = sceneW / 2 + Math.cos(angle2) * 80 - animCircle2.radius;
    animCircle2.y = sceneH / 2 + Math.sin(angle2) * 60 - animCircle2.radius;
  };

  // ── Quad-view source→dest mapping ──
  //
  // Persistent mapping objects — their sourceRects are mutated
  // independently by per-mapping wheel zoom and middle-click pan.

  const halfW = sceneW / 2;
  const halfH = sceneH / 2;
  const quadDestW = (outW - gap) / 2;
  const quadDestH = (outH - gap) / 2;

  const mappings = [
    {
      label: "Q1",
      source: { x: 0, y: 0, w: halfW, h: halfH },
      dest: { x: 0, y: 0, w: quadDestW, h: quadDestH },
    },
    {
      label: "Q2",
      source: { x: halfW, y: 0, w: halfW, h: halfH },
      dest: { x: quadDestW + gap, y: 0, w: quadDestW, h: quadDestH },
    },
    {
      label: "Q3",
      source: { x: 0, y: halfH, w: halfW, h: halfH },
      dest: { x: 0, y: quadDestH + gap, w: quadDestW, h: quadDestH },
    },
    {
      label: "Q4",
      source: { x: halfW, y: halfH, w: halfW, h: halfH },
      dest: {
        x: quadDestW + gap,
        y: quadDestH + gap,
        w: quadDestW,
        h: quadDestH,
      },
    },
  ];

  // ── Hit-test: find the topmost mapping under a canvas-local point ──

  function hitTestMapping(canvasX, canvasY) {
    for (let i = mappings.length - 1; i >= 0; i--) {
      const m = mappings[i];
      const d = m.dest;
      if (
        canvasX >= d.x &&
        canvasX <= d.x + d.w &&
        canvasY >= d.y &&
        canvasY <= d.y + d.h
      ) {
        return m;
      }
    }
    return null;
  }

  // ── Compositing: read from scene's layer canvas, draw to output ──

  const defaultLayer = view.getLayer("default");
  const layerCanvas = defaultLayer.canvas;
  const dpr = view.dpr;

  scene.ticker.add({
    id: "quad-compositor",
    update: () => {
      outCtx.clearRect(0, 0, outW, outH);

      // Draw grid background
      outCtx.fillStyle = "#222";
      outCtx.fillRect(0, 0, outW, outH);

      for (const { label, source, dest } of mappings) {
        // source coords in CSS pixels → physical pixels on the layer canvas
        outCtx.drawImage(
          layerCanvas,
          source.x * dpr,
          source.y * dpr,
          source.w * dpr,
          source.h * dpr,
          dest.x,
          dest.y,
          dest.w,
          dest.h,
        );

        // Draw label with effective magnification
        const zoom = (dest.w / source.w).toFixed(1);
        outCtx.fillStyle = "rgba(255,255,255,0.6)";
        outCtx.font = "11px sans-serif";
        outCtx.fillText(`${label} (${zoom}×)`, dest.x + 6, dest.y + 16);
      }

      // Draw crosshair lines
      outCtx.fillStyle = "#444";
      outCtx.fillRect(quadDestW, 0, gap, outH);
      outCtx.fillRect(0, quadDestH, outW, gap);
    },
  });

  // ── FPS Counter ──

  let lastFpsUpdate = performance.now();
  let frames = 0;

  scene.ticker.add({
    id: "fps-counter",
    update: () => {
      frames++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 500) {
        const fps = (frames * 1000) / (now - lastFpsUpdate);
        statFps.textContent = fps.toFixed(1);
        frames = 0;
        lastFpsUpdate = now;
      }
    },
  });

  // ── Controls ──

  speedSlider.addEventListener("input", (e) => {
    speedMultiplier = Number.parseFloat(e.target.value);
    speedVal.textContent = `${speedMultiplier.toFixed(1)}x`;
  });

  // ── Wheel Zoom (per-mapping sourceRect) ──

  outputCanvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      const rect = outputCanvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const hit = hitTestMapping(canvasX, canvasY);
      if (!hit) return;

      const src = hit.source;
      const dst = hit.dest;

      // Map cursor from destRect → sourceRect (scene) space
      const tX = (canvasX - dst.x) / dst.w; // 0..1 within destRect
      const tY = (canvasY - dst.y) / dst.h;
      const sceneX = src.x + tX * src.w;
      const sceneY = src.y + tY * src.h;

      // Shrink sourceRect = zoom in, grow = zoom out
      const zoomFactor = e.deltaY < 0 ? 1 / 1.1 : 1.1;
      const newW = src.w * zoomFactor;
      const newH = src.h * zoomFactor;

      // Reposition so scene point stays under cursor
      src.x = sceneX - tX * newW;
      src.y = sceneY - tY * newH;
      src.w = newW;
      src.h = newH;
    },
    { passive: false },
  );

  // ── Middle-Click Pan (per-mapping sourceRect) ──

  let panTarget = null;
  let lastPanX = 0;
  let lastPanY = 0;

  outputCanvas.style.cursor = "grab";

  outputCanvas.addEventListener("pointerdown", (e) => {
    if (e.button === 1) {
      const rect = outputCanvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      panTarget = hitTestMapping(canvasX, canvasY);
      if (!panTarget) return;

      lastPanX = e.clientX;
      lastPanY = e.clientY;
      outputCanvas.style.cursor = "grabbing";
      outputCanvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  outputCanvas.addEventListener("pointermove", (e) => {
    if (!panTarget) return;
    const dx = e.clientX - lastPanX;
    const dy = e.clientY - lastPanY;

    // Convert pixel delta from dest space to source (scene) space
    const scaleX = panTarget.source.w / panTarget.dest.w;
    const scaleY = panTarget.source.h / panTarget.dest.h;

    // Drag right → reveal content to the left → sourceRect.x decreases
    panTarget.source.x -= dx * scaleX;
    panTarget.source.y -= dy * scaleY;

    lastPanX = e.clientX;
    lastPanY = e.clientY;
  });

  outputCanvas.addEventListener("pointerup", (e) => {
    if (!panTarget) return;
    panTarget = null;
    outputCanvas.style.cursor = "grab";
    outputCanvas.releasePointerCapture(e.pointerId);
  });

  // Prevent context menu on middle-click
  outputCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ── Start ──

  scene.ticker.start();

  // ── Cleanup ──

  window.addEventListener("beforeunload", () => {
    scene.destroy();
    hiddenContainer.remove();
  });
}
