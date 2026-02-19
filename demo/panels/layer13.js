/**
 * Layer 13 Demo — Animation System
 *
 * Demonstrates:
 * - Timeline hierarchy (Main -> Solar System)
 * - Property animations (rotation, position, etc.)
 * - Reusable Clips (Orbit, Pulse)
 * - Playback controls (Speed, Pause)
 * - Easing functions
 * - Staggered delays
 * - Conflict resolution
 * - Multi-channel animations
 */

export default async function (Arena2D) {
  const {
    Scene,
    Container,
    Element,
    Timeline,
    Clip,
    NumberChannel,
    ColorChannel,
    StringChannel,
    Animator,
    ElementAdapter,
    Easing,
    ArenaContext,
    AnimationBlendMode,
  } = Arena2D;

  const container = document.getElementById("l13-demo-container");
  if (!container) return;

  const scene = new Scene(container, container.clientWidth, container.clientHeight);
  scene.ticker.start();

  // ── 1. Easing Gallery (Top Left) ──
  createEasingGallery(scene, Arena2D);

  // ── 2. Staggered Delay (Top Right) ──
  createStaggeredDelay(scene, Arena2D);

  // ── 3. Solar System (Center) ──
  createSolarSystem(scene, Arena2D);

  // ── 4. Playback Controls & Nested Timelines (Lower Middle) ──
  // ── 4. Playback Controls & Nested Timelines (Lower Middle) ──
  createPlaybackControls(scene, Arena2D);
  createNestedTimelines(scene, Arena2D);

  // ── 5. Conflict Resolution & Multi-Channel (Bottom) ──
  createConflictResolution(scene, Arena2D);
  createMultiChannel(scene, Arena2D);
  createAdditiveAnimation(scene, Arena2D);

  // ── Global Controls ──
  createGlobalControls(scene, Arena2D);
}

// ── Section 1: Easing Gallery ──
function createEasingGallery(scene, { Container, Element, Clip, NumberChannel, Animator, ElementAdapter, Easing }) {
  const root = new Container("easing-gallery");
  root.x = 20;
  root.y = 40;
  scene.root.addChild(root);

  const easings = [
    { name: "Linear", fn: Easing.Linear },
    { name: "QuadIn", fn: Easing.QuadIn },
    { name: "QuadOut", fn: Easing.QuadOut },
    { name: "BackIn", fn: Easing.BackIn },
    { name: "BackOut", fn: Easing.BackOut },
    { name: "ElasticOut", fn: Easing.ElasticOut }
  ];

  easings.forEach((easing, i) => {
    const y = i * 40;

    // Label
    const label = new Element("label-" + easing.name);
    label.x = 0;
    label.y = y;
    label.paint = (ctx) => {
      ctx.raw.fillStyle = "#888";
      ctx.raw.font = "12px monospace";
      ctx.raw.fillText(easing.name, 0, 4);
    };
    root.addChild(label);

    // Ball
    const ball = new Element("ball-" + easing.name);
    ball.x = 80;
    ball.y = y;
    ball.paint = (ctx) => {
      ctx.raw.fillStyle = "#4CAF50"; // Green
      ctx.raw.beginPath();
      ctx.raw.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.raw.fill();
    };
    root.addChild(ball);

    // Animate
    // Using low-level API to be explicit, but could use element.animate()
    const clip = new Clip("move");
    const ch = new NumberChannel();
    ch.addKeyframe(0, 80);
    ch.addKeyframe(2, 300, easing.fn);
    clip.addChannel("x", ch);

    const animator = new Animator(clip, new ElementAdapter(ball), {
      loop: true,
      yoyo: true,
      delay: 0.5 // Start after a bit
    });
    scene.timeline.add(animator);
    animator.play();
  });
}

