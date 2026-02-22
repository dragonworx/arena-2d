export default async function (Arena2D) {
  const { Scene, View, ScrollContainer, Element, Text, Image } = Arena2D;

  const wrap = document.getElementById("l13-canvas-wrap");
  const scene = new Scene(600, 400);
  const view = new View(wrap, scene);
  view.resize(600, 400);
  scene.ticker.start();

  // ── Create ScrollContainer ──
  const sc = new ScrollContainer("demo-scroll");
  sc.x = 0;
  sc.y = 0;
  sc.width = 500;
  sc.height = 350;

  // Draw container background
  sc.paint = (ctx) => {
    ctx.drawRoundedRect(0, 0, sc.width, sc.height, 4, { fillColor: "#1a1a2e", strokeColor: "#444" });
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
      try {
        const x = c * (itemW + gap);
        const y = r * (itemH + gap);

        const card = new Element(`card-${c}-${r}`);
        card.x = x;
        card.y = y;
        card.width = itemW;
        card.height = itemH;

        // Track flash state for this card
        let cardFlashAlpha = 0;

        // Draw background
        card.paint = (ctx) => {
          const isHover = card === view.interaction.hoverElement;
          let color = isHover ? "#4a90d9" : "#2a2a3a";

          // Mix in red flash if card was recently clicked (only if not during drag)
          if (cardFlashAlpha > 0) {
            const intensity = cardFlashAlpha;
            const r1 = parseInt(color.slice(1, 3), 16);
            const g1 = parseInt(color.slice(3, 5), 16);
            const b1 = parseInt(color.slice(5, 7), 16);
            const r2 = 255;
            const g2 = 107;
            const b2 = 107;
            const r = Math.round(r1 + (r2 - r1) * intensity);
            const g = Math.round(g1 + (g2 - g1) * intensity);
            const b = Math.round(b1 + (b2 - b1) * intensity);
            color = `rgb(${r},${g},${b})`;
          }

          ctx.drawRoundedRect(0, 0, card.width, card.height, 8, { fillColor: color, strokeColor: "#444" });

          ctx.drawText(`${c},${r}`, card.width / 2, card.height / 2, {
            fontSize: 14,
            fontFamily: "sans-serif",
            fill: "white",
            textAlign: "center",
            textBaseline: "middle"
          });
        };

        // Fade the flash effect each frame (preserve Element's update for transforms)
        const originalUpdate = card.update.bind(card);
        card.update = (dt) => {
          originalUpdate(dt);
          if (cardFlashAlpha > 0) {
            cardFlashAlpha *= 0.9;
          }
        };

        card.interactive = true;
        // Listen ONLY to deferred click events, not the immediate pointerdown
        card.on("deferred-click", () => {
          cardFlashAlpha = 1.0;
          // Fade back to normal after 2 seconds
          setTimeout(() => {
            cardFlashAlpha = 0;
          }, 2000);
        });

        sc.addChild(card);
      } catch (e) {
        console.error(`Failed to create card ${c},${r}:`, e);
      }
    }
  }

  // ── Controls ──
  const widthSlider = document.getElementById("l13-width");
  const heightSlider = document.getElementById("l13-height");
  const thresholdSlider = document.getElementById("l13-threshold");
  const wVal = document.getElementById("l13-w-val");
  const hVal = document.getElementById("l13-h-val");
  const thresholdVal = document.getElementById("l13-threshold-val");
  const scrollXCheck = document.getElementById("l13-scroll-x");
  const scrollYCheck = document.getElementById("l13-scroll-y");
  const inertiaCheck = document.getElementById("l13-inertia");
  const dragCheck = document.getElementById("l13-drag");
  const resetBtn = document.getElementById("l13-reset");
  const randomBtn = document.getElementById("l13-random");

  function update() {
    sc.width = Number(widthSlider.value);
    sc.height = Number(heightSlider.value);
    wVal.textContent = sc.width;
    hVal.textContent = sc.height;

    const threshold = Number(thresholdSlider.value);
    view.interaction.clickDeferralThreshold = threshold;
    thresholdVal.textContent = threshold;

    sc.scrollEnabledX = scrollXCheck.checked;
    sc.scrollEnabledY = scrollYCheck.checked;
    sc.inertiaEnabled = inertiaCheck.checked;
    sc.dragEnabled = dragCheck.checked;
  }

  [widthSlider, heightSlider, thresholdSlider, scrollXCheck, scrollYCheck, inertiaCheck, dragCheck].forEach(el => {
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
