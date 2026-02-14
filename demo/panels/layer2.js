/**
 * Layer 2 — Event Emitter — Demo Panel
 */
import { EventEmitter } from "/dist/canvasui.js";

(async () => {
  // ── Fetch and inject panel HTML ──
  const response = await fetch("panels/layer2.html");
  document.getElementById("layer-2").innerHTML = await response.text();

  // ── Setup ──
  const logs = document.getElementById("event-logs");
  const emitter = new EventEmitter();

  function log(msg, type = "") {
    if (!logs) return;
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString().split(" ")[0];
    entry.innerHTML = `<span class="timestamp">${time}</span> ${msg}`;
    logs.appendChild(entry);
    logs.scrollTop = logs.scrollHeight;
  }

  // ── Subscribers ──
  emitter.on("foo", (e) => {
    log(`[foo] received payload: ${JSON.stringify(e)}`, "foo");
  });

  emitter.once("bar", (e) => {
    log(
      `[bar] received payload: ${JSON.stringify(e)} (I am a 'once' listener)`,
      "bar",
    );
  });

  // Re-add 'bar' once listener after it fires so demo is repeatable?
  // Actually, let's keep it strictly 'once' to demonstrate the behavior.
  // But users might think it's broken if they click twice.
  // Let's add a persistent listener too.
  emitter.on("bar", (e) => {
    log(`[bar] persistent listener: ${JSON.stringify(e)}`, "bar");
  });

  // ── UI Controls ──
  document.getElementById("btn-emit-foo")?.addEventListener("click", () => {
    emitter.emit("foo", { count: Math.ceil(Math.random() * 100) });
  });

  document.getElementById("btn-emit-bar")?.addEventListener("click", () => {
    emitter.emit("bar", { msg: "Hello" });
    // Re-attach the 'once' listener if it's gone, so the button keeps doing something "once-like"
    // interactive feel:
    emitter.once("bar", (e) => {
      log(`[bar] 'once' listener re-armed`, "bar");
    });
  });

  document.getElementById("btn-clear-logs")?.addEventListener("click", () => {
    if (logs) logs.innerHTML = "";
  });

  log("EventEmitter ready. Waiting for events...");
})();
