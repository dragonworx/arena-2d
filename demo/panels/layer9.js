/**
 * Layer 9 — Interaction & Focus System Demo
 *
 * Demonstrates:
 * - Pointer events (click, hover, enter/leave)
 * - Hit-testing with overlapping elements (topmost wins)
 * - Event bubbling with propagation path
 * - Focus management and tab cycling
 * - Cursor management
 * - Keyboard events dispatched to focused element
 */

import("../../dist/canvasui.js").then(async (CanvasUI) => {
  // Load panel HTML
  const response = await fetch("panels/layer9.html");
  document.getElementById("layer-9").innerHTML = await response.text();

  const { Scene, Container, Element } = CanvasUI;

  // ── Setup Scene ──
  const sceneContainer = document.getElementById("l9-scene-container");
  if (!sceneContainer) return;

  const scene = new Scene(sceneContainer, 800, 400);
  scene.ticker.start();

  // Color palette for elements
  const colors = [
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
    "#e67e22",
    "#2980b9",
  ];

  // ── UI References ──
  const eventLog = document.getElementById("l9-event-log");
  const clearLogBtn = document.getElementById("l9-clear-log");
  const focusedSpan = document.getElementById("l9-focused");
  const hoveredSpan = document.getElementById("l9-hovered");
  const tabNextBtn = document.getElementById("l9-tab-next");
  const tabPrevBtn = document.getElementById("l9-tab-prev");
  const lastClickSpan = document.getElementById("l9-last-click");
  const bubblePathSpan = document.getElementById("l9-bubble-path");

  let logCount = 0;
  const MAX_LOG = 100;

  function addLog(msg, color = "#ccc") {
    if (!eventLog) return;
    const line = document.createElement("div");
    line.style.color = color;
    line.style.borderBottom = "1px solid #222";
    line.style.padding = "2px 0";
    line.textContent = `[${++logCount}] ${msg}`;
    eventLog.appendChild(line);
    eventLog.scrollTop = eventLog.scrollHeight;

    // Trim old entries
    while (eventLog.children.length > MAX_LOG) {
      eventLog.removeChild(eventLog.firstChild);
    }
  }

  clearLogBtn?.addEventListener("click", () => {
    if (eventLog) eventLog.innerHTML = "";
    logCount = 0;
  });

  // ── Create Interactive Elements ──

  // Store all elements for rendering
  const allElements = [];

  // Background container (covers whole scene)
  const bg = new Element("background");
  bg.width = 800;
  bg.height = 400;
  bg.interactive = true;
  bg.cursor = "default";
  scene.root.addChild(bg);
  allElements.push({ el: bg, color: "#1a1a2e", label: "background" });

  // Overlapping boxes
  const boxes = [];
  const boxConfigs = [
    {
      id: "box-A",
      x: 40,
      y: 40,
      w: 180,
      h: 140,
      z: 0,
      color: colors[0],
      focusable: true,
      cursor: "pointer",
    },
    {
      id: "box-B",
      x: 180, // Moved right
      y: 80,
      w: 180,
      h: 140,
      z: 1,
      color: colors[1],
      focusable: true,
      cursor: "pointer",
    },
    {
      id: "box-C",
      x: 320, // Moved right significantly
      y: 120,
      w: 90,
      h: 70,
      z: 2,
      color: colors[2],
      focusable: true,
      cursor: "grab",
    },
    {
      id: "box-D",
      x: 550, // Moved right
      y: 40,
      w: 200,
      h: 160,
      z: 0,
      color: colors[3],
      focusable: true,
      cursor: "crosshair",
    },
    {
      id: "box-E",
      x: 600, // Moved right
      y: 150,
      w: 80,
      h: 80,
      z: 1,
      color: colors[4],
      focusable: true,
      cursor: "pointer",
    },
  ];

  // Nested container with children
  const nestedContainer = new Container("nested-group");
  nestedContainer.x = 450; // Moved right
  nestedContainer.y = 250;
  nestedContainer.width = 260;
  nestedContainer.height = 120;
  nestedContainer.interactive = true;
  nestedContainer.cursor = "move";
  scene.root.addChild(nestedContainer);
  allElements.push({
    el: nestedContainer,
    color: "#2c3e50",
    label: "nested-group",
  });

  const nestedChild1 = new Element("nested-1");
  nestedChild1.x = 10;
  nestedChild1.y = 70;
  nestedChild1.width = 50;
  nestedChild1.height = 50;
  nestedChild1.interactive = true;
  nestedChild1.focusable = true;
  nestedChild1.cursor = "pointer";
  nestedContainer.addChild(nestedChild1);

  const nestedChild2 = new Element("nested-2");
  nestedChild2.x = 80;
  nestedChild2.y = 70;
  nestedChild2.width = 50;
  nestedChild2.height = 50;
  nestedChild2.interactive = true;
  nestedChild2.focusable = true;
  nestedChild2.cursor = "pointer";
  nestedContainer.addChild(nestedChild2);

  for (const cfg of boxConfigs) {
    const box = new Element(cfg.id);
    box.x = cfg.x;
    box.y = cfg.y;
    box.width = cfg.w;
    box.height = cfg.h;
    box.zIndex = cfg.z;
    box.interactive = true;
    box.focusable = cfg.focusable;
    box.cursor = cfg.cursor;

    // Make specific boxes draggable
    if (cfg.id === "box-C") {
      box.draggable = true;
      // box.dragConstraint = "x"; // Demo constraint if needed
      addLog(`${cfg.id} is draggable`, "#fff");
    }

    scene.root.addChild(box);
    boxes.push({ el: box, color: cfg.color, label: cfg.id });
    allElements.push({ el: box, color: cfg.color, label: cfg.id });
  }

  // ── Drag & Drop Demo ──

  // 1. Draggable Item
  const dragItem = new Element("drag-me");
  dragItem.x = 50;
  dragItem.y = 300;
  dragItem.width = 80;
  dragItem.height = 80;
  dragItem.interactive = true;
  dragItem.draggable = true;
  dragItem.cursor = "grab";
  scene.root.addChild(dragItem);
  allElements.push({ el: dragItem, color: "#e84393", label: "drag-me" });

  // 2. Drop Zone
  const dropZone = new Element("drop-zone");
  dropZone.x = 200;
  dropZone.y = 300;
  dropZone.width = 120;
  dropZone.height = 120;
  dropZone.interactive = true;
  scene.root.addChild(dropZone);
  allElements.push({ el: dropZone, color: "#2d3436", label: "drop-zone" });

  // 3. X-Axis Constraint Item
  const constraintItem = new Element("drag-x-only");
  constraintItem.x = 350;
  constraintItem.y = 320;
  constraintItem.width = 80;
  constraintItem.height = 60;
  constraintItem.interactive = true;
  constraintItem.draggable = true;
  constraintItem.dragConstraint = "x";
  constraintItem.cursor = "ew-resize";
  scene.root.addChild(constraintItem);
  allElements.push({ el: constraintItem, color: "#0984e3", label: "drag-x" });

  // 4. Unreachable Item (for testing AABB drag)
  // This item is constrained to X axis at Y=100.
  // The drop zone is at Y=300.
  // Dragging this and moving cursor over drop zone should NOT fire dragenter.
  const unreachableItem = new Element("unreachable");
  unreachableItem.x = 500;
  unreachableItem.y = 100;
  unreachableItem.width = 80;
  unreachableItem.height = 60;
  unreachableItem.interactive = true;
  unreachableItem.draggable = true;
  unreachableItem.dragConstraint = "x";
  unreachableItem.cursor = "ew-resize";
  scene.root.addChild(unreachableItem);
  allElements.push({ el: unreachableItem, color: "#636e72", label: "unreachable" });

  // Wire Drag Controls
  const radios = document.querySelectorAll('input[name="drag-constraint"]');
  for (const radio of radios) {
    radio.addEventListener("change", (e) => {
      if (e.target.checked) {
        const val = e.target.value;
        // Target the "drag-me" item instead of box-C
        const target = dragItem;

        if (target) {
          if (val === "none") {
            target.dragConstraint = undefined;
            target.cursor = "grab";
          } else {
            target.dragConstraint = val;
            target.cursor = val === "x" ? "ew-resize" : "ns-resize";
          }
          addLog(`drag-me constraint: ${val}`, "#fff");
        }
      }
    });
  }

  // Wire Drag Events
  const draggables = [
    dragItem,
    constraintItem,
    unreachableItem,
    boxes.find((b) => b.label === "box-C")?.el,
  ].filter(Boolean);

  for (const el of draggables) {
    el.on("dragstart", (e) => {
      addLog(`dragstart → ${el.id}`, "#ff7675");
      el.alpha = 0.8;

      // Boost Z-Index for "drag-me"
      if (el.id === "drag-me") {
        el.originalZIndex = el.zIndex; // Store original
        el.zIndex = 100; // Bring to front
      }

      // Preserve cursor if it's a resize one
      if (el.cursor !== "ew-resize" && el.cursor !== "ns-resize") {
        el.cursor = "grabbing";
      }
    });
    el.on("dragend", (e) => {
      addLog(`dragend → ${el.id}`, "#ff7675");
      el.alpha = 1.0;

      // Restore Z-Index for "drag-me"
      if (el.id === "drag-me" && el.originalZIndex !== undefined) {
        el.zIndex = el.originalZIndex;
        delete el.originalZIndex;
      }

      // Restore cursor based on constraint
      if (el.dragConstraint === "x") el.cursor = "ew-resize";
      else if (el.dragConstraint === "y") el.cursor = "ns-resize";
      else el.cursor = "grab";
    });
    el.on("dragmove", () => {
      // Optional: log or just let it move
    });
  }

  // Wire Drop Zone Events
  dropZone.on("dragenter", (e) => {
    addLog(`dragenter → drop-zone from ${e.currentItem.id}`, "#55efc4");
    // Highlight drop zone
    const visual = allElements.find((i) => i.el === dropZone);
    if (visual) visual.color = "#00b894";
  });

  dropZone.on("dragleave", (e) => {
    addLog("dragleave → drop-zone", "#55efc4");
    const visual = allElements.find((i) => i.el === dropZone);
    if (visual) visual.color = "#2d3436";
  });

  dropZone.on("drop", (e) => {
    addLog(`DROP → ${e.currentItem.id} dropped on drop-zone!`, "#00b894");
    const visual = allElements.find((i) => i.el === dropZone);
    if (visual) visual.color = "#fab1a0"; // Flash color
    setTimeout(() => {
      if (visual) visual.color = "#2d3436";
    }, 500);
  });

  boxes.push({ el: nestedChild1, color: colors[5], label: "nested-1" });
  boxes.push({ el: nestedChild2, color: colors[6], label: "nested-2" });
  allElements.push({ el: nestedChild1, color: colors[5], label: "nested-1" });
  allElements.push({ el: nestedChild2, color: colors[6], label: "nested-2" });

  // ── Wire Interaction Events ──

  const interaction = scene.interaction;

  // Track bubble paths for clicks
  for (const { el, label } of allElements) {
    // Click
    el.on("click", (e) => {
      addLog(
        `click → ${label} (scene: ${e.sceneX?.toFixed(0)},${e.sceneY?.toFixed(0)})`,
        "#e74c3c",
      );
      if (lastClickSpan) lastClickSpan.textContent = label;
    });

    // Pointer down
    el.on("pointerdown", (e) => {
      addLog(`pointerdown → ${label}`, "#f39c12");
    });

    // Pointer up
    el.on("pointerup", (e) => {
      addLog(`pointerup → ${label}`, "#f39c12");
    });

    // Enter/Leave
    el.on("pointerenter", () => {
      addLog(`pointerenter → ${label}`, "#2ecc71");
    });

    el.on("pointerleave", () => {
      addLog(`pointerleave → ${label}`, "#e67e22");
    });

    // Focus/Blur
    el.on("focus", () => {
      addLog(`focus → ${label}`, "#3498db");
    });

    el.on("blur", () => {
      addLog(`blur → ${label}`, "#9b59b6");
    });

    // Keyboard
    el.on("keydown", (e) => {
      addLog(`keydown → ${label}: ${e.key}`, "#1abc9c");
    });
  }

  // Track bubbling by listening on root
  scene.root.on("click", (e) => {
    // Build path from target to root
    const path = [];
    let current = e.target;
    while (current) {
      const found = allElements.find((a) => a.el === current);
      path.push(found ? found.label : current.id);
      current = current.parent;
    }
    if (bubblePathSpan) bubblePathSpan.textContent = path.join(" → ");
  });

  // Tab buttons
  tabNextBtn?.addEventListener("click", () => {
    interaction.tabNext();
  });

  tabPrevBtn?.addEventListener("click", () => {
    interaction.tabPrev();
  });

  // ── Custom Paint ──
  // Override paint for each element to draw colored rectangles

  // ── Custom Paint ──
  // Override paint for each element to draw colored rectangles

  const focusedElements = new Set();

  for (const item of allElements) {
    const { el, label } = item;
    el.paint = (ctx) => {
      const isFocused = interaction.focusedElement === el;
      const isHovered = interaction.hoveredElement === el;

      // Draw fill - use dynamic color from item
      ctx.drawRect(0, 0, el.width, el.height, item.color);

      // Hover highlight - SKIP FOR DROP ZONE
      if (isHovered && label !== "drop-zone") {
        ctx.drawRect(0, 0, el.width, el.height, "rgba(255,255,255,0.15)");
      }

      // Focus ring
      if (isFocused) {
        ctx.raw.strokeStyle = "#fff";
        ctx.raw.lineWidth = 3;
        ctx.raw.setLineDash([6, 3]);
        ctx.raw.strokeRect(2, 2, el.width - 4, el.height - 4);
        ctx.raw.setLineDash([]);
      }

      // Label
      ctx.raw.fillStyle = "#fff";
      ctx.raw.font = "bold 12px monospace";
      ctx.raw.textBaseline = "top";
      ctx.raw.fillText(label, 8, 8);

      // Show cursor type
      if (el.cursor !== "default") {
        ctx.raw.font = "10px monospace";
        ctx.raw.fillStyle = "rgba(255,255,255,0.6)";
        ctx.raw.fillText(`cursor: ${el.cursor}`, 8, 24);
      }

      // Show zIndex
      ctx.raw.font = "10px monospace";
      ctx.raw.fillStyle = "rgba(255,255,255,0.4)";
      ctx.raw.fillText(`z: ${el.zIndex}`, 8, el.height - 16);
    };
  }

  // ── Status Polling ──
  // Update focus/hover indicators each frame
  const originalRender = scene.render.bind(scene);
  const origRenderCallback = scene.ticker._renderCallback;

  scene.ticker.setRenderCallback(() => {
    originalRender();

    // Update status UI
    if (focusedSpan) {
      const focused = interaction.focusedElement;
      const found = focused ? allElements.find((a) => a.el === focused) : null;
      focusedSpan.textContent = found
        ? found.label
        : focused
          ? focused.id
          : "none";
    }
    if (hoveredSpan) {
      const hovered = interaction.hoveredElement;
      const found = hovered ? allElements.find((a) => a.el === hovered) : null;
      hoveredSpan.textContent = found
        ? found.label
        : hovered
          ? hovered.id
          : "none";
    }
  });

  addLog(
    "Interaction system ready. Click, hover, and tab through elements.",
    "#6ecf6e",
  );
});
