export default async function (Arena2D, { signal }) {
  const { EventEmitter } = Arena2D;

  // ── Setup ──
  const logs = document.getElementById("event-logs");
  const emitter = new EventEmitter();
  let handlerCounter = 0;
  const handlerStack = [];

  function log(msg, type = "") {
    if (!logs) return;
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString().split(" ")[0];
    entry.innerHTML = `<span class="timestamp">${time}</span> ${msg}`;
    logs.appendChild(entry);
    logs.scrollTop = logs.scrollHeight;
  }

  // ── UI Controls ──

  // .on - adds a handler to the stack and the emitter
  document.getElementById("btn-on")?.addEventListener("click", () => {
    const id = ++handlerCounter;
    const handler = (e) => {
      log(`[Handler #${id}] received event: ${JSON.stringify(e)}`, "foo");
    };

    emitter.on("test-event", handler);
    handlerStack.push(handler);
    log(
      `Added persistent handler #${id}. Total active: ${handlerStack.length}`,
    );
  }, { signal });

  // .once - adds a single handler
  document.getElementById("btn-once")?.addEventListener("click", () => {
    const id = ++handlerCounter;
    emitter.once("test-event", (e) => {
      log(
        `[Once Handler #${id}] fired and removed! Payload: ${JSON.stringify(e)}`,
        "bar",
      );
    });
    log(`Added one-time handler #${id}.`);
  }, { signal });

  // .off - removes the last handler from the stack
  document.getElementById("btn-off")?.addEventListener("click", () => {
    const handler = handlerStack.pop();
    if (handler) {
      emitter.off("test-event", handler);
      log(
        `Removed last persistent handler. Remaining active: ${handlerStack.length}`,
      );
    } else {
      log("No persistent handlers to remove.", "bar");
    }
  }, { signal });

  // .emit - fires the event
  document.getElementById("btn-emit")?.addEventListener("click", () => {
    const payload = { timestamp: Date.now() };
    log(`Emitting 'test-event'...`);
    emitter.emit("test-event", payload);
  }, { signal });

  // .removeAllListeners - clears everything
  document.getElementById("btn-remove-all")?.addEventListener("click", () => {
    emitter.removeAllListeners();
    handlerStack.length = 0;
    log("Removed all listeners.", "bar");
  }, { signal });

  document.getElementById("btn-clear-logs")?.addEventListener("click", () => {
    if (logs) logs.innerHTML = "";
  }, { signal });

  log("EventEmitter ready. Waiting for events...");

  return {
    destroy: () => {
      emitter.removeAllListeners();
    }
  };
}
