export default async function (Arena2D, { signal }) {
  const { Container, Element, DirtyFlags, resolvePointerPosition } = Arena2D;
  // ── Inject HTML panel ──

  // ── Palette ──
  const COLORS = [
    "#7c7cf5",
    "#f57c7c",
    "#7cf5a0",
    "#f5c87c",
    "#7cdaf5",
    "#d47cf5",
    "#f5f07c",
    "#7cf5e0",
  ];
  let colorIdx = 0;
  function nextColor() {
    return COLORS[colorIdx++ % COLORS.length];
  }

  // ── State ──
  const canvas = document.getElementById("layer4-canvas");
  const ctx = canvas.getContext("2d");
  const root = new Container("root");
  root.x = 20;
  root.y = 20;

  // Visual metadata (color, label) stored per-element
  const meta = new WeakMap();
  meta.set(root, { color: "#333", label: "root" });

  // Set size on element directly for hit testing
  root.width = 360;
  root.height = 280;

  let selected = root;
  let childCounter = 0;

  // ── DOM refs ──
  const treeView = document.getElementById("tree-view");
  const selName = document.getElementById("sel-name");

  // Transform inputs
  const selX = document.getElementById("sel-x");
  const selXVal = document.getElementById("sel-x-val");
  const selY = document.getElementById("sel-y");
  const selYVal = document.getElementById("sel-y-val");
  const selPX = document.getElementById("sel-px");
  const selPXVal = document.getElementById("sel-px-val");
  const selPY = document.getElementById("sel-py");
  const selPYVal = document.getElementById("sel-py-val");
  const selSX = document.getElementById("sel-sx");
  const selSXVal = document.getElementById("sel-sx-val");
  const selSY = document.getElementById("sel-sy");
  const selSYVal = document.getElementById("sel-sy-val");
  const selR = document.getElementById("sel-r");
  const selRVal = document.getElementById("sel-r-val");
  const selSkX = document.getElementById("sel-skx");
  const selSkXVal = document.getElementById("sel-skx-val");
  const selSkY = document.getElementById("sel-sky");
  const selSkYVal = document.getElementById("sel-sky-val");

  // Other props
  const selZ = document.getElementById("sel-z");
  const selZVal = document.getElementById("sel-z-val");
  const selAlpha = document.getElementById("sel-alpha");
  const selAlphaVal = document.getElementById("sel-alpha-val");

  const log = document.getElementById("event-log");

  // ── Logging ──

  function logEvent(msg) {
    const ts = new Date().toLocaleTimeString("en-AU", { hour12: false });
    log.textContent += `[${ts}] ${msg}\n`;
    log.scrollTop = log.scrollHeight;
  }

  // ── Canvas Interaction ──

  canvas.addEventListener("mousedown", (e) => {
    // Use core helper to get correct coordinates
    const { x, y } = resolvePointerPosition(e, canvas);

    // Use core hit test (recursive)
    const hit = root.hitTest(x, y);

    if (hit) {
      selectElement(hit);
      logEvent(`Clicked ${hit.id} @ ${Math.round(x)},${Math.round(y)}`);
    } else {
      // Optional: Deselect if clicking empty space?
    }
  }, { signal });

  // ── Create child ──

  function createChild(parentContainer) {
    childCounter++;
    const isContainer = Math.random() > 0.4;
    const child = isContainer
      ? new Container(`c${childCounter}`)
      : new Element(`e${childCounter}`);

    // Set layout (manual)
    const pm = parentContainer;
    const w = isContainer ? 60 + Math.random() * 40 : 30 + Math.random() * 20;
    const h = isContainer ? 50 + Math.random() * 30 : 25 + Math.random() * 15;

    child.width = w;
    child.height = h;

    child.x = Math.floor(
      Math.random() * Math.max(10, (pm.width || 100) - w - 10),
    );
    child.y = Math.floor(
      Math.random() * Math.max(10, (pm.height || 80) - h - 10),
    );

    meta.set(child, { color: nextColor(), label: child.id });
    parentContainer.addChild(child);
    logEvent(`Added ${child.id} to ${parentContainer.id}`);
    return child;
  }

  // ── Selection ──

  function selectElement(el) {
    selected = el;
    if (el) {
      selName.textContent = el.id;

      // Transform
      selX.value = el.x;
      selXVal.textContent = Math.round(el.x);
      selY.value = el.y;
      selYVal.textContent = Math.round(el.y);
      selPX.value = el.pivotX;
      selPXVal.textContent = Math.round(el.pivotX);
      selPY.value = el.pivotY;
      selPYVal.textContent = Math.round(el.pivotY);
      selSX.value = el.scaleX;
      selSXVal.textContent = el.scaleX.toFixed(1);
      selSY.value = el.scaleY;
      selSYVal.textContent = el.scaleY.toFixed(1);

      const deg = Math.round(el.rotation * (180 / Math.PI));
      selR.value = deg;
      selRVal.textContent = `${deg}°`;

      selSkX.value = el.skewX;
      selSkXVal.textContent = el.skewX.toFixed(2);
      selSkY.value = el.skewY;
      selSkYVal.textContent = el.skewY.toFixed(2);

      // Props
      selZ.value = el.zIndex;
      selZVal.textContent = el.zIndex;
      selAlpha.value = Math.round(el.alpha * 100);
      selAlphaVal.textContent = el.alpha.toFixed(2);
    } else {
      selName.textContent = "(none)";
    }

    updateTree();
    render();
  }

  // ── Tree view ──

  function updateTree() {
    let html = "";
    function walk(node, depth) {
      const m = meta.get(node);
      const indent = "\u00a0\u00a0".repeat(depth);
      const icon = node instanceof Container ? "📦" : "🟦";
      const sel =
        node === selected ? " style='color:#7c7cf5; font-weight:bold;'" : "";
      const label = m?.label || node.id;
      html += `<div${sel} data-id="${node.id}" class="tree-node" style="cursor:pointer; padding:1px 0;">${indent}${icon} ${label} <span style="color:#666;">(z:${node.zIndex})</span></div>`;
      if (node instanceof Container) {
        for (const child of node.children) {
          walk(child, depth + 1);
        }
      }
    }
    walk(root, 0);
    treeView.innerHTML = html;

    for (const node of treeView.querySelectorAll(".tree-node")) {
      node.addEventListener("click", () => {
        const id = node.dataset.id;
        const el = findById(root, id);
        if (el) selectElement(el);
      });
    }
  }

  function findById(node, id) {
    if (node.id === id) return node;
    if (node instanceof Container) {
      for (const child of node.children) {
        const found = findById(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  // ── Rendering ──

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    root.update(0);
    renderNode(root, 0, 0, 1);

    // Debug: Draw pivot point for selected element
    if (selected?.visible) {
      drawPivot(selected);
    }
  }

  function drawPivot(node) {
    const m = meta.get(node); // Need meta for compatibility? No, pivot only depends on node
    ctx.save();
    const mat = node.worldMatrix;
    ctx.setTransform(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5]);

    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(node.pivotX - 5, node.pivotY);
    ctx.lineTo(node.pivotX + 5, node.pivotY);
    ctx.moveTo(node.pivotX, node.pivotY - 5);
    ctx.lineTo(node.pivotX, node.pivotY + 5);
    ctx.stroke();
    ctx.restore();
  }

  function renderNode(node, parentAbsX, parentAbsY, parentAlpha) {
    const m = meta.get(node);
    if (!m || !node.visible) return;

    ctx.save();
    const mat = node.worldMatrix;
    ctx.setTransform(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5]);

    const alpha = parentAlpha * node.alpha;
    ctx.globalAlpha = alpha;

    ctx.fillStyle = node === selected ? "#4a4ae8" : m.color;
    ctx.fillRect(0, 0, node.width, node.height);

    ctx.strokeStyle = node === selected ? "#fff" : "rgba(255,255,255,0.15)";
    ctx.lineWidth = node === selected ? 2 : 1;
    ctx.strokeRect(0, 0, node.width, node.height);

    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.fillText(m.label, 4, 12);

    ctx.restore();

    if (node instanceof Container) {
      for (const child of node.children) {
        renderNode(child, 0, 0, alpha);
      }
    }
  }

  // ── Button handlers ──

  document.getElementById("btn-add-child").addEventListener("click", () => {
    if (!(selected instanceof Container)) return;
    const child = createChild(selected);
    selectElement(child);
  }, { signal });

  document.getElementById("btn-remove-child").addEventListener("click", () => {
    if (selected === root) return;
    const parent = selected.parent;
    if (parent instanceof Container) {
      parent.removeChild(selected);
      selectElement(parent);
    }
  }, { signal });

  document.getElementById("btn-sort").addEventListener("click", () => {
    if (selected instanceof Container) {
      selected.sortChildren();
      updateTree();
      render();
    }
  }, { signal });

  document.getElementById("btn-reparent").addEventListener("click", () => {
    if (selected === root) return;
    const grandparent =
      selected.parent?.parent instanceof Container
        ? selected.parent.parent
        : root;
    if (grandparent === selected.parent) return;
    const oldParent = selected.parent;
    grandparent.addChild(selected);
    logEvent(`Re-parented ${selected.id}`);
    updateTree();
    render();
  }, { signal });

  document.getElementById("btn-deselect").addEventListener("click", () => {
    selected = null;
    selectElement(null);
    logEvent("Deselected");
  }, { signal });

  // ── Property Listeners ──

  function addListener(
    el,
    prop,
    valElem,
    isAngle = false,
    isScale = false,
    isAlpha = false,
  ) {
    if (!el) return;
    el.addEventListener("input", () => {
      if (!selected) return;
      const v = Number(el.value);
      if (isAngle) {
        selected[prop] = v * (Math.PI / 180);
        valElem.textContent = `${v}°`;
      } else if (isAlpha) {
        selected[prop] = v / 100;
        valElem.textContent = selected[prop].toFixed(2);
      } else {
        selected[prop] = v;
        valElem.textContent = isScale
          ? v.toFixed(1)
          : Number.isInteger(v)
            ? v
            : v.toFixed(2);
      }
      render();
    }, { signal });
  }

  addListener(selX, "x", selXVal);
  addListener(selY, "y", selYVal);
  addListener(selPX, "pivotX", selPXVal);
  addListener(selPY, "pivotY", selPYVal);
  addListener(selSX, "scaleX", selSXVal, false, true);
  addListener(selSY, "scaleY", selSYVal, false, true);
  addListener(selR, "rotation", selRVal, true);
  addListener(selSkX, "skewX", selSkXVal);
  addListener(selSkY, "skewY", selSkYVal);
  addListener(selZ, "zIndex", selZVal);
  addListener(selAlpha, "alpha", selAlphaVal, false, false, true);

  document.getElementById("btn-clear-log").addEventListener("click", () => {
    log.textContent = "";
  }, { signal });

  // ── Initial scene setup ──

  const containerA = new Container("panel-a");
  containerA.x = 20;
  containerA.y = 30;
  containerA.width = 150;
  containerA.height = 120;
  meta.set(containerA, { color: "#7c7cf5", label: "panel-a" });
  root.addChild(containerA);

  const containerB = new Container("panel-b");
  containerB.x = 190;
  containerB.y = 40;
  containerB.rotation = 0.1;
  containerB.width = 150;
  containerB.height = 120;
  meta.set(containerB, { color: "#f57c7c", label: "panel-b" });
  root.addChild(containerB);

  for (let i = 0; i < 3; i++) {
    const el = new Element(`item-${i + 1}`);
    // Overlap them significantly: x=10, 30, 50. w=40.
    el.x = 10 + i * 20;
    el.y = 25 + i * 15;
    el.width = 40;
    el.height = 40;
    meta.set(el, {
      color: COLORS[(i + 2) % COLORS.length],
      label: `item-${i + 1}`,
    });
    containerA.addChild(el);
  }

  const nested = new Container("nested");
  nested.x = 10;
  nested.y = 65;
  nested.width = 130;
  nested.height = 45;
  meta.set(nested, { color: "#7cf5e0", label: "nested" });
  containerA.addChild(nested);

  const deepEl = new Element("deep");
  deepEl.x = 10;
  deepEl.y = 10;
  deepEl.width = 40;
  deepEl.height = 25;
  meta.set(deepEl, { color: "#d47cf5", label: "deep" });
  nested.addChild(deepEl);

  root.update(0);
  root._dirtyFlags = DirtyFlags.None;

  selectElement(root);
  logEvent("Refinements: Core Hit Test + Pointer Logic");

  return root;
}