// ── Section 2: Staggered Delay ──
function createStaggeredDelay(scene, { Container, Element, Easing }) {
  const root = new Container("stagger-section");
  root.x = 400; // Right side
  root.y = 40;
  scene.root.addChild(root);

  // Trigger Button
  const btn = new Element("trigger-btn");
  btn.x = 0;
  btn.y = 0;
  // Simple "button" drawing
  btn.paint = (ctx) => {
    ctx.raw.fillStyle = "#2196F3"; // Blue
    ctx.raw.fillRect(0, 0, 100, 30);
    ctx.raw.fillStyle = "white";
    ctx.raw.font = "12px Arial";
    ctx.raw.fillText("▶ Trigger Stagger", 10, 20);
  };
  root.addChild(btn);

  // Status text
  const status = new Element("stagger-status");
  status.x = 120;
  status.y = 20;
  let statusText = "Ready";
  status.paint = (ctx) => {
    ctx.raw.fillStyle = "#aaa";
    ctx.raw.font = "12px monospace";
    ctx.raw.fillText(statusText, 0, 0);
  };
  root.addChild(status);

  // Bars
  const bars = [];
  for (let i = 0; i < 8; i++) {
    const bar = new Element("bar-" + i);
    bar.x = 0;
    bar.y = 50 + i * 25;
    bar.scaleX = 0.1; // Start small
    bar.paint = (ctx) => {
      ctx.raw.fillStyle = `hsl(${200 + i * 10}, 70%, 50%)`;
      ctx.raw.fillRect(0, 0, 200, 15);
    };
    root.addChild(bar);
    bars.push(bar);
  }

  // Click handler (using DOM overlay since no interaction manager in this demo context yet, 
  // or we can attach to container and check bounds. For simplicity in this demo, we'll attach to the DOM container 
  // and check approximate coordinates)

  // Actually, we can just use the global click handler in the main setup or attach a specific one.
  // Let's attach a listener to the canvas container for this region.
  const domContainer = scene.container;
  domContainer.addEventListener("mousedown", (e) => {
    const rect = domContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check bounds of button (relative to root at 400, 40)
    // Button is at 400, 40, size 100x30
    if (x >= 400 && x <= 500 && y >= 40 && y <= 70) {
      statusText = "Animating...";

      // Animate bars
      bars.forEach((bar, i) => {
        // Reset
        bar.scaleX = 0;

        bar.animate({ scaleX: 1 }, {
          duration: 1,
          easing: Easing.BackOut,
          delay: i * 0.1, // Stagger!
          onComplete: () => {
            if (i === bars.length - 1) statusText = "Finished!";
          }
        });
      });
    }
  });
}

function createSolarSystem(scene, { Container, Element, Clip, NumberChannel, Animator, ElementAdapter }) {
  const root = new Container("solar-system-root");
  root.x = 350; // Center-ish
  root.y = 350;
  scene.root.addChild(root);

  // Sun
  const sun = new Element("sun");
  sun.paint = (ctx) => {
    ctx.raw.fillStyle = "#FFD700"; // Gold
    ctx.raw.beginPath();
    ctx.raw.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.raw.fill();
    ctx.raw.fillStyle = "rgba(255, 215, 0, 0.2)";
    ctx.raw.beginPath();
    ctx.raw.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.raw.fill();
  };
  root.addChild(sun);

  // Status Labels for Time
  const timeLabel = new Element("time-label");
  timeLabel.x = -100;
  timeLabel.y = 120;
  let earthTime = 0;
  let moonTime = 0;
  timeLabel.paint = (ctx) => {
    ctx.raw.fillStyle = "#888";
    ctx.raw.font = "11px monospace";
    ctx.raw.fillText(`Earth t: ${earthTime.toFixed(2)}`, 0, 0);
    ctx.raw.fillText(`Moon t:  ${moonTime.toFixed(2)}`, 0, 15);
  };
  root.addChild(timeLabel);

  // Shared Orbit Clip
  const orbitClip = new Clip("orbit");
  const rotChannel = new NumberChannel();
  rotChannel.addKeyframe(0, 0);
  rotChannel.addKeyframe(10, 360);
  orbitClip.addChannel("rotation", rotChannel);

  // Earth
  const earthOrbit = new Container("earth-orbit");
  root.addChild(earthOrbit);

  const earth = new Element("earth");
  earth.x = 180;
  earth.paint = (ctx) => {
    ctx.raw.fillStyle = "#1E90FF";
    ctx.raw.beginPath();
    ctx.raw.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.raw.fill();
  };
  earthOrbit.addChild(earth);

  const earthAnim = new Animator(orbitClip, new ElementAdapter(earthOrbit), {
    loop: true,
    onUpdate: (p) => { earthTime = earthAnim.time; }
  });
  scene.timeline.add(earthAnim);
  earthAnim.play();

  // Moon
  const moonOrbit = new Container("moon-orbit");
  moonOrbit.x = 180;
  earthOrbit.addChild(moonOrbit);

  const moon = new Element("moon");
  moon.x = 30;
  moon.paint = (ctx) => {
    ctx.raw.fillStyle = "#ccc";
    ctx.raw.beginPath();
    ctx.raw.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.raw.fill();
  };
  moonOrbit.addChild(moon);

  const moonAnim = new Animator(orbitClip, new ElementAdapter(moonOrbit), {
    loop: true,
    timeScale: 3, // Faster
    onUpdate: (p) => { moonTime = moonAnim.time; }
  });
  scene.timeline.add(moonAnim);
  moonAnim.play();

  // Mars (slower, further out)
  const marsOrbit = new Container("mars-orbit");
  root.addChild(marsOrbit);

  const mars = new Element("mars");
  mars.x = 260;
  mars.paint = (ctx) => {
    ctx.raw.fillStyle = "#FF5722"; // Red-orange
    ctx.raw.beginPath();
    ctx.raw.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.raw.fill();
  };
  marsOrbit.addChild(mars);

  const marsAnim = new Animator(orbitClip, new ElementAdapter(marsOrbit), {
    loop: true,
    timeScale: 0.5 // Slower
  });
  scene.timeline.add(marsAnim);
  marsAnim.play();
}

