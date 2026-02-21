export default function (Arena2D) {
  const { Scene, View, Container, Element } = Arena2D;

  const wrap = document.getElementById("l14-canvas-wrap");
  const logContainer = document.getElementById("l14-debug-logs");

  let scene = null;
  let view = null;
  /** @type {Element | null} */
  let targetEl = null;
  /** @type {Container | null} */
  let stressGroup = null;

  // ── Log Interceptor ──────────────────────────────────────────
  const originalWarn = console.warn;
  console.warn = (...args) => {
    originalWarn.apply(console, args);
    const msg = args.join(" ");
    const entry = document.createElement("div");
    entry.style.borderBottom = "1px solid #222";
    entry.style.padding = "2px 0";
    entry.style.color = msg.includes("Performance") ? "#ffcc00" : "#ff6666";
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logContainer.prepend(entry);
    if (logContainer.childNodes.length > 50) {
      logContainer.removeChild(logContainer.lastChild);
    }
  };

  // ── Scene setup ──────────────────────────────────────────────
  const initScene = () => {
    if (scene) scene.destroy();

    scene = new Scene(wrap.clientWidth, wrap.clientHeight);
    view = new View(wrap, scene);
    view.resize(wrap.clientWidth, wrap.clientHeight);
    scene.ticker.start();

    // ── Target element (error convention demo) ─────────────────
    targetEl = new Element("error-target");
    targetEl.x = 30;
    targetEl.y = 30;
    targetEl.width = 180;
    targetEl.height = 120;
    targetEl.paint = (ctx) => {
      ctx.drawRoundedRect(0, 0, targetEl.width, targetEl.height, 8, "#2e5090", "#6ea8fe");
      ctx.drawText("Error Target", targetEl.width / 2, 24, {
        fontSize: 14, fontFamily: "sans-serif", fill: "#fff",
        textAlign: "center", textBaseline: "middle",
      });
      const props = [
        `alpha: ${targetEl.alpha.toFixed(2)}`,
        `x: ${targetEl.x}`,
        `scaleX: ${targetEl.scaleX.toFixed(4)}`,
      ];
      props.forEach((txt, i) => {
        ctx.drawText(txt, targetEl.width / 2, 52 + i * 20, {
          fontSize: 12, fontFamily: "monospace", fill: "#b8d4fe",
          textAlign: "center", textBaseline: "middle",
        });
      });
    };
    scene.root.addChild(targetEl);

    // ── Label for stress test area ─────────────────────────────
    const label = new Element("stress-label");
    label.x = 30;
    label.y = 170;
    label.width = 200;
    label.height = 20;
    label.paint = (ctx) => {
      ctx.drawText("Stress Test Area", 0, 0, {
        fontSize: 13, fontFamily: "sans-serif", fill: "#777",
        textAlign: "left", textBaseline: "top",
      });
    };
    scene.root.addChild(label);

    // ── Stress test group ──────────────────────────────────────
    stressGroup = new Container("stress-group");
    stressGroup.x = 30;
    stressGroup.y = 195;
    scene.root.addChild(stressGroup);

    // Sync cache checkbox state
    const cacheCheck = /** @type {HTMLInputElement} */ (document.getElementById("l14-cache-check"));
    if (cacheCheck.checked && stressGroup) stressGroup.cacheAsBitmap = true;

    syncStressCount();
  };

  // ── Stress test helpers ──────────────────────────────────────
  const STRESS_AREA_W = () => (scene ? scene.width - 60 : 500);
  const STRESS_AREA_H = () => (scene ? scene.height - 220 : 280);

  const makeStressRect = (index) => {
    const el = new Element(`stress-${index}`);
    const w = 8 + Math.random() * 16;
    const h = 8 + Math.random() * 16;
    el.x = Math.random() * (STRESS_AREA_W() - w);
    el.y = Math.random() * (STRESS_AREA_H() - h);
    el.width = w;
    el.height = h;
    el.alpha = 0.4 + Math.random() * 0.6;
    const hue = Math.random() * 360;
    el.paint = (ctx) => {
      ctx.drawRect(0, 0, el.width, el.height, `hsl(${hue}, 65%, 55%)`);
    };
    return el;
  };

  const syncStressCount = () => {
    if (!stressGroup) return;
    const count = parseInt(
      /** @type {HTMLInputElement} */ (document.getElementById("l14-count-slider")).value,
    );
    document.getElementById("l14-count-val").textContent = String(count);

    while (stressGroup.children.length > count) {
      stressGroup.removeChild(stressGroup.children[stressGroup.children.length - 1]);
    }
    while (stressGroup.children.length < count) {
      stressGroup.addChild(makeStressRect(stressGroup.children.length));
    }
  };

  // ── Bind controls ────────────────────────────────────────────

  // Debug checkbox
  /** @type {HTMLInputElement} */
  const debugCheck = /** @type {HTMLInputElement} */ (document.getElementById("l14-debug-check"));
  debugCheck.onchange = () => {
    Arena2D.Arena2D.debug = debugCheck.checked;
    syncStressCount();
  };

  // Error convention buttons
  document.getElementById("l14-btn-nan").onclick = () => {
    if (targetEl) targetEl.alpha = NaN;
  };
  document.getElementById("l14-btn-inf").onclick = () => {
    if (targetEl) targetEl.x = Infinity;
  };
  document.getElementById("l14-btn-zero-scale").onclick = () => {
    if (targetEl) targetEl.scaleX = 0;
  };
  document.getElementById("l14-btn-reset").onclick = () => {
    if (targetEl) {
      targetEl.alpha = 1;
      targetEl.x = 30;
      targetEl.scaleX = 1;
    }
  };

  // Stress test controls
  document.getElementById("l14-count-slider").oninput = syncStressCount;

  /** @type {HTMLInputElement} */
  const cacheCheck = /** @type {HTMLInputElement} */ (document.getElementById("l14-cache-check"));
  cacheCheck.onchange = () => {
    if (stressGroup) stressGroup.cacheAsBitmap = cacheCheck.checked;
  };

  // Memory management
  document.getElementById("l14-btn-destroy").onclick = () => {
    if (scene) {
      scene.destroy();
      scene = null;
      view = null;
      targetEl = null;
      stressGroup = null;
    }
  };
  document.getElementById("l14-btn-reinit").onclick = initScene;

  // Clear logs
  document.getElementById("l14-clear-logs").onclick = () => {
    logContainer.innerHTML =
      '<div style="color: #555;">Enable debug mode and trigger actions.</div>';
  };

  // ── Boot ─────────────────────────────────────────────────────
  Arena2D.Arena2D.debug = true;
  initScene();

  return () => {
    if (scene) scene.destroy();
    console.warn = originalWarn;
  };
}
