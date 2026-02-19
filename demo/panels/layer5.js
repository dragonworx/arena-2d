export default async function(CanvasUI) {
const { Ticker, Element } = CanvasUI;

  // ── Canvas setup ──

  const canvas = document.getElementById("layer5-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // ── Stats elements ──

  const statFps = document.getElementById("stat-fps");
  const statChildFps = document.getElementById("stat-child-fps");
  const statElapsed = document.getElementById("stat-elapsed");
  const statFrames = document.getElementById("stat-frames");

  // ── Control elements ──

  const ctrlFps = document.getElementById("ctrl-fps");
  const ctrlFpsVal = document.getElementById("ctrl-fps-val");
  const ctrlSpeed = document.getElementById("ctrl-speed");
  const ctrlSpeedVal = document.getElementById("ctrl-speed-val");
  const ctrlDirection = document.getElementById("ctrl-direction");
  const ctrlDirectionVal = document.getElementById("ctrl-direction-val");
  const ctrlGravity = document.getElementById("ctrl-gravity");
  const ctrlGravityVal = document.getElementById("ctrl-gravity-val");
  const ctrlChildFps = document.getElementById("ctrl-child-fps");
  const ctrlChildFpsVal = document.getElementById("ctrl-child-fps-val");
  const ctrlOrbitSpeed = document.getElementById("ctrl-orbit-speed");
  const ctrlOrbitSpeedVal = document.getElementById("ctrl-orbit-speed-val");
  const ctrlOrbitRadius = document.getElementById("ctrl-orbit-radius");
  const ctrlOrbitRadiusVal = document.getElementById("ctrl-orbit-radius-val");

  // ── Physics state ──

  let speed = 400;
  let direction = 270;
  let gravity = 600;
  let frameCount = 0;

  const ball = {
    x: W / 2,
    y: H / 3,
    vx: 0,
    vy: 0,
    radius: 14,
  };

  function updateBallVelocity() {
    const rad = (direction * Math.PI) / 180;
    ball.vx = Math.cos(rad) * speed;
    ball.vy = Math.sin(rad) * speed;
  }
  updateBallVelocity();

  // ── Child (moon) state ──

  let orbitAngle = 0; // radians, updated by child ticker
  let orbitSpeed = 3; // radians per second
  let orbitRadius = 30;
  const moonRadius = 5;

  // FPS counters (smoothed)
  let parentFpsAccum = 0;
  let parentFpsSamples = 0;
  let parentFpsDisplay = 0;

  let childFpsAccum = 0;
  let childFpsSamples = 0;
  let childFpsDisplay = 0;

  // ── Trail effect ──
  const trail = [];
  const MAX_TRAIL = 20;

  // ═══════════════════════════════════════════
  //  PARENT TICKER — drives the bouncing ball
  // ═══════════════════════════════════════════

  const parentTicker = new Ticker();

  const simElement = new Element("ball-sim");
  simElement.update = (dt) => {
    frameCount++;

    // Parent FPS calculation
    parentFpsAccum += dt;
    parentFpsSamples++;
    if (parentFpsAccum >= 0.5) {
      parentFpsDisplay = Math.round(parentFpsSamples / parentFpsAccum);
      parentFpsAccum = 0;
      parentFpsSamples = 0;
    }

    // Physics: gravity
    ball.vy += gravity * dt;

    // Move
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Bounce off walls
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx) * 0.9;
    } else if (ball.x + ball.radius >= W) {
      ball.x = W - ball.radius;
      ball.vx = -Math.abs(ball.vx) * 0.9;
    }

    // Bounce off floor / ceiling
    if (ball.y + ball.radius >= H) {
      ball.y = H - ball.radius;
      ball.vy = -Math.abs(ball.vy) * 0.85;
      if (Math.abs(ball.vy) < 20) ball.vy = 0;
      ball.vx *= 0.99;
    } else if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy) * 0.9;
    }

    // Trail
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > MAX_TRAIL) trail.shift();

    // Render everything (parent drives the draw loop)
    render();

    // Update stats
    statFps.textContent = parentFpsDisplay;
    statChildFps.textContent = childFpsDisplay;
    statElapsed.textContent = `${parentTicker.elapsedTime.toFixed(1)}s`;
    statFrames.textContent = frameCount;

    // Color parent FPS
    if (parentFpsDisplay >= 50) {
      statFps.style.color = "#7cf58e";
    } else if (parentFpsDisplay >= 25) {
      statFps.style.color = "#f5c77c";
    } else {
      statFps.style.color = "#f57c7c";
    }
  };

  parentTicker.add(simElement);

  // ═══════════════════════════════════════════
  //  CHILD TICKER — drives the orbiting moon
  // ═══════════════════════════════════════════

  const childTicker = new Ticker();

  const moonElement = new Element("moon-orbit");
  moonElement.update = (dt) => {
    // Advance orbit angle
    orbitAngle += orbitSpeed * dt;

    // Child FPS calculation
    childFpsAccum += dt;
    childFpsSamples++;
    if (childFpsAccum >= 0.5) {
      childFpsDisplay = Math.round(childFpsSamples / childFpsAccum);
      childFpsAccum = 0;
      childFpsSamples = 0;
    }
  };

  childTicker.add(moonElement);

  // ── Rendering ──

  function render() {
    // Semi-transparent clear for motion blur
    ctx.fillStyle = "rgba(18, 18, 30, 0.3)";
    ctx.fillRect(0, 0, W, H);

    // Draw trail
    for (let i = 0; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.4;
      const r = ball.radius * (0.3 + (i / trail.length) * 0.7);
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(124, 124, 245, ${alpha})`;
      ctx.fill();
    }

    // Draw ball with glow
    ctx.shadowColor = "#7c7cf5";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      ball.x - 3,
      ball.y - 3,
      2,
      ball.x,
      ball.y,
      ball.radius,
    );
    grad.addColorStop(0, "#b8b8ff");
    grad.addColorStop(0.5, "#7c7cf5");
    grad.addColorStop(1, "#4a4ae8");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── Draw orbit ring (faint) ──
    ctx.strokeStyle = "rgba(245, 166, 35, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();

    // ── Draw moon (child) ──
    const moonX = ball.x + Math.cos(orbitAngle) * orbitRadius;
    const moonY = ball.y + Math.sin(orbitAngle) * orbitRadius;

    ctx.shadowColor = "#f5a623";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    const moonGrad = ctx.createRadialGradient(
      moonX - 1,
      moonY - 1,
      1,
      moonX,
      moonY,
      moonRadius,
    );
    moonGrad.addColorStop(0, "#ffd699");
    moonGrad.addColorStop(0.5, "#f5a623");
    moonGrad.addColorStop(1, "#c77d1a");
    ctx.fillStyle = moonGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw connecting line ball → moon
    ctx.strokeStyle = "rgba(245, 166, 35, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(moonX, moonY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw velocity vector
    ctx.strokeStyle = "rgba(245, 199, 124, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + ball.vx * 0.1, ball.y + ball.vy * 0.1);
    ctx.stroke();

    // Draw floor line
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 1);
    ctx.lineTo(W, H - 1);
    ctx.stroke();
  }

  // ── Parent control handlers ──

  ctrlFps.addEventListener("input", () => {
    const v = Number(ctrlFps.value);
    parentTicker.globalFPS = v;
    ctrlFpsVal.textContent = v === 0 ? "⏸" : v;
  });

  ctrlSpeed.addEventListener("input", () => {
    speed = Number(ctrlSpeed.value);
    ctrlSpeedVal.textContent = speed;
    updateBallVelocity();
  });

  ctrlDirection.addEventListener("input", () => {
    direction = Number(ctrlDirection.value);
    ctrlDirectionVal.textContent = `${direction}°`;
    updateBallVelocity();
  });

  ctrlGravity.addEventListener("input", () => {
    gravity = Number(ctrlGravity.value);
    ctrlGravityVal.textContent = gravity;
  });

  // ── Child control handlers ──

  ctrlChildFps.addEventListener("input", () => {
    const v = Number(ctrlChildFps.value);
    childTicker.globalFPS = v;
    ctrlChildFpsVal.textContent = v;
  });

  ctrlOrbitSpeed.addEventListener("input", () => {
    orbitSpeed = Number(ctrlOrbitSpeed.value);
    ctrlOrbitSpeedVal.textContent = `${orbitSpeed}×`;
  });

  ctrlOrbitRadius.addEventListener("input", () => {
    orbitRadius = Number(ctrlOrbitRadius.value);
    ctrlOrbitRadiusVal.textContent = orbitRadius;
  });

  // ── Button handlers ──

  document.getElementById("btn-start").addEventListener("click", () => {
    parentTicker.start();
    childTicker.start();
  });

  document.getElementById("btn-stop").addEventListener("click", () => {
    parentTicker.stop();
    childTicker.stop();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    parentTicker.stop();
    childTicker.stop();
    ball.x = W / 2;
    ball.y = H / 3;
    updateBallVelocity();
    orbitAngle = 0;
    frameCount = 0;
    parentFpsAccum = 0;
    parentFpsSamples = 0;
    parentFpsDisplay = 0;
    childFpsAccum = 0;
    childFpsSamples = 0;
    childFpsDisplay = 0;
    trail.length = 0;

    ctx.fillStyle = "#12121e";
    ctx.fillRect(0, 0, W, H);

    statFps.textContent = "0";
    statChildFps.textContent = "0";
    statElapsed.textContent = "0.0s";
    statFrames.textContent = "0";

    parentTicker.start();
    childTicker.start();
  });

  // ── Auto-start both tickers ──
  parentTicker.start();
  childTicker.start();
}