// ── Section 4: Playback Controls ──
function createPlaybackControls(scene, { Container, Element, Clip, NumberChannel, Animator, ElementAdapter, Easing }) {
  const root = new Container("playback-controls");
  root.x = 20;
  root.y = 550;
  scene.root.addChild(root);

  // Target Box
  const box = new Element("playback-box");
  box.x = 50;
  box.y = 50;
  box.paint = (ctx) => {
    ctx.raw.fillStyle = "#E91E63"; // Pink
    ctx.raw.fillRect(-15, -15, 30, 30);
  };
  root.addChild(box);

  // Clip
  const clip = new Clip("bounce");
  const xCh = new NumberChannel();
  xCh.addKeyframe(0, 50);
  xCh.addKeyframe(2, 250, Easing.QuadInOut);
  clip.addChannel("x", xCh);

  const anim = new Animator(clip, new ElementAdapter(box), {
    loop: true,
    yoyo: true
  });
  scene.timeline.add(anim);
  anim.play();

  // Status text
  const status = new Element("status");
  status.x = 0;
  status.y = 0;
  status.paint = (ctx) => {
    ctx.raw.fillStyle = "white";
    ctx.raw.font = "12px monospace";
    ctx.raw.fillText(`State: ${anim.isPlaying ? "Playing" : "Stopped/Paused"}`, 0, 0);
    ctx.raw.fillText(`Paused: ${anim.paused}`, 0, 15);
    ctx.raw.fillText(`Time: ${anim.time.toFixed(2)}`, 0, 30);
    ctx.raw.fillText(`Progress: ${anim.progress.toFixed(2)}`, 0, 45);
  };
  root.addChild(status);

  // Buttons helpers
  function createBtn(label, x, cb) {
    const btn = new Element("btn-" + label);
    btn.x = x;
    btn.y = 100;
    btn.paint = (ctx) => {
      ctx.raw.fillStyle = "#333";
      ctx.raw.fillRect(0, 0, 60, 25);
      ctx.raw.strokeStyle = "#555";
      ctx.raw.strokeRect(0, 0, 60, 25);
      ctx.raw.fillStyle = "white";
      ctx.raw.font = "10px Arial";
      ctx.raw.fillText(label, 15, 16);
    };
    root.addChild(btn);

    // Add hitbox logic for click (simulated)
    return { x: root.x + x, y: root.y + 100, w: 60, h: 25, cb };
  }

  const buttons = [
    createBtn("Pause", 0, () => anim.pause()),
    createBtn("Resume", 70, () => anim.resume()),
    createBtn("Stop", 140, () => anim.stop()),
    createBtn("Cancel", 210, () => anim.cancel()),
    createBtn("Play", 280, () => {
      // Re-attach if needed (cancel detaches)
      if (anim.progress === 0 && !anim.isPlaying) {
        scene.timeline.add(anim);
      }
      scene.timeline.add(anim); // Ensure it's there
      anim.play();
    })
  ];

  // Global click listener for these buttons
  const domContainer = scene.container;
  domContainer.addEventListener("mousedown", (e) => {
    const rect = domContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    buttons.forEach(btn => {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        btn.cb();
      }
    });
  });
}

