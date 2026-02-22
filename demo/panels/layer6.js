export default async function (Arena2D) {
  const { Arena2DContext } = Arena2D;

  // ── Helper to wrap a canvas ──
  function wrapCanvas(id) {
    const canvas = document.getElementById(id);
    const rawCtx = canvas.getContext("2d");
    return { canvas, ctx: new Arena2DContext(rawCtx) };
  }

  // ═══════════════════════════════════════
  //  SHAPE PRIMITIVES
  // ═══════════════════════════════════════

  const shapes = wrapCanvas("layer6-shapes");
  const sc = shapes.ctx;

  // Row 1: Rect, Rounded Rect, Circle
  sc.drawRect(15, 15, 80, 55, { fillColor: "#4a4ae8", strokeColor: "#7c7cf5" });
  sc.drawRoundedRect(115, 15, 80, 55, 12, { fillColor: "#2d8b5e", strokeColor: "#4ade80" });
  sc.drawCircle(260, 42, 27, { fillColor: "#c2410c", strokeColor: "#fb923c" });
  sc.drawEllipse(355, 42, 35, 22, { fillColor: "#7e22ce", strokeColor: "#c084fc" });

  // Row 2: Line, Polygon, Path
  sc.drawLine(15, 100, 95, 150, { strokeColor: "#f5c77c", lineWidth: 2 });
  sc.setLineDash([6, 4]);
  sc.drawLine(15, 155, 95, 105, { strokeColor: "#f57c7c", lineWidth: 2 });
  sc.setLineDash([]);

  // Triangle
  sc.drawPolygon(
    [
      { x: 155, y: 100 },
      { x: 195, y: 160 },
      { x: 115, y: 160 },
    ],
    { fillColor: "#0e7490", strokeColor: "#22d3ee" },
  );

  // Star polygon (pentagon star)
  const starPoints = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? 30 : 14;
    starPoints.push({
      x: 260 + Math.cos(angle) * r,
      y: 130 + Math.sin(angle) * r,
    });
  }
  sc.drawPolygon(starPoints, { fillColor: "#eab308", strokeColor: "#fde047" });

  // Custom Path2D — arrow
  const arrow = new Path2D();
  arrow.moveTo(325, 130);
  arrow.lineTo(385, 130);
  arrow.lineTo(375, 110);
  arrow.lineTo(400, 135);
  arrow.lineTo(375, 160);
  arrow.lineTo(385, 140);
  arrow.lineTo(325, 140);
  arrow.closePath();
  sc.drawPath(arrow, { fillColor: "#be185d", strokeColor: "#f472b6" });

  // Row 3: Labels
  const labelStyle = {
    fontSize: 10,
    fontFamily: "monospace",
    fill: "#666",
    textAlign: "center",
    textBaseline: "top",
  };
  sc.drawText("rect", 55, 75, labelStyle);
  sc.drawText("roundedRect", 155, 75, labelStyle);
  sc.drawText("circle", 260, 75, labelStyle);
  sc.drawText("ellipse", 355, 75, labelStyle);
  sc.drawText("lines", 55, 165, labelStyle);
  sc.drawText("polygon", 155, 165, labelStyle);
  sc.drawText("star", 260, 165, labelStyle);
  sc.drawText("path", 360, 165, labelStyle);

  // Row 4: Rounded rect with per-corner radii
  sc.drawRoundedRect(15, 195, 170, 50, [20, 5, 20, 5], { fillColor: "#1e3a5f", strokeColor: "#3b82f6" });
  sc.drawText("per-corner radii [20,5,20,5]", 100, 250, labelStyle);

  sc.setLineDash([8, 4, 2, 4]);
  sc.drawRect(215, 195, 170, 50, { strokeColor: "#a855f7", lineWidth: 3 });
  sc.setLineDash([]);
  sc.drawText("dashed stroke", 300, 250, labelStyle);

  // ═══════════════════════════════════════
  //  GRADIENTS
  // ═══════════════════════════════════════

  const grads = wrapCanvas("layer6-gradients");
  const gc = grads.ctx;

  // Linear gradient
  const linGrad = gc.createLinearGradient(15, 15, 185, 110, [
    { offset: 0, color: "#4a4ae8" },
    { offset: 0.5, color: "#c084fc" },
    { offset: 1, color: "#fb923c" },
  ]);
  gc.drawRoundedRect(15, 15, 170, 95, 10, { fillColor: linGrad });
  gc.drawText("Linear Gradient", 100, 118, {
    fontSize: 10,
    fontFamily: "monospace",
    fill: "#888",
    textAlign: "center",
    textBaseline: "top",
  });

  // Radial gradient
  const radGrad = gc.createRadialGradient(300, 62, 55, [
    { offset: 0, color: "#fde047" },
    { offset: 0.4, color: "#f97316" },
    { offset: 1, color: "#7f1d1d" },
  ]);
  gc.drawCircle(300, 62, 55, { fillColor: radGrad });
  gc.drawText("Radial Gradient", 300, 118, {
    fontSize: 10,
    fontFamily: "monospace",
    fill: "#888",
    textAlign: "center",
    textBaseline: "top",
  });

  // ═══════════════════════════════════════
  //  SHADOW EFFECTS
  // ═══════════════════════════════════════

  const shad = wrapCanvas("layer6-shadows");
  const shc = shad.ctx;

  // Card with shadow
  shc.setShadow("rgba(74, 74, 232, 0.6)", 15, 0, 4);
  shc.drawRoundedRect(20, 20, 100, 70, 8, { fillColor: "#2a2a4e" });
  shc.clearShadow();
  shc.drawText("Blue shadow", 70, 100, {
    fontSize: 10,
    fontFamily: "monospace",
    fill: "#888",
    textAlign: "center",
    textBaseline: "top",
  });

  // Glowing circle
  shc.setShadow("#4ade80", 20, 0, 0);
  shc.drawCircle(200, 55, 30, { fillColor: "#166534" });
  shc.clearShadow();
  shc.drawText("Green glow", 200, 100, {
    fontSize: 10,
    fontFamily: "monospace",
    fill: "#888",
    textAlign: "center",
    textBaseline: "top",
  });

  // Drop shadow
  shc.setShadow("rgba(0,0,0,0.8)", 8, 4, 4);
  shc.drawRoundedRect(280, 20, 100, 70, 8, { fillColor: "#7e22ce" });
  shc.clearShadow();
  shc.drawText("Drop shadow", 330, 100, {
    fontSize: 10,
    fontFamily: "monospace",
    fill: "#888",
    textAlign: "center",
    textBaseline: "top",
  });

  // ═══════════════════════════════════════
  //  CLIPPING
  // ═══════════════════════════════════════

  const clip = wrapCanvas("layer6-clipping");
  const cc = clip.ctx;

  // Left: Rect clip
  cc.save();
  cc.clipRect(15, 15, 160, 95);
  // Draw a scene that extends beyond the clip
  const sceneFill = cc.createLinearGradient(15, 15, 175, 110, [
    { offset: 0, color: "#4a4ae8" },
    { offset: 1, color: "#fb923c" },
  ]);
  cc.drawRect(-20, -20, 240, 160, { fillColor: sceneFill });
  cc.drawCircle(50, 60, 40, { fillColor: "rgba(255,255,255,0.15)" });
  cc.drawCircle(130, 40, 50, { fillColor: "rgba(255,255,255,0.1)" });
  cc.drawText("CLIPPED", 95, 65, {
    fontSize: 24,
    fontFamily: "monospace",
    fontWeight: "bold",
    fill: "rgba(255,255,255,0.3)",
    textAlign: "center",
    textBaseline: "middle",
  });
  cc.restore();
  cc.drawText("clipRect", 95, 118, {
    fontSize: 10,
    fontFamily: "monospace",
    fill: "#888",
    textAlign: "center",
    textBaseline: "top",
  });

  // Right: Rounded rect clip
  cc.save();
  cc.clipRoundedRect(215, 15, 160, 95, 20);
  const sceneFill2 = cc.createLinearGradient(215, 15, 375, 110, [
    { offset: 0, color: "#7e22ce" },
    { offset: 1, color: "#22d3ee" },
  ]);
  cc.drawRect(195, -5, 200, 140, { fillColor: sceneFill2 });
  cc.drawCircle(250, 60, 40, { fillColor: "rgba(255,255,255,0.15)" });
  cc.drawCircle(340, 40, 50, { fillColor: "rgba(255,255,255,0.1)" });
  cc.drawText("CLIPPED", 295, 65, {
    fontSize: 24,
    fontFamily: "monospace",
    fontWeight: "bold",
    fill: "rgba(255,255,255,0.3)",
    textAlign: "center",
    textBaseline: "middle",
  });
  cc.restore();
  cc.drawText("clipRoundedRect", 295, 118, {
    fontSize: 10,
    fontFamily: "monospace",
    fill: "#888",
    textAlign: "center",
    textBaseline: "top",
  });

  // ═══════════════════════════════════════
  //  TEXT RENDERING
  // ═══════════════════════════════════════

  const text = wrapCanvas("layer6-text");
  const tc = text.ctx;

  tc.drawText("Bold 20px", 15, 30, {
    fontSize: 20,
    fontFamily: "Arial, sans-serif",
    fontWeight: "bold",
    fill: "#e2e8f0",
    textBaseline: "alphabetic",
  });

  tc.drawText("Italic 16px", 15, 55, {
    fontSize: 16,
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    fill: "#94a3b8",
    textBaseline: "alphabetic",
  });

  tc.drawText("Monospace 14px", 15, 78, {
    fontSize: 14,
    fontFamily: "monospace",
    fill: "#4ade80",
    textBaseline: "alphabetic",
  });

  // Right-aligned text
  tc.drawText("Right-aligned", 385, 30, {
    fontSize: 14,
    fontFamily: "Arial, sans-serif",
    fill: "#f97316",
    textAlign: "right",
    textBaseline: "alphabetic",
  });

  tc.drawText("Center-aligned", 295, 55, {
    fontSize: 14,
    fontFamily: "Arial, sans-serif",
    fill: "#a78bfa",
    textAlign: "center",
    textBaseline: "alphabetic",
  });

  // measureText demo
  const demoStyle = {
    fontSize: 16,
    fontFamily: "monospace",
    fill: "#22d3ee",
  };
  const measured = tc.measureText("Arena2DContext", demoStyle);
  tc.drawText("Arena2DContext", 15, 115, demoStyle);
  // Underline using measured width
  tc.drawLine(15, 120, 15 + measured.width, 120, { strokeColor: "#22d3ee", lineWidth: 1 });
  tc.drawText(
    `w:${Math.round(measured.width)} h:${Math.round(measured.height)}`,
    15 + measured.width + 8,
    115,
    {
      fontSize: 10,
      fontFamily: "monospace",
      fill: "#666",
    },
  );

  // ═══════════════════════════════════════
  //  STATE SETTERS & LOW-LEVEL DRAWING
  // ═══════════════════════════════════════

  const state = wrapCanvas("layer6-state");
  const stc = state.ctx;

  // 1. Alpha (setGlobalAlpha)
  [1.0, 0.6, 0.3].forEach((a, i) => {
    stc.save();
    stc.setGlobalAlpha(a);
    stc.drawRect(30 + i * 25, 30, 20, 80, { fillColor: "#4a4ae8" });
    stc.restore();
  });
  stc.drawText("setGlobalAlpha", 90, 120, labelStyle);

  // 2. Composite (setCompositeOperation)
  stc.drawCircle(300, 70, 50, { fillColor: "#fb923c" });
  stc.save();
  stc.setCompositeOperation("destination-out");
  stc.drawCircle(330, 70, 40, { fillColor: "#000" });
  stc.restore();
  stc.drawText("setCompositeOperation", 300, 130, labelStyle);

  // 3. Low-level fillRect + fillText (setFillStyle, fillRect, setFont, fillText)
  stc.setFillStyle("#2d8b5e");
  stc.fillRect(500, 30, 120, 60);
  stc.setFont({ fontSize: 14, fontFamily: "monospace" });
  stc.setFillStyle("#e2e8f0");
  stc.setTextBaseline("top");
  stc.fillText("fillRect", 510, 40);
  stc.fillText("fillText", 510, 60);
  stc.drawText("state setters", 560, 100, labelStyle);

  // 4. strokeText + setTextAlign
  stc.setFont({ fontSize: 18, fontFamily: "Arial", fontWeight: "bold" });
  stc.setStrokeStyle("#f472b6");
  stc.setLineWidth(0.5);
  stc.strokeText("Stroke", 700, 50);
  stc.setFillStyle("#f472b6");
  stc.setTextAlign("center");
  stc.fillText("center", 700, 80);
  stc.drawText("strokeText / setTextAlign", 700, 120, { ...labelStyle, textAlign: "center" });
}
