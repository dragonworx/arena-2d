export default async function (Arena2D, { signal }) {
  const { Scene, View, Text } = Arena2D;

  // ── Control elements ──
  const textArea = document.getElementById("l10-text");
  const fontFamilySelect = document.getElementById("l10-font-family");
  const fontSizeSlider = document.getElementById("l10-font-size");
  const fontSizeVal = document.getElementById("l10-font-size-val");
  const fontWeightSelect = document.getElementById("l10-font-weight");
  const fontStyleSelect = document.getElementById("l10-font-style");
  const textAlignSelect = document.getElementById("l10-text-align");
  const widthSlider = document.getElementById("l10-width");
  const widthVal = document.getElementById("l10-width-val");
  const lineHeightSlider = document.getElementById("l10-line-height");
  const lineHeightVal = document.getElementById("l10-line-height-val");
  const colorInput = document.getElementById("l10-color");
  const showAdvCheckbox = document.getElementById("l10-show-adv");
  const showBoundsCheckbox = document.getElementById("l10-show-bounds");
  const showLinesCheckbox = document.getElementById("l10-show-lines");

  // Stats
  const statLines = document.getElementById("l10-stat-lines");
  const statWidest = document.getElementById("l10-stat-widest");
  const statHeight = document.getElementById("l10-stat-height");
  const statMin = document.getElementById("l10-stat-min");
  const statMax = document.getElementById("l10-stat-max");

  // Perf
  const perfBtn = document.getElementById("l10-perf-btn");
  const perfResult = document.getElementById("l10-perf-result");

  // ── Create Scene ──
  const sceneContainer = document.getElementById("l10-canvas-wrap");
  const scene = new Scene(800, 500);
  const view = new View(sceneContainer, scene);
  view.resize(800, 500);

  // ── Create Text Element ──
  const textEl = new Text("demo-text");
  textEl.text = textArea.value;
  textEl.width = 400;
  textEl.height = 500;
  textEl.updateTextStyle({
    fontSize: 16,
    fontFamily: "sans-serif",
    color: "#e0e0e0",
  });
  scene.root.addChild(textEl);

  // Start the render loop
  scene.ticker.start();

  // ── Visualization state ──
  let showAdvancements = false;
  let showBounds = true;
  let showLines = false;

  // ── Override paint for visualization ──
  const originalPaint = textEl.paint.bind(textEl);
  textEl.paint = (ctx) => {
    const layout = textEl.textLayout;
    const style = textEl.textStyle;
    const lineHeight = style.lineHeight;
    const elementWidth = textEl.width;
    const raw = ctx.raw;

    // Draw text bounds
    if (showBounds) {
      raw.strokeStyle = "rgba(100, 180, 255, 0.3)";
      raw.lineWidth = 1;
      raw.setLineDash([4, 4]);
      raw.strokeRect(0, 0, elementWidth, layout.totalHeight);
      raw.setLineDash([]);
    }

    // Draw line boundaries
    if (showLines) {
      for (let i = 0; i < layout.lines.length; i++) {
        const y = i * lineHeight;
        raw.fillStyle =
          i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
        raw.fillRect(0, y, elementWidth, lineHeight);
      }
    }

    // Draw the text using the element's paint method logic
    const weight = style.fontWeight;
    const fontStyle = style.fontStyle;
    raw.font = `${weight} ${fontStyle} ${style.fontSize}px ${style.fontFamily}`;
    raw.fillStyle = style.color;
    raw.textBaseline = "top";

    for (let i = 0; i < layout.lines.length; i++) {
      const line = layout.lines[i];
      const y = i * lineHeight;

      // Compute x offset based on text alignment
      let x = 0;
      if (style.textAlign === "center") {
        x = (elementWidth - line.width) / 2;
      } else if (style.textAlign === "right") {
        x = elementWidth - line.width;
      }

      raw.fillText(line.text, x, y);

      // Draw advancements
      if (showAdvancements && line.advancements.length > 0) {
        raw.strokeStyle = "rgba(255, 100, 100, 0.5)";
        raw.lineWidth = 1;
        for (const adv of line.advancements) {
          const tickX = x + adv;
          raw.beginPath();
          raw.moveTo(tickX, y + lineHeight - 4);
          raw.lineTo(tickX, y + lineHeight);
          raw.stroke();
        }
        // Draw end marker
        const endX = x + line.width;
        raw.strokeStyle = "rgba(100, 255, 100, 0.5)";
        raw.beginPath();
        raw.moveTo(endX, y + lineHeight - 6);
        raw.lineTo(endX, y + lineHeight);
        raw.stroke();
      }
    }
  };

  // ── Update function ──
  function updateText() {
    textEl.text = textArea.value;

    const fontSize = Number.parseInt(fontSizeSlider.value);
    const lhValue = Number.parseInt(lineHeightSlider.value);

    const styleUpdate = {
      fontSize,
      fontFamily: fontFamilySelect.value,
      fontWeight: fontWeightSelect.value,
      fontStyle: fontStyleSelect.value,
      textAlign: textAlignSelect.value,
      color: colorInput.value,
    };

    if (lhValue > 0) {
      styleUpdate.lineHeight = lhValue;
    }

    textEl.updateTextStyle(styleUpdate);
    textEl.width = Number.parseInt(widthSlider.value);

    // If lineHeight slider is 0, let it auto-calculate
    if (lhValue === 0) {
      textEl.updateTextStyle({ lineHeight: Math.ceil(fontSize * 1.2) });
    }

    // Update stats
    const layout = textEl.textLayout;
    let widest = 0;
    for (const line of layout.lines) {
      if (line.width > widest) widest = line.width;
    }

    statLines.textContent = layout.lines.length.toString();
    statWidest.textContent = `${Math.round(widest)}px`;
    statHeight.textContent = `${Math.round(layout.totalHeight)}px`;
    statMin.textContent = `${Math.round(textEl.getMinContentWidth())}px`;
    statMax.textContent = `${Math.round(textEl.getMaxContentWidth())}px`;

    // Update display values
    fontSizeVal.textContent = `${fontSize}px`;
    widthVal.textContent = `${widthSlider.value}px`;
    lineHeightVal.textContent = lhValue > 0 ? `${lhValue}px` : "auto";
  }



  // ── Event listeners ──
  textArea.addEventListener("input", updateText, { signal });
  fontFamilySelect.addEventListener("change", updateText, { signal });
  fontSizeSlider.addEventListener("input", updateText, { signal });
  fontWeightSelect.addEventListener("change", updateText, { signal });
  fontStyleSelect.addEventListener("change", updateText, { signal });
  textAlignSelect.addEventListener("change", updateText, { signal });
  widthSlider.addEventListener("input", updateText, { signal });
  lineHeightSlider.addEventListener("input", updateText, { signal });
  colorInput.addEventListener("input", updateText, { signal });

  showAdvCheckbox.addEventListener("change", () => {
    showAdvancements = showAdvCheckbox.checked;
  }, { signal });
  showBoundsCheckbox.addEventListener("change", () => {
    showBounds = showBoundsCheckbox.checked;
  }, { signal });
  showLinesCheckbox.addEventListener("change", () => {
    showLines = showLinesCheckbox.checked;
  }, { signal });

  // ── Performance test ──
  perfBtn.addEventListener("click", () => {
    const longText =
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(200);
    const iterations = 100;

    // Clear cache for fair test
    Arena2D.clearLayoutCache();

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      Arena2D.clearLayoutCache();
      Arena2D.computeTextLayout(
        longText,
        {
          fontSize: 14,
          fontFamily: "sans-serif",
          lineHeight: 17,
        },
        400,
      );
    }
    const elapsed = performance.now() - start;

    // Test with cache
    Arena2D.clearLayoutCache();
    const cacheStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      Arena2D.computeTextLayout(
        longText,
        {
          fontSize: 14,
          fontFamily: "sans-serif",
          lineHeight: 17,
        },
        400,
      );
    }
    const cacheElapsed = performance.now() - cacheStart;

    perfResult.style.display = "block";
    perfResult.innerHTML = `
      <div><strong>Performance Results</strong></div>
      <div>Text: ~${longText.length} chars</div>
      <div>No cache: ${(elapsed / iterations).toFixed(2)}ms/layout (${iterations} iterations)</div>
      <div>With cache: ${(cacheElapsed / iterations).toFixed(3)}ms/layout (${iterations} iterations)</div>
      <div>Cache speedup: ${(elapsed / cacheElapsed).toFixed(1)}x</div>
    `;
  }, { signal });

  // Initial update
  updateText();

  return scene;
}