// ── Section 4b: Nested Timelines ──
function createNestedTimelines(scene, { Container, Element, Timeline, Clip, NumberChannel, Animator, ElementAdapter }) {
  const root = new Container("nested-timelines");
  root.x = 400; // Right side
  root.y = 550;
  scene.root.addChild(root);

  // Label
  const title = new Element("nested-title");
  title.paint = (ctx) => {
    ctx.raw.fillStyle = "#888";
    ctx.raw.font = "12px sans-serif";
    ctx.raw.fillText("Nested Timelines & TimeScale", 0, 0);
  };
  root.addChild(title);

  // 1. Parent Timeline
  const parentTimeline = new Timeline();
  scene.timeline.add(parentTimeline); // Add to main scene timeline

  // 2. Child Timeline
  const childTimeline = new Timeline();
  parentTimeline.add(childTimeline); // Add to parent timeline

  // Visuals for Parent
  const pBox = new Element("parent-box");
  pBox.x = 0;
  pBox.y = 40;
  pBox.paint = (ctx) => {
    ctx.raw.fillStyle = "#03A9F4";
    ctx.raw.fillRect(0, 0, 20, 20);
    ctx.raw.fillStyle = "white";
    ctx.raw.font = "10px sans-serif";
    ctx.raw.fillText("P", 6, 14);
  };
  root.addChild(pBox);

  // Visuals for Child
  const cBox = new Element("child-box");
  cBox.x = 0;
  cBox.y = 80;
  cBox.paint = (ctx) => {
    ctx.raw.fillStyle = "#FF9800";
    ctx.raw.fillRect(0, 0, 20, 20);
    ctx.raw.fillStyle = "white";
    ctx.raw.fillText("C", 6, 14);
  };
  root.addChild(cBox);

  // Animation Clip (move right)
  const clip = new Clip("move");
  const ch = new NumberChannel();
  ch.addKeyframe(0, 0);
  ch.addKeyframe(2, 200);
  clip.addChannel("x", ch);

  // Animator on Parent Timeline
  const pAnim = new Animator(clip, new ElementAdapter(pBox), { loop: true, yoyo: true });
  parentTimeline.add(pAnim);
  pAnim.play();

  // Animator on Child Timeline
  const cAnim = new Animator(clip, new ElementAdapter(cBox), { loop: true, yoyo: true });
  childTimeline.add(cAnim);
  cAnim.play();

  // Controls for TimeScales
  // We'll use DOM sliders overlaid again for simplicity
  const ctrls = document.createElement("div");
  ctrls.style.position = "absolute";
  ctrls.style.left = "400px";
  ctrls.style.top = "680px";
  ctrls.style.color = "#aaa";
  ctrls.style.fontSize = "12px";
  scene.container.appendChild(ctrls);

  const pRow = document.createElement("div");
  pRow.innerHTML = "Parent Scale: <span id='p-val'>1.0</span>x ";
  const pSlider = document.createElement("input");
  pSlider.type = "range"; pSlider.min = "0"; pSlider.max = "3"; pSlider.step = "0.1"; pSlider.value = "1";
  pSlider.oninput = (e) => {
    const v = parseFloat(e.target.value);
    parentTimeline.timeScale = v;
    document.getElementById("p-val").textContent = v.toFixed(1);
    updateEffective();
  };
  pRow.appendChild(pSlider);
  ctrls.appendChild(pRow);

  const cRow = document.createElement("div");
  cRow.innerHTML = "Child Scale: <span id='c-val'>1.0</span>x ";
  const cSlider = document.createElement("input");
  cSlider.type = "range"; cSlider.min = "0"; cSlider.max = "3"; cSlider.step = "0.1"; cSlider.value = "1";
  cSlider.oninput = (e) => {
    const v = parseFloat(e.target.value);
    childTimeline.timeScale = v;
    document.getElementById("c-val").textContent = v.toFixed(1);
    updateEffective();
  };
  cRow.appendChild(cSlider);
  ctrls.appendChild(cRow);

  const effRow = document.createElement("div");
  effRow.innerHTML = "Child Effective: <span id='eff-val'>1.0</span>x";
  ctrls.appendChild(effRow);

  function updateEffective() {
    const eff = parentTimeline.timeScale * childTimeline.timeScale * scene.timeline.timeScale;
    document.getElementById("eff-val").textContent = eff.toFixed(2);
  }
}

