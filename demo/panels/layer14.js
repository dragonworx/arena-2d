export default async function (ArenaUI) {
  const { Scene, Container, Text, Element, Image, Arena2D } = ArenaUI;

  // ── Logger Helper ──
  const logEl = document.getElementById("l14-log");
  function log(msg, type = "info") {
    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // Override console.warn to capture Arena2D warnings
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args.join(" ");
    if (msg.includes("Arena2D")) {
      log(msg, "warn");
    }
    originalWarn.apply(console, args);
  };

  document.getElementById("l14-clear-log").onclick = () => {
    logEl.innerHTML = "";
  };

  // ── Scene Setup ──
  const container = document.getElementById("l14-canvas-wrap");
  const scene = new Scene(container, 500, 400);
  scene.ticker.start();

  const testBox = new Container("test-box");
  testBox.width = 100;
  testBox.height = 100;
  testBox.x = 200;
  testBox.y = 150;
  // Add a visual background so we can see the bounds
  const bg = new Element("test-bg");
  bg.paint = (ctx) => {
    ctx.raw.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.raw.strokeStyle = "#4a90d9";
    ctx.raw.lineWidth = 2;
    ctx.raw.fillRect(0, 0, testBox.width, testBox.height);
    ctx.raw.strokeRect(0, 0, testBox.width, testBox.height);
  };
  testBox.addChild(bg);

  const label = new Text("Label");
  label.text = "Target";
  label.updateTextStyle({ color: "#fff", fontSize: 14 });
  label.x = 20;
  label.y = 40;
  testBox.addChild(label);

  scene.root.addChild(testBox);

  // ── Controls ──

  // Debug Toggle
  Arena2D.debug = true;
  const debugToggle = document.getElementById("l14-debug-enable");
  debugToggle.checked = Arena2D.debug;
  debugToggle.onchange = (e) => {
    Arena2D.debug = e.target.checked;
    log(`Arena2D.debug = ${Arena2D.debug}`, "info");
  };

  // NaN Assignments
  document.getElementById("l14-btn-nan").onclick = () => {
    log("Attempting NaN assignments...", "info");
    testBox.x = NaN;
    testBox.rotation = NaN;
    testBox.alpha = NaN;
  };

  // Alpha Clamping
  document.getElementById("l14-btn-alpha").onclick = () => {
    log("Setting alpha to 5.0...", "info");
    testBox.alpha = 5.0;
    log(`Resulting alpha: ${testBox.alpha}`, "info");
    log("Setting alpha to -1.0...", "info");
    testBox.alpha = -1.0;
    log(`Resulting alpha: ${testBox.alpha}`, "info");
  };

  // Scale Epsilon
  document.getElementById("l14-btn-scale").onclick = () => {
    log("Setting scale to 0...", "info");
    testBox.scaleX = 0;
    log(`Resulting scaleX: ${testBox.scaleX} (Number.EPSILON)`, "info");
  };

  // Negative Size
  document.getElementById("l14-btn-size").onclick = () => {
    log("Setting width to -50...", "info");
    testBox.width = -50;
    log(`Resulting width: ${testBox.width}`, "info");
  };

  // Performance Hint
  document.getElementById("l14-btn-perf").onclick = () => {
    log("Adding 600 children to 'test-box'...", "info");
    for (let i = 0; i < 600; i++) {
      testBox.addChild(new Element(`c_${i}`));
    }
    log(`Child count: ${testBox.children.length}`, "info");
  };

  // Toggle Cache
  document.getElementById("l14-btn-cache").onclick = () => {
    testBox.cacheAsBitmap = !testBox.cacheAsBitmap;
    log(`test-box.cacheAsBitmap = ${testBox.cacheAsBitmap}`, "info");
  };

  // Stress Test
  document.getElementById("l14-btn-stress").onclick = () => {
    log("Running Stress Test: Creating 10 scenes rapidly...", "info");
    for (let i = 0; i < 10; i++) {
      const div = document.createElement("div");
      const s = new Scene(div, 100, 100);
      // We "leak" them by not calling destroy() and dropping reference immediately
      // In reality, GC won't happen immediately, so the warning won't show yet.
    }
    log("Scenes created and abandoned. Check console later if GC runs.", "info");
  };

  // ── Cleanup ──
  return () => {
    console.warn = originalWarn; // Restore console.warn
    scene.destroy();
  };
}
