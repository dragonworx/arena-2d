export default async function (CanvasUI) {
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
  const scene = new Scene(sceneContainer, 400, 300);

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
    constructor(color1, color2) {
      super();
      this.color1 = color1;
      this.color2 = color2;
      this.width = 60;
      this.height = 60;
    }

    paint(ctx) {
      // Create diagonal gradient
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
      // Set element dimensions to contain the circle
      this.width = radius * 2;
      this.height = radius * 2;
    }

    paint(ctx) {
      // Create radial gradient from center
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

  // Add background gradient (black to white)
  class GradientBackground extends Element {
    constructor(width, height) {
      super();
      this.width = width;
      this.height = height;
    }

    paint(ctx) {
      const gradient = ctx.createLinearGradient(0, 0, this.width, this.height, [
        { offset: 0, color: "#000000" },
        { offset: 1, color: "#ffffff" },
      ]);
      ctx.drawRect(0, 0, this.width, this.height, gradient);
    }
  }

  const bgContainer = new Container();
  bgContainer.layer = backgroundLayer;
  scene.root.addChild(bgContainer);

  // Add gradient background
  const gradientBg = new GradientBackground(400, 300);
  gradientBg.x = 0;
  gradientBg.y = 0;
  bgContainer.addChild(gradientBg);

  const box1 = new Box("#ffffff", "#4299e1");
  box1.x = 20;
  box1.y = 20;
  bgContainer.addChild(box1);

  const box2 = new Box("#ffffff", "#667eea");
  box2.x = 100;
  box2.y = 80;
  bgContainer.addChild(box2);

  const box3 = new Box("#ffffff", "#ed64a6");
  box3.x = 180;
  box3.y = 140;
  bgContainer.addChild(box3);

  const circle1 = new Circle(35, "#ffffff", "#f56565");
  circle1.x = 280;
  circle1.y = 30;
  bgContainer.addChild(circle1);

  const circle2 = new Circle(30, "#ffffff", "#9f7aea");
  circle2.x = 310;
  circle2.y = 200;
  bgContainer.addChild(circle2);

  // ── Create Foreground Elements (animated) with gradients (white center to strong color) ──

  const fgContainer = new Container();
  fgContainer.layer = foregroundLayer;
  scene.root.addChild(fgContainer);

  // Animated bouncing box (70% of 180 = 126)
  const animatedBox = new Box("#ffffff", "#f56565");
  animatedBox.width = 126;
  animatedBox.height = 126;
  animatedBox.x = 50;
  animatedBox.y = 50;
  let boxVx = 120;
  let boxVy = 80;
  let boxRotation = 0;
  fgContainer.addChild(animatedBox);

  // Animated rotating circle
  const animatedCircle = new Circle(25, "#ffffff", "#48bb78");
  animatedCircle.x = 200;
  animatedCircle.y = 150;
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

    // Apply speed multiplier to all animations
    const adjustedDt = dt * speedMultiplier;

    // Constant velocity movement (no gravity)
    animatedBox.x += boxVx * adjustedDt;
    animatedBox.y += boxVy * adjustedDt;

    // Rotate while moving (1 full rotations per second)
    boxRotation += Math.PI * 0.5 * adjustedDt;
    animatedBox.rotation = boxRotation;

    // Bounce off left and right walls
    if (animatedBox.x <= 0) {
      boxVx = Math.abs(boxVx) * 0.95; // Bounce right with slight energy loss
      animatedBox.x = 0;
    } else if (animatedBox.x + animatedBox.width >= 400) {
      boxVx = -Math.abs(boxVx) * 0.95; // Bounce left with slight energy loss
      animatedBox.x = 400 - animatedBox.width;
    }

    // Bounce off top and bottom walls
    if (animatedBox.y <= 0) {
      boxVy = Math.abs(boxVy) * 0.95; // Bounce down with slight energy loss
      animatedBox.y = 0;
    } else if (animatedBox.y + animatedBox.height >= 300) {
      boxVy = -Math.abs(boxVy) * 0.95; // Bounce up with slight energy loss
      animatedBox.y = 300 - animatedBox.height;
    }
  };

  // Rotating circle
  const originalCircleUpdate = animatedCircle.update.bind(animatedCircle);
  animatedCircle.update = (dt) => {
    originalCircleUpdate(dt);

    // Apply speed multiplier
    const adjustedDt = dt * speedMultiplier;

    // Orbit around center (one revolution per second)
    angle += Math.PI * 2 * adjustedDt;
    const centerX = 200;
    const centerY = 150;
    const radius = 80;

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
}