// ── Section 5: Conflict Resolution ──
function createConflictResolution(scene, { Container, Element, Easing }) {
  const root = new Container("conflict-root");
  root.x = 20;
  root.y = 800; // Bottom area
  scene.root.addChild(root);

  // Label
  const label = new Element("conflict-label");
  label.paint = (ctx) => {
    ctx.raw.fillStyle = "white";
    ctx.raw.font = "14px sans-serif";
    ctx.raw.fillText("Conflict Resolution (Registry)", 0, 0);
    ctx.raw.font = "10px sans-serif";
    ctx.raw.fillStyle = "#aaa";
    ctx.raw.fillText("Click targets rapidly. New animation cancels old one.", 0, 15);
  };
  root.addChild(label);

  // The Puck
  const puck = new Element("puck");
  puck.x = 150;
  puck.y = 100;
  puck.paint = (ctx) => {
    ctx.raw.fillStyle = "#CDDC39"; // Lime
    ctx.raw.beginPath();
    ctx.raw.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.raw.fill();
  };
  root.addChild(puck);

  // Log
  const log = new Element("log");
  log.x = 300;
  log.y = 50;
  let logMsg = "Waiting...";
  log.paint = (ctx) => {
    ctx.raw.fillStyle = "#888";
    ctx.raw.font = "12px monospace";
    ctx.raw.fillText(logMsg, 0, 0);
  };
  root.addChild(log);

  // Targets
  const targets = [
    { label: "TL", x: 50, y: 50 },
    { label: "TR", x: 250, y: 50 },
    { label: "BL", x: 50, y: 150 },
    { label: "BR", x: 250, y: 150 }
  ];

  const btns = [];
  targets.forEach((t, i) => {
    const btn = new Element("target-" + i);
    btn.x = t.x;
    btn.y = t.y;
    btn.paint = (ctx) => {
      ctx.raw.strokeStyle = "#555";
      ctx.raw.strokeRect(-20, -20, 40, 40);
      ctx.raw.fillStyle = "#555";
      ctx.raw.font = "10px sans-serif";
      ctx.raw.fillText(t.label, -6, 4);
    };
    root.addChild(btn);

    btns.push({
      x: root.x + t.x - 20, y: root.y + t.y - 20, w: 40, h: 40,
      cb: () => {
        // ANIMATE!
        // This uses element.animate() which uses the Registry internally.
        // Rapid clicks will cause the previous animation to be cancelled.
        logMsg = `Anim to ${t.label}...`;

        const anim = puck.animate({ x: t.x, y: t.y }, {
          duration: 1.0,
          easing: Easing.CubicInOut,
          onComplete: () => {
            logMsg = `Arrived at ${t.label}`;
          }
        });

      }
    });
  });

  // Click handler
  const domContainer = scene.container;
  domContainer.addEventListener("mousedown", (e) => {
    const rect = domContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    btns.forEach(btn => {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        btn.cb();
      }
    });
  });
}

