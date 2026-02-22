export default async function (Arena2D) {
  const { Scene, View, Container, Element, Rect, CircleElement } = Arena2D;

  // ── Controls ──

  const speedSlider = document.getElementById("ctrl-speed");
  const speedVal = document.getElementById("speed-val");
  const statFps = document.getElementById("stat-fps");
  const constrainPanCb = document.getElementById("ctrl-constrain-pan");
  const constrainZoomCb = document.getElementById("ctrl-constrain-zoom");
  const bgColorInput = document.getElementById("ctrl-bg-color");

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
      ctx.drawRect(0, 0, this.width, this.height, { fillColor: gradient });
    }
  }

  // ── Element interaction state ──

  const elState = new Map(); // element → { hovered, c1, c2 }

  function randomColor() {
    return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
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
    const state = { hovered: false, c1, c2 };
    elState.set(r, state);
    r.paint = (ctx) => {
      const g = ctx.createLinearGradient(0, 0, r.width, r.height, [
        { offset: 0, color: state.c1 },
        { offset: 1, color: state.c2 },
      ]);
      ctx.drawRect(0, 0, r.width, r.height, { fillColor: g });
      if (state.hovered) {
        ctx.raw.setLineDash([6, 4]);
        ctx.raw.strokeStyle = "#ffffff";
        ctx.raw.lineWidth = 3;
        ctx.raw.strokeRect(1.5, 1.5, r.width - 3, r.height - 3);
        ctx.raw.setLineDash([]);
      }
    };
    return r;
  };

  const createCircle = (radius, c1, c2) => {
    const c = new CircleElement();
    c.radius = radius;
    const state = { hovered: false, c1, c2 };
    elState.set(c, state);
    c.paint = (ctx) => {
      const g = ctx.createRadialGradient(radius, radius, radius, [
        { offset: 0, color: state.c1 },
        { offset: 1, color: state.c2 },
      ]);
      ctx.drawCircle(radius, radius, radius, { fillColor: g });
      if (state.hovered) {
        ctx.raw.setLineDash([6, 4]);
        ctx.raw.strokeStyle = "#ffffff";
        ctx.raw.lineWidth = 3;
        ctx.raw.beginPath();
        ctx.raw.arc(radius, radius, radius - 1.5, 0, Math.PI * 2);
        ctx.raw.stroke();
        ctx.raw.setLineDash([]);
      }
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
      outCtx.fillStyle = bgColorInput.value;
      outCtx.fillRect(0, 0, outW, outH);

      for (const { label, source, dest } of mappings) {
        // Clip source to the valid scene region and map to the
        // corresponding sub-region of dest so out-of-bounds areas
        // show the background color instead of stretching.
        const cx = Math.max(0, source.x);
        const cy = Math.max(0, source.y);
        const cx2 = Math.min(sceneW, source.x + source.w);
        const cy2 = Math.min(sceneH, source.y + source.h);

        if (cx < cx2 && cy < cy2) {
          // Map clipped source edges to dest-space offsets
          const sx = dest.w / source.w;
          const sy = dest.h / source.h;
          const dx = dest.x + (cx - source.x) * sx;
          const dy = dest.y + (cy - source.y) * sy;
          const dw = (cx2 - cx) * sx;
          const dh = (cy2 - cy) * sy;

          outCtx.drawImage(
            layerCanvas,
            cx * dpr,
            cy * dpr,
            (cx2 - cx) * dpr,
            (cy2 - cy) * dpr,
            dx, dy, dw, dh,
          );
        }

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

  // ── Prevent native trackpad/touch gestures on the canvas ──

  outputCanvas.style.touchAction = "none";
  outputCanvas.style.overscrollBehavior = "none";
  const onGesture = (e) => e.preventDefault();
  outputCanvas.addEventListener("gesturestart", onGesture);
  outputCanvas.addEventListener("gesturechange", onGesture);
  outputCanvas.addEventListener("gestureend", onGesture);

  // ── Zoom modifier tracking ──
  // Track Ctrl/Meta via keydown/keyup — WheelEvent.ctrlKey is unreliable
  // because browsers synthesise it for trackpad pinch gestures.
  // Also track Shift for pan cursor feedback.

  let zoomModifierDown = false;
  const onKeyDown = (e) => {
    if (e.key === "Control" || e.key === "Meta") zoomModifierDown = true;
    if (e.key === "Shift") {
      shiftDown = true;
      updateCursor();
    }
  };
  const onKeyUp = (e) => {
    if (e.key === "Control" || e.key === "Meta") zoomModifierDown = false;
    if (e.key === "Shift") {
      shiftDown = false;
      updateCursor();
    }
  };
  const onBlur = () => {
    zoomModifierDown = false;
    shiftDown = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // ── Wheel: pan (default) or zoom (Ctrl/Meta held) ──

  const wheelPanScalar = 0.5;
  const wheelZoomScalar = 0.5;

  // Clamp a source rect so it stays within the scene bounds
  function clampSource(src) {
    if (constrainZoomCb.checked) {
      if (src.w > sceneW) src.w = sceneW;
      if (src.h > sceneH) src.h = sceneH;
    }

    if (constrainPanCb.checked) {
      if (src.w >= sceneW) {
        src.x = (sceneW - src.w) / 2;
      } else {
        if (src.x < 0) src.x = 0;
        if (src.x + src.w > sceneW) src.x = sceneW - src.w;
      }

      if (src.h >= sceneH) {
        src.y = (sceneH - src.h) / 2;
      } else {
        if (src.y < 0) src.y = 0;
        if (src.y + src.h > sceneH) src.y = sceneH - src.h;
      }
    }
  }

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

      if (zoomModifierDown) {
        // Ctrl / Meta held + wheel = zoom
        const tX = (canvasX - dst.x) / dst.w;
        const tY = (canvasY - dst.y) / dst.h;
        const sceneX = src.x + tX * src.w;
        const sceneY = src.y + tY * src.h;

        const zoomFactor = Math.pow(1.1, Math.sign(e.deltaY) * wheelZoomScalar);
        const newW = src.w * zoomFactor;
        const newH = src.h * zoomFactor;

        src.x = sceneX - tX * newW;
        src.y = sceneY - tY * newH;
        src.w = newW;
        src.h = newH;
      } else {
        // Plain wheel = pan
        const scaleX = src.w / dst.w;
        const scaleY = src.h / dst.h;
        src.x += e.deltaX * scaleX * wheelPanScalar;
        src.y += e.deltaY * scaleY * wheelPanScalar;
      }

      clampSource(src);
    },
    { passive: false },
  );

  // ── Element hit-testing via output canvas → scene mapping ──

  function canvasToScene(canvasX, canvasY) {
    const m = hitTestMapping(canvasX, canvasY);
    if (!m) return null;
    const tX = (canvasX - m.dest.x) / m.dest.w;
    const tY = (canvasY - m.dest.y) / m.dest.h;
    return { x: m.source.x + tX * m.source.w, y: m.source.y + tY * m.source.h };
  }

  function hitTestElements(sceneX, sceneY) {
    const els = [...elState.keys()];
    for (let i = els.length - 1; i >= 0; i--) {
      if (els[i].hitTest(sceneX, sceneY)) return els[i];
    }
    return null;
  }

  // ── Hover & Click interaction ──

  let hoveredEl = null;
  let justFinishedPan = false;
  let panTarget = null;  // Forward declare for updateCursor
  let shiftDown = false;  // Forward declare for updateCursor

  function updateCursor() {
    if (panTarget) {
      outputCanvas.style.cursor = "grabbing";
    } else if (hoveredEl) {
      outputCanvas.style.cursor = "pointer";
    } else if (shiftDown) {
      outputCanvas.style.cursor = "grab";
    } else {
      outputCanvas.style.cursor = "auto";
    }
  }

  function updateHover(e) {
    if (panTarget) return;
    const rect = outputCanvas.getBoundingClientRect();
    const pos = canvasToScene(e.clientX - rect.left, e.clientY - rect.top);
    const hit = pos ? hitTestElements(pos.x, pos.y) : null;
    if (hit !== hoveredEl) {
      if (hoveredEl) elState.get(hoveredEl).hovered = false;
      if (hit) elState.get(hit).hovered = true;
      hoveredEl = hit;
      updateCursor();
    }
  }

  outputCanvas.addEventListener("click", (e) => {
    if (e.button !== 0) return;
    // Suppress click events that immediately follow a pan to avoid
    // accidentally triggering interactions on elements under the pointer
    if (justFinishedPan) {
      justFinishedPan = false;
      return;
    }
    const rect = outputCanvas.getBoundingClientRect();
    const pos = canvasToScene(e.clientX - rect.left, e.clientY - rect.top);
    const hit = pos ? hitTestElements(pos.x, pos.y) : null;
    if (hit) {
      const s = elState.get(hit);
      s.c1 = randomColor();
      s.c2 = randomColor();
    }
  });

  // ── Pan (middle-click or Shift+left-click) ──

  const shouldPan = (e) => e.button === 1 || (e.button === 0 && e.shiftKey);

  let lastPanX = 0;
  let lastPanY = 0;

  outputCanvas.addEventListener("pointerdown", (e) => {
    justFinishedPan = false;
    if (shouldPan(e)) {
      const rect = outputCanvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      panTarget = hitTestMapping(canvasX, canvasY);
      if (!panTarget) return;

      lastPanX = e.clientX;
      lastPanY = e.clientY;
      updateCursor();
      outputCanvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  outputCanvas.addEventListener("pointermove", (e) => {
    if (panTarget) {
      const dx = e.clientX - lastPanX;
      const dy = e.clientY - lastPanY;

      // Convert pixel delta from dest space to source (scene) space
      const scaleX = panTarget.source.w / panTarget.dest.w;
      const scaleY = panTarget.source.h / panTarget.dest.h;

      // Drag right → reveal content to the left → sourceRect.x decreases
      panTarget.source.x -= dx * scaleX;
      panTarget.source.y -= dy * scaleY;

      clampSource(panTarget.source);

      lastPanX = e.clientX;
      lastPanY = e.clientY;
    }
    updateHover(e);
    updateCursor();
  });

  outputCanvas.addEventListener("pointerup", (e) => {
    if (panTarget) {
      panTarget = null;
      outputCanvas.releasePointerCapture(e.pointerId);
      // Mark that we just finished a pan so the following click event
      // (if any) will be suppressed to avoid accidental interactions
      justFinishedPan = true;
      updateCursor();
    } else {
      updateHover(e);
    }
  });

  outputCanvas.addEventListener("pointerleave", () => {
    if (hoveredEl) {
      elState.get(hoveredEl).hovered = false;
      hoveredEl = null;
    }
    updateCursor();
  });

  // Prevent context menu on middle-click
  outputCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ── Start ──

  scene.ticker.start();

  // ── Cleanup ──

  window.addEventListener("beforeunload", () => {
    scene.destroy();
    hiddenContainer.remove();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  });
}
