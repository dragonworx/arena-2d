export default async function (CanvasUI) {
  // ── DOM refs ──
  const canvas = document.getElementById("l3-canvas");
  const ctx = canvas.getContext("2d");
  const chkAuto = document.getElementById("chk-auto");
  const btnUpdate = document.getElementById("btn-update");
  const flagTbody = document.getElementById("flag-tbody");
  const flagBadges = document.getElementById("flag-badges");
  const eventLog = document.getElementById("event-log");

  const ctrls = {
    x: {
      slider: document.getElementById("ctrl-x"),
      val: document.getElementById("ctrl-x-val"),
    },
    y: {
      slider: document.getElementById("ctrl-y"),
      val: document.getElementById("ctrl-y-val"),
    },
    rot: {
      slider: document.getElementById("ctrl-rot"),
      val: document.getElementById("ctrl-rot-val"),
    },
    sx: {
      slider: document.getElementById("ctrl-sx"),
      val: document.getElementById("ctrl-sx-val"),
    },
    sy: {
      slider: document.getElementById("ctrl-sy"),
      val: document.getElementById("ctrl-sy-val"),
    },
    alpha: {
      slider: document.getElementById("ctrl-alpha"),
      val: document.getElementById("ctrl-alpha-val"),
    },
  };

  const SIZE = 80;
  let logLines = [];
  const MAX_LOG = 40;
  let destroyed = false;

  // ── Log helper ──
  function log(msg) {
    const ts = new Date().toLocaleTimeString("en-AU", { hour12: false });
    logLines.push(`[${ts}] ${msg}`);
    if (logLines.length > MAX_LOG) logLines = logLines.slice(-MAX_LOG);
    eventLog.textContent = logLines.join("\n");
    eventLog.scrollTop = eventLog.scrollHeight;
  }

  function flagName(f) {
    const n = [];
    if (f & DirtyFlags.Transform) n.push("T");
    if (f & DirtyFlags.Visual) n.push("V");
    if (f & DirtyFlags.Layout) n.push("L");
    if (f & DirtyFlags.Spatial) n.push("S");
    return n.join("|") || "None";
  }

  // ── Create element ──
  let el;

  function createEl() {
    el = new Element("demo");
    el.x = 90;
    el.y = 60;
    el.localBounds = { x: 0, y: 0, width: SIZE, height: SIZE };
    el.update(0);
    // Clear all initial flags so the inspector starts clean.
    // Element constructor sets DirtyFlags.All; update() only clears Transform.
    // Access the private backing field directly (valid in JS at runtime).
    el._dirtyFlags = DirtyFlags.None;

    destroyed = false;

    // Patch invalidate to emit stateChanged
    const orig = el.invalidate.bind(el);
    el.invalidate = (flag) => {
      orig(flag);
      el.emit("stateChanged", { flag });
    };

    el.on("stateChanged", (data) => {
      log(`stateChanged → ${flagName(data.flag)}`);
      updateInspector();
      if (chkAuto.checked) doUpdate();
    });
  }

  createEl();

  // ── Update (resolve) ──
  function doUpdate() {
    if (destroyed) return;
    const before = el.dirtyFlags;
    el.update(0);
    if (before !== el.dirtyFlags) {
      log(
        `update() → resolved Transform, flags: ${flagName(before)} → ${flagName(el.dirtyFlags)}`,
      );
    }
    render();
  }

  // ── Render canvas ──
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (destroyed || !el.visible) {
      ctx.fillStyle = "#333";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        destroyed ? "💀 destroyed" : "hidden (visible=false)",
        canvas.width / 2,
        canvas.height / 2,
      );
      updateInspector();
      return;
    }

    const a = el.effectiveAlpha;
    const wx = el.worldMatrix[4];
    const wy = el.worldMatrix[5];
    const w = SIZE;
    const h = SIZE;
    const r = 8;

    ctx.globalAlpha = a;
    ctx.fillStyle = "#6c6cf0";
    ctx.beginPath();
    ctx.moveTo(wx + r, wy);
    ctx.lineTo(wx + w - r, wy);
    ctx.quadraticCurveTo(wx + w, wy, wx + w, wy + r);
    ctx.lineTo(wx + w, wy + h - r);
    ctx.quadraticCurveTo(wx + w, wy + h, wx + w - r, wy + h);
    ctx.lineTo(wx + r, wy + h);
    ctx.quadraticCurveTo(wx, wy + h, wx, wy + h - r);
    ctx.lineTo(wx, wy + r);
    ctx.quadraticCurveTo(wx, wy, wx + r, wy);
    ctx.closePath();
    ctx.fill();

    // Labels
    ctx.globalAlpha = Math.max(a * 0.85, 0.3);
    ctx.fillStyle = "#111";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(el.id, wx + w / 2, wy + h / 2 - 8);
    ctx.fillText(`α=${a.toFixed(2)}`, wx + w / 2, wy + h / 2 + 4);
    ctx.font = "9px monospace";
    ctx.fillText(
      `w(${wx.toFixed(0)},${wy.toFixed(0)})`,
      wx + w / 2,
      wy + h / 2 + 16,
    );

    ctx.globalAlpha = 1;
    updateInspector();
  }

  // ── Inspector ──
  function updateInspector() {
    // Property table
    const props = destroyed
      ? [
          ["id", `${el.id} 💀`],
          ["flags", "—"],
          ["visible", "—"],
          ["parent", "null"],
        ]
      : [
          ["id", el.id],
          ["x / y", `${el.x.toFixed(1)} / ${el.y.toFixed(1)}`],
          ["rotation", el.rotation.toFixed(3)],
          ["scaleX / Y", `${el.scaleX.toFixed(2)} / ${el.scaleY.toFixed(2)}`],
          ["alpha", el.alpha.toFixed(2)],
          ["effectiveAlpha", el.effectiveAlpha.toFixed(2)],
          ["visible", String(el.visible)],
          [
            "worldPos",
            `(${el.worldMatrix[4].toFixed(1)}, ${el.worldMatrix[5].toFixed(1)})`,
          ],
        ];

    flagTbody.innerHTML = props
      .map(
        ([k, v]) =>
          `<tr style="border-bottom:1px solid #1a1a1a;"><td style="padding:2px 6px; color:#888;">${k}</td><td style="padding:2px 6px; color:#ddd;">${v}</td></tr>`,
      )
      .join("");

    // Flag badges
    const f = el.dirtyFlags;
    const badges = [
      ["T", DirtyFlags.Transform],
      ["V", DirtyFlags.Visual],
      ["L", DirtyFlags.Layout],
      ["S", DirtyFlags.Spatial],
    ]
      .map(
        ([label, flag]) =>
          `<span class="flag-badge ${f & flag ? "flag-on" : "flag-off"}">${label}</span>`,
      )
      .join("");
    flagBadges.innerHTML = `<span style="color:#888; font-size:0.82em;">Flags: </span>${badges}`;
  }

  // ── Sync sliders from element ──
  function syncControls() {
    if (destroyed) return;
    ctrls.x.slider.value = el.x;
    ctrls.x.val.textContent = Math.round(el.x);
    ctrls.y.slider.value = el.y;
    ctrls.y.val.textContent = Math.round(el.y);
    ctrls.rot.slider.value = Math.round(el.rotation * 100);
    ctrls.rot.val.textContent = el.rotation.toFixed(2);
    ctrls.sx.slider.value = Math.round(el.scaleX * 100);
    ctrls.sx.val.textContent = el.scaleX.toFixed(2);
    ctrls.sy.slider.value = Math.round(el.scaleY * 100);
    ctrls.sy.val.textContent = el.scaleY.toFixed(2);
    ctrls.alpha.slider.value = Math.round(el.alpha * 100);
    ctrls.alpha.val.textContent = el.alpha.toFixed(2);
  }

  // Initial render
  render();

  // ── Transform slider handlers ──
  function onSliderInput() {
    if (destroyed) return;
    el.x = Number(ctrls.x.slider.value);
    ctrls.x.val.textContent = Math.round(el.x);
    el.y = Number(ctrls.y.slider.value);
    ctrls.y.val.textContent = Math.round(el.y);
    el.rotation = Number(ctrls.rot.slider.value) / 100;
    ctrls.rot.val.textContent = el.rotation.toFixed(2);
    el.scaleX = Number(ctrls.sx.slider.value) / 100;
    ctrls.sx.val.textContent = el.scaleX.toFixed(2);
    el.scaleY = Number(ctrls.sy.slider.value) / 100;
    ctrls.sy.val.textContent = el.scaleY.toFixed(2);
    el.alpha = Number(ctrls.alpha.slider.value) / 100;
    ctrls.alpha.val.textContent = el.alpha.toFixed(2);
    // auto update/render is handled by the stateChanged listener
  }

  for (const c of Object.values(ctrls)) {
    c.slider.addEventListener("input", onSliderInput);
  }

  // ── Update button ──
  btnUpdate.addEventListener("click", () => {
    if (destroyed) return;
    log("Manual update() triggered");
    doUpdate();
  });

  // ── Toggle visibility ──
  document.getElementById("btn-toggle-vis").addEventListener("click", () => {
    if (destroyed) return;
    el.visible = !el.visible;
    log(`visible = ${el.visible}`);
    // visible setter fires stateChanged → auto handles render
    if (!chkAuto.checked) updateInspector();
  });

  // ── Modify all props (coalesce) ──
  document.getElementById("btn-coalesce").addEventListener("click", () => {
    if (destroyed) {
      log("⚠ Element is destroyed");
      return;
    }
    // Clear first so demo is clear
    el.update(0);

    el.x = el.x + 15;
    el.y = el.y + 10;
    el.rotation = el.rotation + 0.15;
    el.alpha = Math.max(0.2, el.alpha - 0.15);
    el.invalidate(DirtyFlags.Layout);
    el.invalidate(DirtyFlags.Spatial);

    log(`⚡ Coalesced: T|V|L|S → flags=${flagName(el.dirtyFlags)}`);
    syncControls();
    // auto handling via stateChanged
    if (!chkAuto.checked) updateInspector();
  });

  // ── Destroy ──
  document.getElementById("btn-destroy").addEventListener("click", () => {
    if (destroyed) {
      log("⚠ Already destroyed");
      return;
    }
    el.destroy();
    destroyed = true;
    log(`💀 destroy() → flags=${el.dirtyFlags}, parent=${el.parent}`);
    el.emit("stateChanged", { flag: 0 });
    log("   emit after destroy → (no handler fired)");
    render();
  });

  // ── Reset ──
  document.getElementById("btn-reset").addEventListener("click", () => {
    createEl();
    syncControls();
    log("🔄 Reset → element recreated");
    doUpdate();
  });

  // ── Clear log ──
  document.getElementById("btn-clear-log").addEventListener("click", () => {
    logLines = [];
    eventLog.textContent = "";
  });

  log("Ready. Adjust sliders with 'auto' on to see instant updates.");
  log("Uncheck 'auto' → changes accumulate flags → press 'Update' to resolve.");
}