// ── Section 6: Multi-Channel (All Types) ──
function createMultiChannel(scene, { Container, Element, Clip, NumberChannel, ColorChannel, StringChannel, Animator, ElementAdapter, Easing }) {
  const root = new Container("multi-channel");
  root.x = 500;
  root.y = 800;
  scene.root.addChild(root);

  const label = new Element("mc-label");
  label.paint = (ctx) => {
    ctx.raw.fillStyle = "white";
    ctx.raw.font = "14px sans-serif";
    ctx.raw.fillText("Multi-Channel (Color, String, etc)", 0, 0);
  };
  root.addChild(label);

  // The Demo Element
  const el = new Element("multichannel-box");
  el.x = 100;
  el.y = 100;
  // Initialize custom props
  el.color = "rgba(255, 255, 255, 1)";
  el.msg = "Hello";

  el.paint = (ctx) => {
    ctx.raw.fillStyle = el.color;
    ctx.raw.fillRect(-30, -30, 60, 60);

    ctx.raw.fillStyle = "black";
    ctx.raw.font = "12px sans-serif";
    ctx.raw.textAlign = "center";
    ctx.raw.fillText(el.msg, 0, 4);
    ctx.raw.textAlign = "start"; // Reset
  };
  root.addChild(el);

  // Clip
  const clip = new Clip("features");

  // 1. Color Channel
  if (ColorChannel) {
    const colorCh = new ColorChannel();
    colorCh.addKeyframe(0, "#FFFFFF");
    colorCh.addKeyframe(1, "#FF0000"); // Red
    colorCh.addKeyframe(2, "#0000FF"); // Blue
    colorCh.addKeyframe(3, "#FFFFFF");
    clip.addChannel("color", colorCh);
  }

  // 2. String Channel (Custom text)
  if (StringChannel) {
    const strCh = new StringChannel();
    strCh.addKeyframe(0, "Init");
    strCh.addKeyframe(0.5, "Color!");
    strCh.addKeyframe(1.5, "Spin!");
    strCh.addKeyframe(2.5, "Fade!");
    clip.addChannel("msg", strCh);
  }

  // 3. Number Channels (Rotation, Scale)
  const rotCh = new NumberChannel();
  rotCh.addKeyframe(0, 0);
  rotCh.addKeyframe(3, Math.PI * 2);
  clip.addChannel("rotation", rotCh);

  const scaleCh = new NumberChannel();
  scaleCh.addKeyframe(0, 1);
  scaleCh.addKeyframe(1.5, 1.5, Easing.ElasticOut);
  scaleCh.addKeyframe(3, 1);
  clip.addChannel("scaleX", scaleCh);
  clip.addChannel("scaleY", scaleCh);

  const anim = new Animator(clip, new ElementAdapter(el), {
    loop: true,
  });
  scene.timeline.add(anim);
  anim.play();

  // Sample Data Readout
  const readout = new Element("readout");
  readout.x = 200;
  readout.y = 50;
  readout.paint = (ctx) => {
    ctx.raw.fillStyle = "#aaa";
    ctx.raw.font = "10px monospace";
    // Manual sample for debug visualization
    const t = anim.time;
    ctx.raw.fillText(`Time: ${t.toFixed(2)}`, 0, 0);
    if (el.color) ctx.raw.fillText(`Color: ${el.color}`, 0, 15);
    if (el.msg) ctx.raw.fillText(`Msg: ${el.msg}`, 0, 30);
  };
  root.addChild(readout);
}

