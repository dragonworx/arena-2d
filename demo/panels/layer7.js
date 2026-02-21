export default async function (Arena2D) {
  const { Scene, View, Container, Element } = Arena2D;

  // ── Controls ──

  const speedSlider = document.getElementById("ctrl-speed");
  const speedVal = document.getElementById("speed-val");
  const zoomSlider = document.getElementById("ctrl-zoom");
  const zoomVal = document.getElementById("zoom-val");
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

  // ── Custom element classes ──

  class Box extends Element {
    constructor(color1, color2) {
      super();
      this.color1 = color1;
      this.color2 = color2;
      this.width = 60;
      this.height = 60;
    }

    paint(ctx) {
      const gradient = ctx.createLinearGradient(0, 0, this.width, this.height, [
        { offset: 0, color: this.color1 },
        { offset: 1, color: this.color2 },
      ]);
      ctx.drawRect(0, 0, this.width, this.height, gradient);
    }
  }

  class Circle extends Element {
    constructor(radius, color1, color2) {
      super();
      this.radius = radius;
      this.color1 = color1;
      this.color2 = color2;
      this.width = radius * 2;
      this.height = radius * 2;
    }

    paint(ctx) {
      const gradient = ctx.createRadialGradient(
        this.radius,
        this.radius,
        this.radius,
        [
          { offset: 0, color: this.color1 },
          { offset: 1, color: this.color2 },
        ],
      );
      ctx.drawCircle(this.radius, this.radius, this.radius, gradient);
    }
  }

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
  const box1 = new Box("#ffffff", "#4299e1");
  box1.x = 30;
  box1.y = 30;
  root.addChild(box1);

  const box2 = new Box("#ffffff", "#667eea");
  box2.x = 250;
  box2.y = 40;
  root.addChild(box2);

  const box3 = new Box("#ffffff", "#ed64a6");
  box3.x = 40;
  box3.y = 190;
  root.addChild(box3);

  const box4 = new Box("#ffffff", "#38b2ac");
  box4.x = 280;
  box4.y = 200;
  root.addChild(box4);

  const circle1 = new Circle(25, "#ffffff", "#f56565");
  circle1.x = 150;
  circle1.y = 20;
  root.addChild(circle1);

  const circle2 = new Circle(30, "#ffffff", "#9f7aea");
  circle2.x = 160;
  circle2.y = 180;
  root.addChild(circle2);

  // ── Animated elements ──

  let speedMultiplier = 1.0;

  // Bouncing box
  const animBox = new Box("#ffffff", "#f56565");
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
  const animCircle = new Circle(20, "#ffffff", "#48bb78");
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
  const animCircle2 = new Circle(15, "#ffffff", "#ecc94b");
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
  // The 4 quadrants of the scene:
  //   Q1 (TL): (0, 0, W/2, H/2)        → top-left of output
  //   Q2 (TR): (W/2, 0, W/2, H/2)      → top-right of output
  //   Q3 (BL): (0, H/2, W/2, H/2)      → bottom-left of output
  //   Q4 (BR): (W/2, H/2, W/2, H/2)    → bottom-right of output

  let currentZoom = 2.0;

  function getQuadMappings() {
    const halfW = sceneW / 2;
    const halfH = sceneH / 2;
    const destW = (outW - gap) / 2;
    const destH = (outH - gap) / 2;

    return [
      {
        label: "Q1",
        source: { x: 0, y: 0, w: halfW, h: halfH },
        dest: { x: 0, y: 0, w: destW, h: destH },
      },
      {
        label: "Q2",
        source: { x: halfW, y: 0, w: halfW, h: halfH },
        dest: { x: destW + gap, y: 0, w: destW, h: destH },
      },
      {
        label: "Q3",
        source: { x: 0, y: halfH, w: halfW, h: halfH },
        dest: { x: 0, y: destH + gap, w: destW, h: destH },
      },
      {
        label: "Q4",
        source: { x: halfW, y: halfH, w: halfW, h: halfH },
        dest: { x: destW + gap, y: destH + gap, w: destW, h: destH },
      },
    ];
  }

  // ── Compositing: read from scene's layer canvas, draw to output ──

  // Get the default layer's canvas (the one the View renders to)
  const defaultLayer = view.getLayer("default");
  const layerCanvas = defaultLayer.canvas;

  // The DPR the layer was rendered at
  const dpr = view.dpr;

  scene.ticker.add({
    id: "quad-compositor",
    update: () => {
      // The View has already rendered the scene to its layer canvas.
      // Now composite the 4 quadrants to the output canvas.
      outCtx.clearRect(0, 0, outW, outH);

      // Draw grid background
      outCtx.fillStyle = "#222";
      outCtx.fillRect(0, 0, outW, outH);

      const mappings = getQuadMappings();

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

        // Draw label
        outCtx.fillStyle = "rgba(255,255,255,0.6)";
        outCtx.font = "11px sans-serif";
        outCtx.fillText(label, dest.x + 6, dest.y + 16);
      }

      // Draw crosshair lines
      const destW = (outW - gap) / 2;
      const destH = (outH - gap) / 2;
      outCtx.fillStyle = "#444";
      outCtx.fillRect(destW, 0, gap, outH);
      outCtx.fillRect(0, destH, outW, gap);
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

  zoomSlider.addEventListener("input", (e) => {
    currentZoom = Number.parseFloat(e.target.value);
    zoomVal.textContent = currentZoom.toFixed(1);
    view.zoom = currentZoom;
  });

  // ── Start ──

  scene.ticker.start();

  // ── Cleanup ──

  window.addEventListener("beforeunload", () => {
    scene.destroy();
    hiddenContainer.remove();
  });
}
