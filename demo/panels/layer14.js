export default function (Arena2D) {
  const { Scene, View, Container, Element, Rectangle } = Arena2D;

  let scene = null;
  let view = null;
  const container = document.getElementById('scene-container');
  const logContainer = document.getElementById('debug-logs');

  // ── Log Interceptor ──
  const originalWarn = console.warn;
  console.warn = (...args) => {
    originalWarn.apply(console, args);
    const msg = args.join(' ');
    const entry = document.createElement('div');
    entry.style.borderBottom = '1px solid #222';
    entry.style.padding = '2px 0';
    entry.style.color = msg.includes('Performance') ? '#ffcc00' : '#ff6666';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logContainer.prepend(entry);
    if (logContainer.childNodes.length > 50) {
      logContainer.removeChild(logContainer.lastChild);
    }
  };

  const initScene = () => {
    if (scene) scene.destroy();

    scene = new Scene(container.clientWidth, container.clientHeight);
    view = new View(container, scene);
    scene.root.id = "root";

    // Create a stress-test group
    const stressGroup = new Container("stress-group");
    scene.root.addChild(stressGroup);

    updateStressTest();
  };

  const updateStressTest = () => {
    if (!scene) return;
    const stressGroup = scene.getElementById("stress-group");
    if (!stressGroup) return;

    const count = parseInt(document.getElementById('count-slider').value);
    document.getElementById('count-val').textContent = count;

    while (stressGroup.children.length > count) {
      stressGroup.removeChild(stressGroup.children[stressGroup.children.length - 1]);
    }

    while (stressGroup.children.length < count) {
      const rect = new Rectangle();
      rect.width = 10 + Math.random() * 20;
      rect.height = 10 + Math.random() * 20;
      rect.x = Math.random() * (scene.width - 30);
      rect.y = Math.random() * (scene.height - 30);
      rect.alpha = 0.5 + Math.random() * 0.5;
      rect.fill = `hsl(${Math.random() * 360}, 70%, 60%)`;
      stressGroup.addChild(rect);
    }
  };

  // ── Event Handlers ──

  document.getElementById('debug-on').onclick = () => {
    Arena2D.Arena2D.debug = true;
    document.getElementById('debug-on').classList.add('active');
    document.getElementById('debug-off').classList.remove('active');
    // Trigger a check
    updateStressTest();
  };

  document.getElementById('debug-off').onclick = () => {
    Arena2D.Arena2D.debug = false;
    document.getElementById('debug-on').classList.remove('active');
    document.getElementById('debug-off').classList.add('active');
  };

  document.getElementById('count-slider').oninput = updateStressTest;

  document.getElementById('cache-on').onclick = () => {
    const stressGroup = scene.getElementById("stress-group");
    if (stressGroup) stressGroup.cacheAsBitmap = true;
    document.getElementById('cache-on').classList.add('active');
    document.getElementById('cache-off').classList.remove('active');
  };

  document.getElementById('cache-off').onclick = () => {
    const stressGroup = scene.getElementById("stress-group");
    if (stressGroup) stressGroup.cacheAsBitmap = false;
    document.getElementById('cache-on').classList.remove('active');
    document.getElementById('cache-off').classList.add('active');
  };

  document.getElementById('btn-nan').onclick = () => {
    if (scene.root.children[0]) {
      scene.root.children[0].alpha = NaN;
    }
  };

  document.getElementById('btn-inf').onclick = () => {
    if (scene.root.children[0]) {
      scene.root.children[0].x = Infinity;
    }
  };

  document.getElementById('btn-zero-scale').onclick = () => {
    if (scene.root.children[0]) {
      scene.root.children[0].scaleX = 0;
    }
  };

  document.getElementById('btn-destroy').onclick = () => {
    if (scene) {
      scene.destroy();
      scene = null;
      view = null;
    }
  };

  document.getElementById('btn-reinit').onclick = initScene;

  document.getElementById('clear-logs').onclick = () => {
    logContainer.innerHTML = '<div style="color: #666;">No logs yet...</div>';
  };

  // Initialize
  initScene();

  // Clean up when panel is unloaded
  return () => {
    if (scene) scene.destroy();
    console.warn = originalWarn; // Restore original warn
  };
}
