export default async function (Arena2D) {
  const { Scene, ScrollContainer, Element, Text, Image } = Arena2D;

  const wrap = document.getElementById("l13-canvas-wrap");
  const scene = new Scene(wrap, 600, 400);
  scene.ticker.start();

  // ── Create ScrollContainer ──
  const sc = new ScrollContainer("demo-scroll");
  sc.x = 0;
  sc.y = 0;
  sc.width = 500;
  sc.height = 350;

  // Draw container background
  sc.paint = (ctx) => {
    ctx.drawRoundedRect(0, 0, sc.width, sc.height, 4, "#1a1a2e", "#444");
  };

  scene.root.addChild(sc);

  // ── Add Content ──
  // A large grid of elements to scroll through
  const cols = 10;
  const rows = 15;
  const itemW = 120;
  const itemH = 80;
  const gap = 20;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * (itemW + gap);
      const y = r * (itemH + gap);

      const card = new Element(`card-${c}-${r}`);
      card.x = x;
      card.y = y;
      card.width = itemW;
      card.height = itemH;

      // Draw background
      card.paint = (ctx) => {
        const isHover = card === scene.interaction.hoverElement;
        const color = isHover ? "#4a90d9" : "#2a2a3a";
        ctx.drawRoundedRect(0, 0, card.width, card.height, 8, color, "#444");

        ctx.drawText(`${c},${r}`, card.width / 2, card.height / 2, {
          fontSize: 14,
          fontFamily: "sans-serif",
          fill: "white",
          textAlign: "center",
          textBaseline: "middle"
        });
      };

      card.interactive = true;
      card.on("pointerdown", () => {
        console.log(`Clicked card ${c},${r}`);
      });

      sc.addChild(card);
    }
  }

  // ── Controls ──
  const widthSlider = document.getElementById("l13-width");
  const heightSlider = document.getElementById("l13-height");
  const wVal = document.getElementById("l13-w-val");
  const hVal = document.getElementById("l13-h-val");
  const scrollXCheck = document.getElementById("l13-scroll-x");
  const scrollYCheck = document.getElementById("l13-scroll-y");
  const inertiaCheck = document.getElementById("l13-inertia");
  const barsCheck = document.getElementById("l13-bars");
  const resetBtn = document.getElementById("l13-reset");
  const randomBtn = document.getElementById("l13-random");

  function update() {
    sc.width = Number(widthSlider.value);
    sc.height = Number(heightSlider.value);
    wVal.textContent = sc.width;
    hVal.textContent = sc.height;

    sc.scrollEnabledX = scrollXCheck.checked;
    sc.scrollEnabledY = scrollYCheck.checked;
    sc.inertiaEnabled = inertiaCheck.checked;
    sc.showScrollBars = barsCheck.checked;
  }

  [widthSlider, heightSlider, scrollXCheck, scrollYCheck, inertiaCheck, barsCheck].forEach(el => {
    el.addEventListener("input", update);
  });

  resetBtn.addEventListener("click", () => {
    sc.scrollTo(0, 0);
  });

  randomBtn.addEventListener("click", () => {
    const maxScrollX = Math.max(0, sc.contentBounds.width - sc.width);
    const maxScrollY = Math.max(0, sc.contentBounds.height - sc.height);
    sc.scrollTo(Math.random() * maxScrollX, Math.random() * maxScrollY);
  });

  // Stats updater "element"
  const statsUpdater = new Element("stats-updater");
  statsUpdater.update = (dt) => {
    const stats = document.getElementById("l13-stats");
    if (stats) {
      stats.textContent = `Scroll: ${Math.round(sc.scrollX)}, ${Math.round(sc.scrollY)} | Content: ${Math.round(sc.contentBounds.width)}×${Math.round(sc.contentBounds.height)}`;
    }
  };
  scene.ticker.add(statsUpdater);

  // Init
  update();
}
