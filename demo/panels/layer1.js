/**
 * Layer 1 — Core Math & Transformation Engine — Demo Panel
 *
 * Interactive transform playground: manipulate a rectangle with
 * position, rotation, scale, skew, pivot, and dimensions sliders.
 * Visualises the localMatrix, AABB, and pivot point.
 */
import {
  computeAABB,
  multiply,
  rotate,
  scale,
  skew,
  transformPoint,
  translate,
} from "/dist/canvasui.js";

// Composition: T(x,y) × R × Skew × S × T(-px,-py)
function computeLocalMatrix(x, y, rot, sx, sy, skx, sky, px, py) {
  const t1 = translate(x, y);
  const r = rotate(rot);
  const sk = skew(skx, sky);
  const s = scale(sx, sy);
  const t2 = translate(-px, -py);

  // multiply(a, b) = a * b
  // T1 * R * Sk * S * T2
  return multiply(multiply(multiply(multiply(t1, r), sk), s), t2);
}

(async () => {
  // ── Fetch and inject panel HTML ──
  const response = await fetch("panels/layer1.html");
  document.getElementById("layer-1").innerHTML = await response.text();

  // ── DOM references ──

  const canvas = document.getElementById("math-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;

  if (ctx) {
    // ── Slider helpers ──

    function sliderVal(id) {
      return +document.getElementById(id).value;
    }
    function setText(id, v) {
      document.getElementById(id).textContent = v;
    }

    // ── Draw loop ──

    function draw() {
      const x = sliderVal("slider-x");
      const y = sliderVal("slider-y");
      const rotDeg = sliderVal("slider-rot");
      const sx = sliderVal("slider-sx") / 10;
      const sy = sliderVal("slider-sy") / 10;
      const skxDeg = sliderVal("slider-skx");
      const skyDeg = sliderVal("slider-sky");
      const px = sliderVal("slider-px");
      const py = sliderVal("slider-py");
      const rectW = sliderVal("slider-w");
      const rectH = sliderVal("slider-h");
      const rot = (rotDeg * Math.PI) / 180;
      const skx = (skxDeg * Math.PI) / 180;
      const sky = (skyDeg * Math.PI) / 180;

      // Update pivot slider max to match current width/height
      document.getElementById("slider-px").max = rectW;
      document.getElementById("slider-py").max = rectH;

      // Update readout labels
      setText("val-x", x);
      setText("val-y", y);
      setText("val-rot", rotDeg);
      setText("val-sx", sx.toFixed(1));
      setText("val-sy", sy.toFixed(1));
      setText("val-skx", skxDeg);
      setText("val-sky", skyDeg);
      setText("val-px", px);
      setText("val-py", py);
      setText("val-w", rectW);
      setText("val-h", rectH);

      const mat = computeLocalMatrix(x, y, rot, sx, sy, skx, sky, px, py);

      // Create IRect-compatible object for computeAABB
      const localBounds = { x: 0, y: 0, width: rectW, height: rectH };
      const aabb = computeAABB(localBounds, mat);

      // Matrix readout
      const readout = document.getElementById("matrix-readout");
      if (readout) {
        // Float32Array doesn't have .map returning array by default in some envs?
        // Actually typed arrays have map but return typed array.
        // We want simple array for join.
        const values = Array.from(mat).map((v) => v.toFixed(3));
        readout.textContent =
          `localMatrix: [${values.join(", ")}]\n` +
          `AABB: { x: ${aabb.x.toFixed(1)}, y: ${aabb.y.toFixed(1)}, w: ${aabb.width.toFixed(1)}, h: ${aabb.height.toFixed(1)} }`;
      }

      // ── Render ──

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = "rgba(108, 108, 240, 0.08)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < canvas.width; gx += 50) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }
      for (let gy = 0; gy < canvas.height; gy += 50) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvas.width, gy);
        ctx.stroke();
      }

      // AABB (dashed orange)
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#f0a040";
      ctx.lineWidth = 2;
      ctx.strokeRect(aabb.x, aabb.y, aabb.width, aabb.height);
      ctx.restore();

      // Transformed rectangle
      ctx.save();
      // setTransform accepts 6 args
      ctx.setTransform(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5]);
      ctx.fillStyle = "rgba(108, 108, 240, 0.4)";
      ctx.strokeStyle = "#6c6cf0";
      const absScale = Math.max(Math.abs(sx), Math.abs(sy), 0.1);
      ctx.lineWidth = 2 / absScale;
      ctx.fillRect(0, 0, rectW, rectH);
      ctx.strokeRect(0, 0, rectW, rectH);

      // Skew distortion diagonal
      if (Math.abs(skxDeg) > 0.5 || Math.abs(skyDeg) > 0.5) {
        ctx.setLineDash([3 / absScale, 3 / absScale]);
        ctx.strokeStyle = "rgba(96, 192, 240, 0.6)";
        ctx.lineWidth = 1 / absScale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rectW, rectH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // Pivot point
      const pivotWorld = transformPoint(mat, px, py);
      ctx.beginPath();
      ctx.arc(pivotWorld.x, pivotWorld.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f06060";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Crosshair at pivot
      ctx.strokeStyle = "rgba(240, 96, 96, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pivotWorld.x - 12, pivotWorld.y);
      ctx.lineTo(pivotWorld.x + 12, pivotWorld.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pivotWorld.x, pivotWorld.y - 12);
      ctx.lineTo(pivotWorld.x, pivotWorld.y + 12);
      ctx.stroke();
      ctx.setLineDash([]);

      // Corner label
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(108, 108, 240, 0.5)";
      const c0 = transformPoint(mat, 0, 0);
      ctx.fillText("(0,0)", c0.x + 4, c0.y - 4);
    }

    // ── Bind sliders ──

    for (const slider of document.querySelectorAll(
      "#layer-1 input[type=range]",
    )) {
      slider.addEventListener("input", draw);
    }

    // Initial draw (deferred so panel is measured)
    requestAnimationFrame(draw);
  }
})();