// ── Section 7: Additive Animation ──
function createAdditiveAnimation(scene, { Container, Element, Clip, NumberChannel, Animator, ElementAdapter, Easing, AnimationBlendMode }) {
  const root = new Container("additive-root");
  root.x = 20;
  root.y = 880; // Below conflict resolution
  scene.root.addChild(root);

  const label = new Element("additive-label");
  label.paint = (ctx) => {
    ctx.raw.fillStyle = "white";
    ctx.raw.font = "14px sans-serif";
    ctx.raw.fillText("Additive Animation (Shake)", 0, 0);
  };
  root.addChild(label);

  const box = new Element("shake-box");
  box.x = 50;
  box.y = 50;
  box.paint = (ctx) => {
    ctx.raw.fillStyle = "#9C27B0"; // Purple
    ctx.raw.fillRect(-20, -20, 40, 40);
  };
  root.addChild(box);

  // Base Animation: Move Right (Override)
  const moveClip = new Clip("move");
  const xCh = new NumberChannel();
  xCh.addKeyframe(0, 50);
  xCh.addKeyframe(3, 300);
  moveClip.addChannel("x", xCh);

  const moveAnim = new Animator(moveClip, new ElementAdapter(box), {
    loop: true,
    yoyo: true
  });
  scene.timeline.add(moveAnim);
  moveAnim.play();

  // Additive Animation: Shake Y (Additive)
  const shakeClip = new Clip("shake");
  const yCh = new NumberChannel();
  // We want to add ~20px offset up and down
  // Since it's additive, we oscillate around 0
  yCh.addKeyframe(0, 0);
  yCh.addKeyframe(0.1, -20);
  yCh.addKeyframe(0.2, 20);
  yCh.addKeyframe(0.3, -20);
  yCh.addKeyframe(0.4, 20);
  yCh.addKeyframe(0.5, 0);
  shakeClip.addChannel("y", yCh);

  const shakeAnim = new Animator(shakeClip, new ElementAdapter(box), {
    loop: true,
    blendMode: AnimationBlendMode.Additive
  });
  // We DON'T play initially. Trigger on click.

  const btn = new Element("shake-btn");
  btn.x = 100;
  btn.y = 80;
  btn.paint = (ctx) => {
    ctx.raw.fillStyle = "#444";
    ctx.raw.fillRect(0, 0, 80, 25);
    ctx.raw.fillStyle = "white";
    ctx.raw.font = "12px sans-serif";
    ctx.raw.fillText("Add Shake", 10, 16);
  };
  root.addChild(btn);

  // Interaction
  const domContainer = scene.container;
  domContainer.addEventListener("mousedown", (e) => {
    const rect = domContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check btn bounds relative to root
    const bx = root.x + btn.x;
    const by = root.y + btn.y;

    if (mx >= bx && mx <= bx + 80 && my >= by && my <= by + 25) {
      scene.timeline.add(shakeAnim);
      shakeAnim.play();

      // Stop after 2s
      setTimeout(() => {
        shakeAnim.cancel();
      }, 2000);
    }
  });
}

// ── Global Controls ──
function createGlobalControls(scene, Arena2D) {
  const controlsDiv = document.getElementById("l13-controls");
  if (!controlsDiv) return;

  // Clear existing (in case of re-run)
  controlsDiv.innerHTML = "";

  // Label
  const label = document.createElement("div");
  label.textContent = "Global Scene Timeline:";
  label.style.color = "white";
  label.style.marginRight = "15px";
  label.style.fontFamily = "sans-serif";
  label.style.fontSize = "14px";
  controlsDiv.appendChild(label);

  // TimeScale
  const scaleInput = document.createElement("input");
  scaleInput.type = "range";
  scaleInput.min = "0";
  scaleInput.max = "3";
  scaleInput.step = "0.1";
  scaleInput.value = "1";
  scaleInput.style.marginRight = "10px";
  controlsDiv.appendChild(scaleInput);

  const scaleLabel = document.createElement("span");
  scaleLabel.textContent = "1.0x";
  scaleLabel.style.color = "#ccc";
  scaleLabel.style.marginRight = "20px";
  scaleLabel.style.width = "40px";
  scaleLabel.style.display = "inline-block";
  controlsDiv.appendChild(scaleLabel);

  scaleInput.oninput = (e) => {
    const val = parseFloat(e.target.value);
    scene.timeline.timeScale = val;
    scaleLabel.textContent = val.toFixed(1) + "x";

    // Also update nested timeline effective readout if it exists
    const effVal = document.getElementById("eff-val");
    if (effVal) {
      // Best effort update
    }
  };

  // Pause/Resume
  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "Pause";
  pauseBtn.style.padding = "5px 10px";
  pauseBtn.style.cursor = "pointer";
  controlsDiv.appendChild(pauseBtn);

  pauseBtn.onclick = () => {
    scene.timeline.paused = !scene.timeline.paused;
    pauseBtn.textContent = scene.timeline.paused ? "Resume" : "Pause";
  };

  // Reset
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset All";
  resetBtn.style.padding = "5px 10px";
  resetBtn.style.marginLeft = "10px";
  resetBtn.style.cursor = "pointer";
  controlsDiv.appendChild(resetBtn);

  resetBtn.onclick = () => {
    scene.timeline.timeScale = 1;
    scene.timeline.paused = false;
    scaleInput.value = "1";
    scaleLabel.textContent = "1.0x";
    pauseBtn.textContent = "Pause";
  };
}
