export default async function (Arena2D) {
  const { Scene, Element } = Arena2D;

  const container = document.getElementById("l9_1-scene-container");
  if (!container) return;

  const countSelect = document.getElementById("l9_1-count");
  const resetBtn = document.getElementById("l9_1-reset");
  const statusEl = document.getElementById("l9_1-status");

  let isolatedElement = null;
  let pointerPos = { x: 0, y: 0 };

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;

  const scene = new Scene(container, width, height);
  scene.ticker.start();

  container.addEventListener("pointermove", (e) => {
    const rect = container.getBoundingClientRect();
    pointerPos.x = e.clientX - rect.left;
    pointerPos.y = e.clientY - rect.top;
  });

  const updater = new Element("updater");
  updater.update = (dt) => {
    if (isolatedElement) {
      // Calculate distance from center of element to pointer
      const dx = pointerPos.x - (isolatedElement.x + isolatedElement.width / 2);
      const dy = pointerPos.y - (isolatedElement.y + isolatedElement.height / 2);

      // Move towards pointer; speed is proportional to distance
      const stiffness = 4.0;
      isolatedElement.x += dx * stiffness * dt;
      isolatedElement.y += dy * stiffness * dt;
    }
  };
  scene.ticker.add(updater);

  const colors = [
    "#e74c3c", "#3498db", "#2ecc71", "#f39c12",
    "#9b59b6", "#1abc9c", "#e67e22", "#2980b9"
  ];

  // Colors mapping for performance
  const tintColorMap = new Map();
  const activeColorMap = new Map();

  colors.forEach(base => {
    // Generate lighter version for hover
    const hover = lightenColor(base, 40);
    tintColorMap.set(base, hover);
    // Generate darker version for active (press)
    const active = darkenColor(base, 20);
    activeColorMap.set(base, active);
  });

  function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = (num >> 8 & 0x00FF) + amt,
      B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R > 0 ? R : 0) * 0x10000 + (G > 0 ? G : 0) * 0x100 + (B > 0 ? B : 0)).toString(16).slice(1);
  }

  // Pre-bind event handlers to save memory (avoiding per-element closures)
  function handlePointerEnter(e) {
    e.target.isHovered = true;
  }
  function handlePointerLeave(e) {
    e.target.isHovered = false;
    e.target.isPressed = false;
  }
  function handlePointerDown(e) {
    e.target.isPressed = true;

    if (!isolatedElement) {
      isolatedElement = e.target;

      // Make all other elements grey and non-interactive
      scene.root.children.forEach(el => {
        if (el !== isolatedElement) {
          el.interactive = false;
          el.cursor = "default";
          const shade = Math.floor(Math.random() * 100 + 50); // random shade 50 to 150
          const hex = shade.toString(16).padStart(2, '0');
          el.baseColor = `#${hex}${hex}${hex}`;
        }
      });
    }
  }
  function handlePointerUp(e) {
    e.target.isPressed = false;
  }

  // Single shared paint function
  function sharedPaint(ctx) {
    let drawColor = this.baseColor;
    if (this.isPressed) {
      drawColor = activeColorMap.get(this.baseColor) || this.baseColor;
    } else if (this.isHovered) {
      drawColor = tintColorMap.get(this.baseColor) || this.baseColor;
    }
    ctx.drawRect(0, 0, this.width, this.height, drawColor);
  }

  function generateScene() {
    isolatedElement = null; // reset isolated element when regenerating scene
    const count = parseInt(countSelect.value, 10);
    if (statusEl) statusEl.textContent = `Generating ${count.toLocaleString()} elements...`;
    statusEl.style.color = "#f39c12";

    // Use a small timeout to allow UI to update before locking the thread
    setTimeout(() => {
      const startTime = performance.now();

      // Clear existing
      scene.root.children.forEach(c => {
        c.off("pointerenter", handlePointerEnter);
        c.off("pointerleave", handlePointerLeave);
        c.off("pointerdown", handlePointerDown);
        c.off("pointerup", handlePointerUp);
      });
      scene.root.children.length = 0; // fast clear
      // Reset interaction system entries if possible, Arena2D handles this on next tick typically
      // or we just remove children and they get garbage collected.

      for (let i = 0; i < count; i++) {
        const el = new Element(`box-${i}`);
        el.x = Math.random() * width;
        el.y = Math.random() * height;
        // Keep sizes reasonable so they don't cover everything
        el.width = 10 + Math.random() * 40;
        el.height = 10 + Math.random() * 40;

        el.baseColor = colors[Math.floor(Math.random() * colors.length)];
        el.isHovered = false;
        el.isPressed = false;

        el.interactive = true;
        el.cursor = "pointer";

        // Assign shared listeners
        el.on("pointerenter", handlePointerEnter);
        el.on("pointerleave", handlePointerLeave);
        el.on("pointerdown", handlePointerDown);
        el.on("pointerup", handlePointerUp);

        // Assign shared paint
        el.paint = sharedPaint;

        scene.root.addChild(el);
      }

      const elapsed = performance.now() - startTime;
      if (statusEl) {
        statusEl.textContent = `Generated ${count.toLocaleString()} elements in ${elapsed.toFixed(0)}ms.`;
        statusEl.style.color = "#2ecc71";
      }
    }, 10);
  }

  resetBtn?.addEventListener("click", generateScene);

  // Initial generation
  generateScene();
}
