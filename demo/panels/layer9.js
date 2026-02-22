export default async function (Arena2D, { signal }) {
  const { Scene, View, Container, Element } = Arena2D;

  // ── Setup Scene ──
  const clearLogBtn = document.getElementById("l9-clear-log");
  const quadToggle = document.getElementById("l9-quad-toggle");
  const tabNextBtn = document.getElementById("l9-tab-next");
  const tabPrevBtn = document.getElementById("l9-tab-prev");
  const ctrlX = document.getElementById("l9-ctrl-x");
  const ctrlY = document.getElementById("l9-ctrl-y");
  const ctrlW = document.getElementById("l9-ctrl-w");
  const ctrlH = document.getElementById("l9-ctrl-h");
  const ctrlR = document.getElementById("l9-ctrl-r");
  const sceneContainer = document.getElementById("l9-scene-container");
  if (!sceneContainer) return;

  const scene = new Scene(400, 200);
  const view = new View(sceneContainer, scene);
  view.resize(400, 200);
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
  const focusedSpan = document.getElementById("l9-focused");
  const hoveredSpan = document.getElementById("l9-hovered");
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
  }, { signal });

  const radios = document.querySelectorAll('input[name="drag-constraint"]');
  for (const radio of radios) {
    radio.addEventListener("change", (e) => {
      if (e.target.checked) {
        const val = e.target.value;
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
    }, { signal });
  }

  quadToggle?.addEventListener("change", (e) => {
    const useQuad = e.target.checked;
    const draggablesToUpdate = [
      dragItem,
      constraintItem,
      unreachableItem,
      ...boxes.map((b) => b.el).filter((b) => b.draggable),
    ];
    for (const el of draggablesToUpdate) {
      if (el) {
        el.dragHitTestMode = useQuad ? "quad" : "aabb";
      }
    }
    addLog(`Quad Hit Test: ${useQuad ? "ENABLED" : "DISABLED"}`, "#fab1a0");
  }, { signal });

  tabNextBtn?.addEventListener("click", () => {
    interaction.tabNext();
  }, { signal });

  tabPrevBtn?.addEventListener("click", () => {
    interaction.tabPrev();
  }, { signal });

  ctrlX?.addEventListener("input", (e) => {
    if (selectedElement) {
      selectedElement.x = Number(e.target.value);
      updateControls();
    }
  }, { signal });

  ctrlY?.addEventListener("input", (e) => {
    if (selectedElement) {
      selectedElement.y = Number(e.target.value);
      updateControls();
    }
  }, { signal });

  ctrlW?.addEventListener("input", (e) => {
    if (selectedElement) {
      selectedElement.width = Number(e.target.value);
      updateControls();
    }
  }, { signal });

  ctrlH?.addEventListener("input", (e) => {
    if (selectedElement) {
      selectedElement.height = Number(e.target.value);
      updateControls();
    }
  }, { signal });

  ctrlR?.addEventListener("input", (e) => {
    if (selectedElement) {
      const deg = Number(e.target.value);
      selectedElement.rotation = (deg * Math.PI) / 180;
      updateControls();
    }
  }, { signal });

  addLog(
    "Interaction system ready. Click, hover, and tab through elements.",
    "#6ecf6e",
  );

  return scene;
}
