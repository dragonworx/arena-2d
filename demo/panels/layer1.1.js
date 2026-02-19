export default async function (CanvasUI) {
  const { Scene, Element, Container } = CanvasUI;

  const sceneContainer = document.getElementById("l1.1-scene-container");
  if (!sceneContainer) return;

  const scene = new Scene(sceneContainer, 800, 600);
  scene.ticker.start();

  // Helper to apply config
  function applyConfig(el, config) {
    if (config.x !== undefined) el.x = config.x;
    if (config.y !== undefined) el.y = config.y;
    if (config.width !== undefined) {
      el.width = config.width;
    }
    if (config.height !== undefined) {
      el.height = config.height;
    }
    if (config.rotation !== undefined) el.rotation = config.rotation;
    if (config.scaleX !== undefined) el.scaleX = config.scaleX;
    if (config.scaleY !== undefined) el.scaleY = config.scaleY;
    if (config.skewX !== undefined) el.skewX = config.skewX;
    if (config.skewY !== undefined) el.skewY = config.skewY;
    if (config.pivotX !== undefined) el.pivotX = config.pivotX;
    if (config.pivotY !== undefined) el.pivotY = config.pivotY;
    if (config.alpha !== undefined) el.alpha = config.alpha;
    if (config.color !== undefined) el.color = config.color;
  }

  // Create test pairs
  const pairs = [];

  function createPair(x, y, label, configA, configB) {
    const container = new Container(`pair-${label}`);
    container.x = x;
    container.y = y;
    scene.root.addChild(container);

    const a = new Element(`${label}-A`);
    applyConfig(a, configA);
    a.interactive = true; // Ensure they get spatial hash entries
    container.addChild(a);

    const b = new Element(`${label}-B`);
    applyConfig(b, configB);
    b.interactive = true;
    container.addChild(b);

    pairs.push({ a, b, label });
    return { a, b };
  }

  // 1. Simple Overlap (Identity)
  createPair(
    50,
    50,
    "Simple",
    { x: 0, y: 0, width: 50, height: 50, color: "green" },
    { x: 25, y: 25, width: 50, height: 50, color: "green", alpha: 0.5 },
  );

  // 2. Rotated 45deg overlapping
  createPair(
    200,
    50,
    "Rotated-45",
    {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      color: "green",
      rotation: Math.PI / 4,
    },
    { x: 40, y: 0, width: 50, height: 50, color: "green", alpha: 0.5 },
  );

  // 3. Rotated 45deg NOT overlapping (but AABB might?)
  createPair(
    350,
    50,
    "Rotated-Gap",
    {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      color: "green",
      rotation: Math.PI / 4,
    },
    { x: 80, y: 0, width: 50, height: 50, color: "green", alpha: 0.5 },
  );

  // 4. Scaled & Rotated
  createPair(
    50,
    200,
    "Scaled-Rotated",
    {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      color: "green",
      rotation: Math.PI / 4,
      scaleX: 1.5,
      scaleY: 1.5,
    },
    { x: 50, y: 0, width: 50, height: 50, color: "green", alpha: 0.5 },
  );

  // 5. Pivot Point Test
  createPair(
    200,
    200,
    "Pivot",
    {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      color: "green",
      rotation: Math.PI / 4,
      pivotX: 25,
      pivotY: 25,
    },
    { x: 40, y: 0, width: 50, height: 50, color: "green", alpha: 0.5 },
  );

  // 6. Skew Test
  createPair(
    350,
    200,
    "Skew",
    { x: 0, y: 0, width: 50, height: 50, color: "green", skewX: 0.5 },
    { x: 40, y: 10, width: 50, height: 50, color: "green", alpha: 0.5 },
  );

  // 7. Parent Transform Test
  const p7 = createPair(
    50,
    350,
    "Parent-Rot",
    { x: 0, y: 0, width: 50, height: 50, color: "green" },
    { x: 30, y: 30, width: 50, height: 50, color: "green", alpha: 0.5 },
  );
  // Rotate the PARENT container
  const parent7 = p7.a.parent;
  parent7.rotation = Math.PI / 6;

  // Custom render callback to draw AABBs
  scene.ticker.setRenderCallback(() => {
    scene.render();

    const layer = scene.getLayer("default");
    const ctx = layer.ctx;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scene.dpr, scene.dpr);

    const interaction = scene.interaction;
    const entries = interaction._spatialEntries;

    for (const { a, b, label } of pairs) {
      const entryA = entries.get(a);
      const entryB = entries.get(b);

      let intersects = false;
      if (entryA && entryB) {
        const rectA = entryA.aabb;
        const rectB = entryB.aabb;

        intersects =
          rectA.x < rectB.x + rectB.width &&
          rectA.x + rectA.width > rectB.x &&
          rectA.y < rectB.y + rectB.height &&
          rectA.y + rectB.height > rectB.y;

        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 1;
        ctx.strokeRect(rectA.x, rectA.y, rectA.width, rectA.height);

        ctx.strokeStyle = "orange";
        ctx.strokeRect(rectB.x, rectB.y, rectB.width, rectB.height);
      }

      a.color = intersects ? "red" : "green";
      b.color = intersects ? "red" : "green";

      const pos = a.parent ? { x: a.parent.x, y: a.parent.y } : { x: 0, y: 0 };
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.fillText(label, pos.x, pos.y - 5);
    }

    ctx.restore();
  });

  for (const pair of scene.root.children) {
    if ("children" in pair) {
      for (const child of pair.children) {
        child.paint = (ctx) => {
          ctx.drawRect(0, 0, child.width, child.height, child.color || "green");
        };
      }
    }
  }
}
