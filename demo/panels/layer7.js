/**
 * Layer 7 — Scene & Layering System Demo
 *
 * Demonstrates:
 * - Scene creation with multiple layers
 * - Layer ordering and opacity
 * - Frame pipeline (Ticker → Update → Render)
 * - Element rendering via the Scene
 */

import("../../dist/canvasui.js").then(async (CanvasUI) => {
  // Load panel HTML
  const response = await fetch("panels/layer7.html");
  document.getElementById("layer-7").innerHTML = await response.text();

  const { Scene, Container, Element } = CanvasUI;

  // ── Control elements ──

  const bgOpacitySlider = document.getElementById("ctrl-bg-opacity");
  const bgOpacityVal = document.getElementById("bg-opacity-val");
  const bgBlendSelect = document.getElementById("ctrl-bg-blend");
  const fgOpacitySlider = document.getElementById("ctrl-fg-opacity");
  const fgOpacityVal = document.getElementById("fg-opacity-val");
  const fgBlendSelect = document.getElementById("ctrl-fg-blend");
  const speedSlider = document.getElementById("ctrl-speed");
  const speedVal = document.getElementById("speed-val");

  // ── Stats elements ──

  const statSize = document.getElementById("stat-size");
  const statDpr = document.getElementById("stat-dpr");
  const statLayers = document.getElementById("stat-layers");
  const statFps = document.getElementById("stat-fps");

  // ── Create Scene ──

  const sceneContainer = document.getElementById("layer7-container");
  const scene = new Scene(sceneContainer, 800, 600);

  // Update stats
  statDpr.textContent = scene.dpr.toFixed(2);
  statSize.textContent = `${scene.width}×${scene.height}`;

  // ── Create Layers ──

  // Background layer (z-index: 1)
  const backgroundLayer = scene.createLayer("background", 1);

  // Foreground layer (z-index: 2)
  const foregroundLayer = scene.createLayer("foreground", 2);

  // ── Create Background Elements (static) ──

  // Custom element class with paint method
  class Box extends Element {
    constructor(color) {
      super();
      this.color = color;
      this.width = 100;
      this.height = 100;
    }

    paint(ctx) {
      ctx.drawRect(0, 0, this.width, this.height, this.color);
    }
  }

  class Circle extends Element {
    constructor(radius, color) {
      super();
      this.radius = radius;
      this.color = color;
      // Set element dimensions to contain the circle
      this.width = radius * 2;
      this.height = radius * 2;
    }

    paint(ctx) {
      // Draw circle at its center (radius, radius) within the element's bounds
      ctx.drawCircle(this.radius, this.radius, this.radius, this.color);
    }
  }

  // Add static background elements
  const bgContainer = new Container();
  bgContainer.layer = backgroundLayer;
  scene.root.addChild(bgContainer);

  const box1 = new Box("#4a5568");
  box1.x = 50;
  box1.y = 50;
  bgContainer.addChild(box1);

  const box2 = new Box("#2d3748");
  box2.x = 200;
  box2.y = 150;
  bgContainer.addChild(box2);

  const box3 = new Box("#1a202c");
  box3.x = 350;
  box3.y = 250;
  bgContainer.addChild(box3);

  const circle1 = new Circle(50, "#667eea");
  circle1.x = 600;
  circle1.y = 100;
  bgContainer.addChild(circle1);

  const circle2 = new Circle(40, "#764ba2");
  circle2.x = 650;
  circle2.y = 400;
  bgContainer.addChild(circle2);

  // ── Create Foreground Elements (animated) ──

  const fgContainer = new Container();
  fgContainer.layer = foregroundLayer;
  scene.root.addChild(fgContainer);

  // Animated bouncing box
  const animatedBox = new Box("#f56565");
  animatedBox.x = 100;
  animatedBox.y = 300;
  let boxVx = 150;
  let boxVy = -100;
  fgContainer.addChild(animatedBox);

  // Animated rotating circle
  const animatedCircle = new Circle(30, "#48bb78");
  animatedCircle.x = 400;
  animatedCircle.y = 300;
  let angle = 0;
  fgContainer.addChild(animatedCircle);

  // ── Animation Logic ──

  const lastTime = performance.now();
  const frameCount = 0;
  const fpsUpdateTime = 0;
  let speedMultiplier = 1.0;

  // Override update to add animation logic
  const originalUpdate = animatedBox.update.bind(animatedBox);
  animatedBox.update = (dt) => {
    originalUpdate(dt);

    // Apply speed multiplier
    const adjustedDt = dt * speedMultiplier;

    // Bounce physics
    boxVx += 0; // No horizontal acceleration
    boxVy += 300 * adjustedDt; // Gravity

    animatedBox.x += boxVx * adjustedDt;
    animatedBox.y += boxVy * adjustedDt;

    // Bounce off walls
    if (animatedBox.x <= 0 || animatedBox.x + animatedBox.width >= 800) {
      boxVx *= -0.8; // Energy loss
      animatedBox.x = Math.max(
        0,
        Math.min(800 - animatedBox.width, animatedBox.x),
      );
    }

    // Bounce off floor
    if (animatedBox.y + animatedBox.height >= 600) {
      boxVy *= -0.8; // Energy loss
      animatedBox.y = 600 - animatedBox.height;
    }

    // Clamp y to prevent falling through floor
    if (animatedBox.y < 0) {
      animatedBox.y = 0;
      boxVy *= -0.8;
    }
  };

  // Rotating circle
  const originalCircleUpdate = animatedCircle.update.bind(animatedCircle);
  animatedCircle.update = (dt) => {
    originalCircleUpdate(dt);

    // Apply speed multiplier
    const adjustedDt = dt * speedMultiplier;

    // Orbit around center
    angle += Math.PI * adjustedDt * speedMultiplier;
    const centerX = 400;
    const centerY = 300;
    const radius = 150;

    animatedCircle.x = centerX + Math.cos(angle) * radius;
    animatedCircle.y = centerY + Math.sin(angle) * radius;
  };

  // ── FPS Counter ──

  let lastFpsUpdate = performance.now();
  let frames = 0;

  scene.ticker.add({
    id: "fps-counter",
    update: (dt) => {
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

  bgOpacitySlider.addEventListener("input", (e) => {
    const opacity = Number.parseFloat(e.target.value);
    backgroundLayer.opacity = opacity;
    bgOpacityVal.textContent = opacity.toFixed(1);
  });

  bgBlendSelect.addEventListener("change", (e) => {
    backgroundLayer.blendMode = e.target.value;
  });

  fgOpacitySlider.addEventListener("input", (e) => {
    const opacity = Number.parseFloat(e.target.value);
    foregroundLayer.opacity = opacity;
    fgOpacityVal.textContent = opacity.toFixed(1);
  });

  fgBlendSelect.addEventListener("change", (e) => {
    foregroundLayer.blendMode = e.target.value;
  });

  speedSlider.addEventListener("input", (e) => {
    speedMultiplier = Number.parseFloat(e.target.value);
    speedVal.textContent = `${speedMultiplier.toFixed(1)}x`;
  });

  // ── Start Animation ──

  scene.ticker.start();

  // ── Cleanup on navigation ──

  window.addEventListener("beforeunload", () => {
    scene.destroy();
  });
});
