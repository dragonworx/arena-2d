export default async function (Arena2D) {
  const { Scene, View, Image, Element } = Arena2D;

  // ── Helper: generate a colored test image on canvas ──
  function createTestImage(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#4a90d9");
    grad.addColorStop(0.5, "#7c3aed");
    grad.addColorStop(1, "#ec4899");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${w}×${h}`, w / 2, h / 2);

    return canvas;
  }

  // ── Helper: generate a sprite sheet ──
  function createSpriteSheet(cellW, cellH) {
    const cols = 4;
    const rows = 4;
    const canvas = document.createElement("canvas");
    canvas.width = cellW * cols;
    canvas.height = cellH * rows;
    const ctx = canvas.getContext("2d");

    const colors = [
      "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
      "#1abc9c", "#3498db", "#9b59b6", "#e91e63",
      "#ff5722", "#795548", "#607d8b", "#00bcd4",
      "#8bc34a", "#cddc39", "#ffc107", "#9e9e9e",
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = c * cellW;
        const y = r * cellH;
        ctx.fillStyle = colors[idx];
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${c},${r}`, x + cellW / 2, y + cellH / 2);
      }
    }
    return canvas;
  }

  // ── Helper: generate a nine-slice texture ──
  function createNineSliceTexture(w, h, border) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#1a1a2e";
    roundRect(ctx, 0, 0, w, h, 12);
    ctx.fill();

    ctx.fillStyle = "#16213e";
    roundRect(ctx, border, border, w - border * 2, h - border * 2, 6);
    ctx.fill();

    const grad = ctx.createLinearGradient(0, 0, 0, border);
    grad.addColorStop(0, "rgba(255,255,255,0.15)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, w, border * 2, 12);
    ctx.fill();

    ctx.fillStyle = "rgba(255,100,100,0.3)";
    ctx.fillRect(0, 0, border, border);
    ctx.fillRect(w - border, 0, border, border);
    ctx.fillRect(0, h - border, border, border);
    ctx.fillRect(w - border, h - border, border, border);

    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ═══════════════════════════════════════════════════════
  // Setup Unified Scene
  // ═══════════════════════════════════════════════════════

  const wrap = document.getElementById("l12-canvas-wrap");
  const scene = new Scene(600, 580);
  const view = new View(wrap, scene);
  view.resize(600, 580);
  scene.ticker.start();

  // ── 1. Standard Image ──
  const testImg = createTestImage(400, 300);
  const imgEl = new Image("demo-image");
  imgEl.source = testImg;
  imgEl.x = 20;
  imgEl.y = 20;
  imgEl.width = 150;
  imgEl.height = 120;
  scene.root.addChild(imgEl);

  const border1 = new Element("border1");
  border1.x = 20;
  border1.y = 20;
  border1.width = 150;
  border1.height = 120;
  border1.paint = (ctx) => {
    ctx.raw.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.raw.lineWidth = 1;
    ctx.raw.strokeRect(0, 0, border1.width, border1.height);
  };
  scene.root.addChild(border1);

  // ── 2. Sprite Sheet ──
  const cellW = 64;
  const cellH = 64;
  const spriteSheet = createSpriteSheet(cellW, cellH);

  // Sheet reference (small)
  const sheetRef = new Image("sheet-ref");
  sheetRef.source = spriteSheet;
  sheetRef.x = 220;
  sheetRef.y = 20;
  sheetRef.width = 100;
  sheetRef.height = 100;
  scene.root.addChild(sheetRef);

  const highlight = new Element("sheet-highlight");
  highlight.x = 220;
  highlight.y = 20;
  highlight.width = 100;
  highlight.height = 100;
  highlight.paint = (ctx) => {
    const col = Number(colSlider.value);
    const row = Number(rowSlider.value);
    const cw = 100 / 4;
    const ch = 100 / 4;
    ctx.raw.strokeStyle = "#4a90d9";
    ctx.raw.lineWidth = 2;
    ctx.raw.strokeRect(col * cw, row * ch, cw, ch);
  };
  scene.root.addChild(highlight);

  // Enlarged sprite
  const spriteEl = new Image("sprite-selected");
  spriteEl.source = spriteSheet;
  spriteEl.sourceRect = { x: 0, y: 0, width: cellW, height: cellH };
  spriteEl.x = 340;
  spriteEl.y = 20;
  spriteEl.width = 100;
  spriteEl.height = 100;
  scene.root.addChild(spriteEl);

  // ── 3. Nine-Slice ──
  const nsTexSize = 80;
  const nsBorder = 20;
  const nsTex = createNineSliceTexture(nsTexSize, nsTexSize, nsBorder);

  const nsEl = new Image("nine-slice-panel");
  nsEl.source = nsTex;
  nsEl.nineSlice = [nsBorder, nsBorder, nsBorder, nsBorder];
  nsEl.x = 20;
  nsEl.y = 180; // Below standard image
  nsEl.width = 400;
  nsEl.height = 200;
  scene.root.addChild(nsEl);

  const nsGuides = new Element("ns-guides");
  nsGuides.x = 20;
  nsGuides.y = 180;
  nsGuides.width = 400;
  nsGuides.height = 200;
  nsGuides.paint = (ctx) => {
    const raw = ctx.raw;
    const [t, r, b, l] = nsEl.nineSlice || [0, 0, 0, 0];
    const w = nsEl.width;
    const h = nsEl.height;
    raw.setLineDash([4, 4]);
    raw.strokeStyle = "rgba(255,100,100,0.5)";
    raw.lineWidth = 1;
    // Horizontal
    raw.beginPath(); raw.moveTo(0, t); raw.lineTo(w, t); raw.stroke();
    raw.beginPath(); raw.moveTo(0, h - b); raw.lineTo(w, h - b); raw.stroke();
    // Vertical
    raw.beginPath(); raw.moveTo(l, 0); raw.lineTo(l, h); raw.stroke();
    raw.beginPath(); raw.moveTo(w - r, 0); raw.lineTo(w - r, h); raw.stroke();
    raw.setLineDash([]);
  };
  scene.root.addChild(nsGuides);

  const nsLabel = new Element("ns-label");
  nsLabel.x = 20;
  nsLabel.y = 180;
  nsLabel.width = 400;
  nsLabel.height = 200;
  nsLabel.paint = (ctx) => {
    ctx.raw.fillStyle = "white";
    ctx.raw.font = "bold 14px sans-serif";
    ctx.raw.textAlign = "center";
    ctx.raw.textBaseline = "middle";
    ctx.raw.fillText(`${Math.round(nsEl.width)}×${Math.round(nsEl.height)}`, nsEl.width / 2, nsEl.height / 2);
  };
  scene.root.addChild(nsLabel);

  // ═══════════════════════════════════════════════════════
  // Control Panel Logic
  // ═══════════════════════════════════════════════════════

  // Standard Image
  const widthSlider = document.getElementById("l12-width");
  const heightSlider = document.getElementById("l12-height");
  const wVal = document.getElementById("l12-w-val");
  const hVal = document.getElementById("l12-h-val");
  const tintEnable = document.getElementById("l12-tint-enable");
  const tintColor = document.getElementById("l12-tint-color");

  function updateStandard() {
    const w = Number(widthSlider.value);
    const h = Number(heightSlider.value);
    imgEl.width = w;
    imgEl.height = h;
    border1.width = w;
    border1.height = h;
    wVal.textContent = w;
    hVal.textContent = h;

    if (tintEnable.checked) {
      const hex = tintColor.value;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      imgEl.tint = `rgba(${r}, ${g}, ${b}, 0.5)`;
    } else {
      imgEl.tint = undefined;
    }
  }

  widthSlider.addEventListener("input", updateStandard);
  heightSlider.addEventListener("input", updateStandard);
  tintEnable.addEventListener("change", updateStandard);
  tintColor.addEventListener("input", updateStandard);

  // Sprite Sheet
  const colSlider = document.getElementById("l12-sprite-col");
  const rowSlider = document.getElementById("l12-sprite-row");
  const colVal = document.getElementById("l12-col-val");
  const rowVal = document.getElementById("l12-row-val");

  function updateSprite() {
    const col = Number(colSlider.value);
    const row = Number(rowSlider.value);
    colVal.textContent = col;
    rowVal.textContent = row;
    spriteEl.sourceRect = { x: col * cellW, y: row * cellH, width: cellW, height: cellH };
    highlight.invalidate(2); // Visual
  }

  colSlider.addEventListener("input", updateSprite);
  rowSlider.addEventListener("input", updateSprite);

  // Nine-Slice
  const nsTopSlider = document.getElementById("l12-ns-top");
  const nsRightSlider = document.getElementById("l12-ns-right");
  const nsBottomSlider = document.getElementById("l12-ns-bottom");
  const nsLeftSlider = document.getElementById("l12-ns-left");
  const nsWidthSlider = document.getElementById("l12-ns-width");
  const nsHeightSlider = document.getElementById("l12-ns-height");

  function updateNineSlice() {
    const t = Number(nsTopSlider.value);
    const r = Number(nsRightSlider.value);
    const b = Number(nsBottomSlider.value);
    const l = Number(nsLeftSlider.value);
    const w = Number(nsWidthSlider.value);
    const h = Number(nsHeightSlider.value);

    document.getElementById("l12-ns-top-val").textContent = t;
    document.getElementById("l12-ns-right-val").textContent = r;
    document.getElementById("l12-ns-bottom-val").textContent = b;
    document.getElementById("l12-ns-left-val").textContent = l;
    document.getElementById("l12-ns-w-val").textContent = w;
    document.getElementById("l12-ns-h-val").textContent = h;

    nsEl.nineSlice = [t, r, b, l];
    nsEl.width = w;
    nsEl.height = h;
    nsLabel.width = w;
    nsLabel.height = h;
    nsGuides.width = w;
    nsGuides.height = h;
    nsGuides.invalidate(2);
    nsLabel.invalidate(2);
  }

  [nsTopSlider, nsRightSlider, nsBottomSlider, nsLeftSlider, nsWidthSlider, nsHeightSlider].forEach(s => {
    s.addEventListener("input", updateNineSlice);
  });

  // Stats
  const stats = document.getElementById("l12-stats");
  stats.textContent = `Scene: 600×580 | DPR: ${view.dpr}\nSource Img: ${testImg.width}×${testImg.height}\nSprite Sheet: ${spriteSheet.width}×${spriteSheet.height}`;
}

