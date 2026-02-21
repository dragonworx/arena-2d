export default async function (Arena2D) {
  const { Scene, View, Easing, Tween, Element, Ticker } = Arena2D;

  // ── Setup ──
  const container = document.getElementById("l51-canvas").parentElement;
  const scene = new Scene(600, 440);
  const view = new View(document.getElementById("l51-canvas"), scene);
  view.resize(600, 440);
  scene.ticker.start();

  // ── Easing dropdown ──
  const easingSelect = document.getElementById("l51-easing");
  const easingNames = Object.keys(Easing);
  for (const name of easingNames) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if (name === "easeOutCubic") opt.selected = true;
    easingSelect.appendChild(opt);
  }

  // ── Controls refs ──
  const durationSlider = document.getElementById("l51-duration");
  const durationVal = document.getElementById("l51-duration-val");
  const repeatSlider = document.getElementById("l51-repeat");
  const repeatVal = document.getElementById("l51-repeat-val");
  const yoyoCheck = document.getElementById("l51-yoyo");
  const stateEl = document.getElementById("l51-state");
  const progressEl = document.getElementById("l51-progress");

  durationSlider.oninput = () => {
    durationVal.textContent = `${durationSlider.value}s`;
  };
  repeatSlider.oninput = () => {
    repeatVal.textContent = repeatSlider.value;
  };

  // ── Section 1: Easing Curve Visualizer (top-left area) ──
  const CURVE_X = 30;
  const CURVE_Y = 20;
  const CURVE_W = 160;
  const CURVE_H = 120;
  const easingDot = { t: 0 };

  // ── Section 2: Element Animation (top-right area) ──
  // Use a real Element and animate it directly for smoothness
  const animRect = new Element("anim-rect");
  animRect.width = 40;
  animRect.height = 40;
  animRect.pivotX = 20;
  animRect.pivotY = 20;
  animRect.x = 240;
  animRect.y = 60;
  scene.root.addChild(animRect);

  // ── Section 3: Color Interpolation (middle area) ──
  const colorTarget = { color: "#ff3366" };

  // ── Section 4: Text Ticker (bottom-left) ──
  const textTarget = { revealCount: 0 };
  const REVEAL_TEXT = "Arena-2D Tween System";

  // ── Section 5: Image Reveal (bottom-right) ──
  const revealTarget = { progress: 0 };
  // We'll simulate an image via tiles

  // ── Section 6: Nested Ticker (Floating Circle) ──
  const nestedTicker = new Ticker();
  nestedTicker.globalFPS = 60;
  const nestedTarget = { x: 400, y: 240, scale: 1 };

  const nestedTween = new Tween({
    target: nestedTarget,
    properties: {
      x: [{ toValue: 560, duration: 1.5 }, { toValue: 400, duration: 1.5 }],
      scale: [{ toValue: 1.5, duration: 1.5 }, { toValue: 1, duration: 1.5 }],
    },
    ticker: nestedTicker,
    repeat: Infinity,
    yoyo: true,
    easing: "easeInOutQuad",
  });

  const nestedPlayBtn = document.getElementById("l51-nested-play");
  const nestedFpsSlider = document.getElementById("l51-nested-fps");
  const nestedFpsVal = document.getElementById("l51-nested-fps-val");

  nestedPlayBtn.onclick = () => {
    if (nestedTicker.running) {
      nestedTicker.stop();
    } else {
      nestedTicker.start();
    }
  };
  nestedFpsSlider.oninput = () => {
    const fps = parseInt(nestedFpsSlider.value);
    nestedTicker.globalFPS = fps;
    nestedFpsVal.textContent = fps;
  };

  // ── Active tweens ──
  let mainTween = null;

  function createMainTween() {
    if (mainTween) {
      mainTween.destroy();
    }

    const dur = Number.parseFloat(durationSlider.value);
    const rep = Number.parseInt(repeatSlider.value, 10);
    const yoyo = yoyoCheck.checked;
    const easing = easingSelect.value;

    // Reset targets
    easingDot.t = 0;
    animRect.x = 240;
    animRect.y = 60;
    animRect.rotation = 0;
    animRect.scaleX = 1;
    animRect.alpha = 1;
    colorTarget.color = "#ff3366";
    textTarget.revealCount = 0;
    revealTarget.progress = 0;

    // Control main dot for curve
    mainTween = new Tween({
      target: easingDot,
      properties: {
        t: [{ toValue: 1, duration: dur }],
      },
      ticker: scene.ticker,
      repeat: rep,
      yoyo: yoyo,
      easing: easing,
      autoStart: false,
    });

    // Element animation using KEYFRAMES directly on the Element
    const elemTween = new Tween({
      target: animRect,
      properties: {
        x: [
          { toValue: 520, duration: dur * 0.4, easing: "easeOutBack" },
          { toValue: 380, duration: dur * 0.3, easing: "easeInOutCubic" },
          { toValue: 520, duration: dur * 0.3, easing: "easeInQuad" },
        ],
        y: [
          { toValue: 120, duration: dur * 0.5, easing: "easeOutBounce" },
          { toValue: 60, duration: dur * 0.5, easing: "easeInSine" },
        ],
        rotation: [{ toValue: Math.PI * 2, duration: dur }],
        scaleX: [
          { toValue: 1.5, duration: dur * 0.5 },
          { toValue: 1, duration: dur * 0.5 },
        ],
        alpha: [
          { toValue: 0.2, duration: dur * 0.5 },
          { toValue: 1, duration: dur * 0.5 },
        ],
      },
      ticker: scene.ticker,
      repeat: rep,
      yoyo: yoyo,
      easing: easing,
      autoStart: false,
    });

    // Color tween
    const colorTween = new Tween({
      target: colorTarget,
      properties: {
        color: [
          { toValue: "#33ff66", duration: dur * 0.33 },
          { toValue: "#3366ff", duration: dur * 0.33 },
          { toValue: "#ff3366", duration: dur * 0.34 },
        ],
      },
      ticker: scene.ticker,
      repeat: rep,
      yoyo: yoyo,
      easing: easing,
      autoStart: false,
    });

    // Text reveal tween - Improved character count reveal
    const textTween = new Tween({
      target: textTarget,
      properties: {
        revealCount: [{ toValue: REVEAL_TEXT.length, duration: dur }],
      },
      ticker: scene.ticker,
      repeat: rep,
      yoyo: yoyo,
      easing: "linear", // Texts meistens linear revealen
      autoStart: false,
    });

    // Image reveal tween (Tile reveal)
    const imgTween = new Tween({
      target: revealTarget,
      properties: {
        progress: [{ toValue: 1, duration: dur }],
      },
      ticker: scene.ticker,
      repeat: rep,
      yoyo: yoyo,
      easing: easing,
      autoStart: false,
    });

    // Store sub-tweens for coordinated control
    mainTween._subTweens = [elemTween, colorTween, textTween, imgTween];

    mainTween.on("update", () => {
      stateEl.textContent = mainTween.state;
      progressEl.textContent = `${Math.round(mainTween.progress * 100)}%`;
    });
    mainTween.on("complete", () => {
      stateEl.textContent = "completed";
      progressEl.textContent = "100%";
    });

    return mainTween;
  }

  function startAll() {
    const tw = createMainTween();
    tw.start();
    for (const sub of tw._subTweens) sub.start();
  }

  function pauseAll() {
    if (!mainTween) return;
    mainTween.pause();
    for (const sub of mainTween._subTweens) sub.pause();
  }

  function stopAll() {
    if (!mainTween) return;
    mainTween.stop();
    for (const sub of mainTween._subTweens) sub.stop();
    stateEl.textContent = "idle";
    progressEl.textContent = "0%";
  }

  function reverseAll() {
    if (!mainTween) return;
    mainTween.reverse();
    for (const sub of mainTween._subTweens) sub.reverse();
  }

  function restartAll() {
    if (!mainTween) return;
    mainTween.restart();
    for (const sub of mainTween._subTweens) sub.restart();
  }

  // ── Playback buttons ──
  document.getElementById("l51-play").onclick = startAll;
  document.getElementById("l51-pause").onclick = pauseAll;
  document.getElementById("l51-stop").onclick = stopAll;
  document.getElementById("l51-reverse").onclick = reverseAll;
  document.getElementById("l51-restart").onclick = restartAll;

  // ── Chain Demo ──
  let chainActive = false;
  let chainMessage = "";

  document.getElementById("l51-chain").onclick = () => {
    if (chainActive) return;
    chainActive = true;

    const chainTargets = [
      { x: 30, y: 380, color: "#ff3366" },
      { x: 190, y: 380, color: "#33ff66" },
      { x: 350, y: 380, color: "#3366ff" },
    ];
    chainState.targets = chainTargets;

    chainMessage = "Target 1: Easing out...";
    const t1 = new Tween({
      target: chainTargets[0],
      properties: { y: [{ toValue: 340, duration: 0.5, easing: "easeOutBack" }] },
      ticker: scene.ticker,
      autoStart: false,
    });

    const t2 = new Tween({
      target: chainTargets[1],
      properties: { y: [{ toValue: 340, duration: 0.5, easing: "easeOutBack" }] },
      ticker: scene.ticker,
      autoStart: false,
    });

    const t3 = new Tween({
      target: chainTargets[2],
      properties: { y: [{ toValue: 340, duration: 0.5, easing: "easeOutBack" }] },
      ticker: scene.ticker,
      autoStart: false,
    });

    t1.on("complete", () => { chainMessage = "Target 2: Jumping in..."; });
    t2.on("complete", () => { chainMessage = "Target 3: Almost there..."; });
    t3.on("complete", () => {
      chainMessage = "Sequence Complete! Returning...";
      setTimeout(() => {
        new Tween({
          target: chainTargets[0],
          properties: { y: [{ toValue: 380, duration: 0.3 }] },
          ticker: scene.ticker,
        });
        new Tween({
          target: chainTargets[1],
          properties: { y: [{ toValue: 380, duration: 0.3 }] },
          ticker: scene.ticker,
        });
        new Tween({
          target: chainTargets[2],
          properties: { y: [{ toValue: 380, duration: 0.3 }] },
          ticker: scene.ticker,
        }).on("complete", () => {
          chainActive = false;
          chainMessage = "";
        });
      }, 1000);
    });

    t1.chain(t2);
    t2.chain(t3);
    t1.start();
  };

  const chainState = {
    targets: [
      { x: 30, y: 380, color: "#ff3366" },
      { x: 190, y: 380, color: "#33ff66" },
      { x: 350, y: 380, color: "#3366ff" },
    ],
  };

  // ── Rendering ──
  const canvas = document.getElementById("l51-canvas");
  const ctx = canvas.getContext("2d");

  function drawEasingCurve() {
    const easingName = easingSelect.value;
    const easingFn = Easing[easingName] || Easing.linear;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(CURVE_X - 5, CURVE_Y - 5, CURVE_W + 10, CURVE_H + 30);

    // Grid
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(CURVE_X, CURVE_Y);
    ctx.lineTo(CURVE_X, CURVE_Y + CURVE_H);
    ctx.lineTo(CURVE_X + CURVE_W, CURVE_Y + CURVE_H);
    ctx.stroke();

    // Curve
    ctx.strokeStyle = "#7cf58e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= CURVE_W; i++) {
      const t = i / CURVE_W;
      const v = easingFn(t);
      const px = CURVE_X + i;
      const py = CURVE_Y + CURVE_H - v * CURVE_H;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Animated dot
    const dotT = easingDot.t;
    const dotV = easingFn(dotT);
    const dotX = CURVE_X + dotT * CURVE_W;
    const dotY = CURVE_Y + CURVE_H - dotV * CURVE_H;
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#7cf58e";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawAnimRect() {
    ctx.fillStyle = "#888";
    ctx.font = "10px monospace";
    ctx.fillText("Element Animation (Multi-Keyframe)", 240, 28);

    // Keyframe markers on the "timeline" area
    ctx.fillStyle = "#3366ff";
    ctx.fillRect(240, 32, 2, 8);
    ctx.fillText("Start", 244, 40);
    ctx.fillRect(352, 32, 2, 8);
    ctx.fillText("KF1", 356, 40);
    ctx.fillRect(436, 32, 2, 8);
    ctx.fillText("KF2", 440, 40);
    ctx.fillRect(520, 32, 2, 8);
    ctx.fillText("End", 524, 40);

    // Draw the animated rect
    ctx.save();
    ctx.globalAlpha = animRect.alpha;
    ctx.translate(animRect.x, animRect.y);
    ctx.rotate(animRect.rotation);
    ctx.scale(animRect.scaleX, animRect.scaleX);

    const grad = ctx.createLinearGradient(-20, -20, 20, 20);
    grad.addColorStop(0, "#f5a623");
    grad.addColorStop(1, "#ff3366");
    ctx.fillStyle = grad;
    ctx.fillRect(-20, -20, 40, 40);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(-20, -20, 40, 40);
    ctx.restore();
  }

  function drawColorInterp() {
    const cx = 30;
    const cy = 175;
    ctx.fillStyle = "#888";
    ctx.font = "10px monospace";
    ctx.fillText("Color Interpolation", cx, cy - 8);

    ctx.fillStyle = colorTarget.color;
    ctx.fillRect(cx, cy, 160, 30);
    ctx.strokeStyle = "#555";
    ctx.strokeRect(cx, cy, 160, 30);

    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(colorTarget.color, cx + 80, cy + 20);
    ctx.textAlign = "left";
  }

  function drawTextReveal() {
    const tx = 30;
    const ty = 245;
    ctx.fillStyle = "#888";
    ctx.font = "10px monospace";
    ctx.fillText("Text Reveal (Rounded Up)", tx, ty - 8);

    // Reveal count rounded UP so it finishes correctly
    const count = Math.ceil(textTarget.revealCount);
    const revealed = REVEAL_TEXT.slice(0, count);
    const hidden = REVEAL_TEXT.slice(count);

    ctx.font = "16px monospace";
    ctx.fillStyle = "#7cf58e";
    const rw = ctx.measureText(revealed).width;
    ctx.fillText(revealed, tx, ty + 14);
    ctx.fillStyle = "#333";
    ctx.fillText(hidden, tx + rw, ty + 14);
  }

  function drawImageReveal() {
    const ix = 30;
    const iy = 290;
    ctx.fillStyle = "#888";
    ctx.font = "10px monospace";
    ctx.fillText("Grid Image Reveal", ix, iy - 8);

    const rows = 4;
    const cols = 10;
    const tw = 160 / cols;
    const th = 40 / rows;
    const totalTiles = rows * cols;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const thresh = idx / totalTiles;
        const tx = ix + c * tw;
        const ty = iy + r * th;

        if (revealTarget.progress > thresh) {
          const grad = ctx.createLinearGradient(ix, iy, ix + 160, iy + 40);
          grad.addColorStop(0, "#3366ff");
          grad.addColorStop(1, "#7cf58e");
          ctx.fillStyle = grad;
          ctx.fillRect(tx, ty, tw, th);
        } else {
          ctx.fillStyle = "#222";
          ctx.fillRect(tx, ty, tw, th);
        }
      }
    }
    ctx.strokeStyle = "#444";
    ctx.strokeRect(ix, iy, 160, 40);
  }

  function drawNestedTicker() {
    const nx = nestedTarget.x;
    const ny = nestedTarget.y;

    ctx.fillStyle = "#888";
    ctx.font = "10px monospace";
    ctx.fillText("Independent Ticker Demo", 400, 185);

    ctx.save();
    ctx.translate(nx, ny);
    ctx.scale(nestedTarget.scale, nestedTarget.scale);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.3, "#3366ff");
    grad.addColorStop(1, "#1a1a2e");

    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#3366ff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Connection line to indicate independence
    ctx.strokeStyle = "#333";
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(400, 240);
    ctx.lineTo(560, 240);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!nestedTicker.running) {
      ctx.fillStyle = "rgba(255, 100, 100, 0.5)";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("PAUSED", 460, 245);
    }
  }

  function drawChainDemo() {
    const cy = 355;
    ctx.fillStyle = "#888";
    ctx.font = "10px monospace";
    ctx.fillText("Chained Transitions", 30, cy - 8);

    if (chainMessage) {
      ctx.fillStyle = "#7cf58e";
      ctx.font = "italic 11px sans-serif";
      ctx.fillText(chainMessage, 30, cy + 45);
    }

    for (const ct of chainState.targets) {
      ctx.fillStyle = ct.color;
      ctx.beginPath();
      ctx.arc(ct.x + 40, ct.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ── Main render loop ──
  const renderEl = new Element("l51-render");
  renderEl.update = (dt) => {
    // Pipeline update (Element properties are updated by Tween via scene.ticker)

    // Draw
    ctx.clearRect(0, 0, 600, 440);
    ctx.fillStyle = "#12121e";
    ctx.fillRect(0, 0, 600, 440);

    // Section dividers
    ctx.strokeStyle = "#2a2a3e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(220, 0); ctx.lineTo(220, 160);
    ctx.moveTo(0, 160); ctx.lineTo(600, 160);
    ctx.moveTo(380, 160); ctx.lineTo(380, 330);
    ctx.moveTo(0, 330); ctx.lineTo(600, 330);
    ctx.stroke();

    drawEasingCurve();
    drawAnimRect();
    drawColorInterp();
    drawTextReveal();
    drawImageReveal();
    drawNestedTicker();
    drawChainDemo();
  };
  scene.ticker.add(renderEl);

  // Auto-start
  startAll();
  nestedTicker.start();
}
