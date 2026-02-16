/**
 * Layer 8 — Layout Engine (Flex & Anchor) Demo
 *
 * Demonstrates:
 * - Flex layout with row/column direction
 * - Justify content, align items
 * - Flex grow/shrink
 * - Gap, padding, margin
 * - Anchor positioning with stretching
 * - Resizable containers
 * - Interactive controls
 */

import("../../dist/canvasui.js").then(async (CanvasUI) => {
  // Load panel HTML
  const response = await fetch("panels/layer8.html");
  document.getElementById("layer-8").innerHTML = await response.text();

  const { Container, Element, resolveLayout, getLayoutData } = CanvasUI;

  // ── Flex Demo ──

  const canvas = document.getElementById("l8-layout-canvas");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  // Container size controls
  const ctrlCW = document.getElementById("l8-ctrl-cw");
  const ctrlCH = document.getElementById("l8-ctrl-ch");
  const statSize = document.getElementById("l8-stat-size");

  // Controls
  const ctrlDisplay = document.getElementById("l8-ctrl-display");
  const ctrlDirection = document.getElementById("l8-ctrl-direction");
  const ctrlJustify = document.getElementById("l8-ctrl-justify");
  const ctrlAlign = document.getElementById("l8-ctrl-align");
  const ctrlWrap = document.getElementById("l8-ctrl-wrap");
  const ctrlGap = document.getElementById("l8-ctrl-gap");
  const ctrlPadding = document.getElementById("l8-ctrl-padding");
  const ctrlMargin = document.getElementById("l8-ctrl-margin");
  const ctrlGrow = document.getElementById("l8-ctrl-grow");
  const ctrlShrink = document.getElementById("l8-ctrl-shrink");
  const ctrlWidth = document.getElementById("l8-ctrl-width");
  const ctrlHeight = document.getElementById("l8-ctrl-height");
  const btnAdd = document.getElementById("l8-btn-add");
  const btnRemove = document.getElementById("l8-btn-remove");
  const btnReset = document.getElementById("l8-btn-reset");
  const showPadding = document.getElementById("l8-ctrl-show-padding");
  const showMargins = document.getElementById("l8-ctrl-show-margins");
  const childInfo = document.getElementById("l8-child-info");
  const statTime = document.getElementById("l8-stat-time");
  const statChildren = document.getElementById("l8-stat-children");

  // State
  const COLORS = [
    "#ff6b6b",
    "#feca57",
    "#48dbfb",
    "#ff9ff3",
    "#54a0ff",
    "#5f27cd",
    "#01a3a4",
    "#f368e0",
    "#ff6348",
    "#7bed9f",
  ];
  let selectedIndex = -1;

  // Create root flex container
  const root = new Container("layout-root");
  root.updateStyle({
    display: "flex",
    flexDirection: "row",
    justifyContent: "start",
    alignItems: "start",
    gap: 8,
    padding: [10, 10, 10, 10],
  });

  // Child data (for rendering)
  const childMeta = [];

  function getContainerWidth() {
    return Number(ctrlCW.value);
  }

  function getContainerHeight() {
    return Number(ctrlCH.value);
  }

  function resizeCanvas() {
    const cw = getContainerWidth();
    const ch = getContainerHeight();
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    root.width = cw;
    root.height = ch;
    statSize.textContent = `${cw}x${ch}`;
  }

  function addChild() {
    const el = new Element();
    el.width = 60;
    el.height = 40;
    el.updateStyle({
      display: "flex",
      width: 60,
      height: 40,
      flexGrow: 0,
      flexShrink: 1,
    });
    root.addChild(el);
    childMeta.push({ color: COLORS[childMeta.length % COLORS.length] });
    render();
  }

  function removeSelectedChild() {
    if (root.children.length === 0) return;

    if (selectedIndex >= 0 && selectedIndex < root.children.length) {
      // Remove specific child
      root.removeChild(root.children[selectedIndex]);
      childMeta.splice(selectedIndex, 1);
      selectedIndex = -1;
      childInfo.textContent = "Click a box to select";
    } else {
      // Remove last child if none selected
      const lastIndex = root.children.length - 1;
      root.removeChild(root.children[lastIndex]);
      childMeta.pop();
    }
    render();
  }

  function resetLayout() {
    while (root.children.length > 0) {
      root.removeChild(root.children[0]);
    }
    childMeta.length = 0;
    selectedIndex = -1;
    childInfo.textContent = "Click a box to select";
    for (let i = 0; i < 5; i++) addChild();
  }

  function render() {
    const cw = getContainerWidth();
    const ch = getContainerHeight();

    resizeCanvas();

    const t0 = performance.now();
    root.updateStyle({
      display: ctrlDisplay.value,
      flexDirection: ctrlDirection.value,
      justifyContent: ctrlJustify.value,
      alignItems: ctrlAlign.value,
      flexWrap: ctrlWrap.value,
      gap: Number(ctrlGap.value),
      padding: [
        Number(ctrlPadding.value),
        Number(ctrlPadding.value),
        Number(ctrlPadding.value),
        Number(ctrlPadding.value),
      ],
    });

    const margin = Number(ctrlMargin.value);
    for (const child of root.children) {
      child.updateStyle({
        margin: [margin, margin, margin, margin],
      });
    }

    resolveLayout(root);
    const elapsed = performance.now() - t0;
    statTime.textContent = elapsed.toFixed(2);
    statChildren.textContent = root.children.length;

    // Draw
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const pad = Number(ctrlPadding.value);

    // Draw padding overlay
    if (showPadding.checked && pad > 0) {
      ctx.fillStyle = "rgba(72, 219, 251, 0.15)";
      ctx.fillRect(0, 0, cw, pad); // top
      ctx.fillRect(0, ch - pad, cw, pad); // bottom
      ctx.fillRect(0, pad, pad, ch - pad * 2); // left
      ctx.fillRect(cw - pad, pad, pad, ch - pad * 2); // right
    }

    // Draw container border
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(pad, pad, cw - pad * 2, ch - pad * 2);
    ctx.setLineDash([]);

    // Draw children
    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i];
      const ld = getLayoutData(child);
      const meta = childMeta[i];
      const x = ld.computedX;
      const y = ld.computedY;
      const w = ld.computedWidth;
      const h = ld.computedHeight;

      // Margin overlay
      if (showMargins.checked) {
        const m = child.style.margin;
        ctx.fillStyle = "rgba(255, 159, 67, 0.2)";
        ctx.fillRect(x - m[3], y - m[0], w + m[1] + m[3], m[0]); // top
        ctx.fillRect(x - m[3], y + h, w + m[1] + m[3], m[2]); // bottom
        ctx.fillRect(x - m[3], y, m[3], h); // left
        ctx.fillRect(x + w, y, m[1], h); // right
      }

      // Box
      ctx.fillStyle = meta.color;
      ctx.globalAlpha = i === selectedIndex ? 1 : 0.8;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Selection outline
      if (i === selectedIndex) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
      }

      // Label
      ctx.fillStyle = "#000";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${i}`, x + w / 2, y + h / 2);
    }
  }

  // ── Click handling ──
  canvas.addEventListener("click", (e) => {
    const cw = getContainerWidth();
    const ch = getContainerHeight();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (cw / rect.width);
    const my = (e.clientY - rect.top) * (ch / rect.height);

    selectedIndex = -1;
    for (let i = root.children.length - 1; i >= 0; i--) {
      const ld = getLayoutData(root.children[i]);
      if (
        mx >= ld.computedX &&
        mx <= ld.computedX + ld.computedWidth &&
        my >= ld.computedY &&
        my <= ld.computedY + ld.computedHeight
      ) {
        selectedIndex = i;
        break;
      }
    }

    if (selectedIndex >= 0) {
      const child = root.children[selectedIndex];
      childInfo.textContent = `Child #${selectedIndex}`;
      ctrlGrow.value = child.style.flexGrow;
      ctrlShrink.value = child.style.flexShrink;
      ctrlWidth.value = child.width;
      ctrlHeight.value = child.height;
      document.getElementById("l8-grow-val").textContent = child.style.flexGrow;
      document.getElementById("l8-shrink-val").textContent =
        child.style.flexShrink;
      document.getElementById("l8-width-val").textContent = child.width;
      document.getElementById("l8-height-val").textContent = child.height;
    } else {
      childInfo.textContent = "Click a box to select";
    }
    render();
  });

  // ── Control event handlers ──
  for (const el of [
    ctrlDisplay,
    ctrlDirection,
    ctrlJustify,
    ctrlAlign,
    ctrlWrap,
  ]) {
    el.addEventListener("change", () => render());
  }

  ctrlCW.addEventListener("input", () => {
    document.getElementById("l8-cw-val").textContent = ctrlCW.value;
    render();
  });

  ctrlCH.addEventListener("input", () => {
    document.getElementById("l8-ch-val").textContent = ctrlCH.value;
    render();
  });

  ctrlGap.addEventListener("input", () => {
    document.getElementById("l8-gap-val").textContent = ctrlGap.value;
    render();
  });

  ctrlPadding.addEventListener("input", () => {
    document.getElementById("l8-padding-val").textContent = ctrlPadding.value;
    render();
  });

  ctrlMargin.addEventListener("input", () => {
    document.getElementById("l8-margin-val").textContent = ctrlMargin.value;
    render();
  });

  ctrlGrow.addEventListener("input", () => {
    document.getElementById("l8-grow-val").textContent = ctrlGrow.value;
    if (selectedIndex >= 0) {
      root.children[selectedIndex].updateStyle({
        flexGrow: Number(ctrlGrow.value),
      });
      render();
    }
  });

  ctrlShrink.addEventListener("input", () => {
    document.getElementById("l8-shrink-val").textContent = ctrlShrink.value;
    if (selectedIndex >= 0) {
      root.children[selectedIndex].updateStyle({
        flexShrink: Number(ctrlShrink.value),
      });
      render();
    }
  });

  ctrlWidth.addEventListener("input", () => {
    document.getElementById("l8-width-val").textContent = ctrlWidth.value;
    if (selectedIndex >= 0) {
      const child = root.children[selectedIndex];
      child.width = Number(ctrlWidth.value);
      child.updateStyle({ width: Number(ctrlWidth.value) });
      render();
    }
  });

  ctrlHeight.addEventListener("input", () => {
    document.getElementById("l8-height-val").textContent = ctrlHeight.value;
    if (selectedIndex >= 0) {
      const child = root.children[selectedIndex];
      child.height = Number(ctrlHeight.value);
      child.updateStyle({ height: Number(ctrlHeight.value) });
      render();
    }
  });

  for (const el of [showPadding, showMargins]) {
    el.addEventListener("change", render);
  }

  btnAdd.addEventListener("click", addChild);
  btnRemove.addEventListener("click", removeSelectedChild);
  btnReset.addEventListener("click", resetLayout);

  // Initial setup
  resizeCanvas();
  resetLayout();

  // ── Anchor Demo ──

  const anchorCanvas = document.getElementById("l8-anchor-canvas");
  const actx = anchorCanvas.getContext("2d");
  const ctrlAW = document.getElementById("l8-ctrl-aw");
  const ctrlAH = document.getElementById("l8-ctrl-ah");

  const anchorRoot = new Container("anchor-root");
  anchorRoot.updateStyle({ display: "flex" });

  // Top-left anchored element
  const topLeft = new Element("top-left");
  topLeft.width = 80;
  topLeft.height = 60;
  topLeft.updateStyle({
    display: "anchor",
    top: 15,
    left: 15,
    width: 80,
    height: 60,
  });
  anchorRoot.addChild(topLeft);

  // Top-right anchored element
  const topRight = new Element("top-right");
  topRight.width = 80;
  topRight.height = 60;
  topRight.updateStyle({
    display: "anchor",
    top: 15,
    right: 15,
    width: 80,
    height: 60,
  });
  anchorRoot.addChild(topRight);

  // Bottom-left anchored element
  const bottomLeft = new Element("bottom-left");
  bottomLeft.width = 80;
  bottomLeft.height = 60;
  bottomLeft.updateStyle({
    display: "anchor",
    bottom: 15,
    left: 15,
    width: 80,
    height: 60,
  });
  anchorRoot.addChild(bottomLeft);

  // Stretch horizontal (top, left+right)
  const stretchH = new Element("stretch-h");
  stretchH.updateStyle({
    display: "anchor",
    top: 90,
    left: 15,
    right: 15,
    height: 40,
  });
  anchorRoot.addChild(stretchH);

  // Stretch both (all four anchors)
  const stretchBoth = new Element("stretch-both");
  stretchBoth.updateStyle({
    display: "anchor",
    top: 145,
    left: 120,
    right: 120,
    bottom: 15,
  });
  anchorRoot.addChild(stretchBoth);

  // Bottom-right anchored element
  const bottomRight = new Element("bottom-right");
  bottomRight.width = 60;
  bottomRight.height = 40;
  bottomRight.updateStyle({
    display: "anchor",
    bottom: 20,
    right: 15,
    width: 60,
    height: 40,
  });
  anchorRoot.addChild(bottomRight);

  const anchorElements = [
    { el: topLeft, color: "#ff6b6b", label: "top:15\nleft:15" },
    { el: topRight, color: "#feca57", label: "top:15\nright:15" },
    { el: bottomLeft, color: "#48dbfb", label: "bottom:15\nleft:15" },
    { el: stretchH, color: "#ff9ff3", label: "stretch: L:15 R:15" },
    { el: stretchBoth, color: "#54a0ff", label: "stretch all" },
    { el: bottomRight, color: "#7bed9f", label: "bottom:20\nright:15" },
  ];

  function renderAnchor() {
    const aw = Number(ctrlAW.value);
    const ah = Number(ctrlAH.value);

    anchorCanvas.width = aw * dpr;
    anchorCanvas.height = ah * dpr;
    anchorCanvas.style.width = `${aw}px`;
    anchorCanvas.style.height = `${ah}px`;

    anchorRoot.width = aw;
    anchorRoot.height = ah;
    resolveLayout(anchorRoot);

    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    actx.clearRect(0, 0, aw, ah);

    // Container border
    actx.strokeStyle = "#555";
    actx.lineWidth = 1;
    actx.setLineDash([4, 4]);
    actx.strokeRect(0.5, 0.5, aw - 1, ah - 1);
    actx.setLineDash([]);

    for (const { el, color, label } of anchorElements) {
      const ld = getLayoutData(el);
      const x = ld.computedX;
      const y = ld.computedY;
      const w = ld.computedWidth;
      const h = ld.computedHeight;

      actx.fillStyle = color;
      actx.globalAlpha = 0.8;
      actx.beginPath();
      actx.roundRect(x, y, w, h, 4);
      actx.fill();
      actx.globalAlpha = 1;

      // Label
      actx.fillStyle = "#000";
      actx.font = "10px monospace";
      actx.textAlign = "center";
      actx.textBaseline = "middle";
      const lines = label.split("\n");
      for (let i = 0; i < lines.length; i++) {
        actx.fillText(
          lines[i],
          x + w / 2,
          y + h / 2 + (i - (lines.length - 1) / 2) * 12,
        );
      }
    }
  }

  ctrlAW.addEventListener("input", () => {
    document.getElementById("l8-aw-val").textContent = ctrlAW.value;
    renderAnchor();
  });

  ctrlAH.addEventListener("input", () => {
    document.getElementById("l8-ah-val").textContent = ctrlAH.value;
    renderAnchor();
  });

  renderAnchor();
});
