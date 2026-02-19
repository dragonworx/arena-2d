/**
 * Layer 11 — Text Input & IME Demo
 *
 * Demonstrates:
 * - Single-line text input with cursor and selection
 * - Password input with bullet masking
 * - Multiline text input (textarea)
 * - Placeholder text
 * - Submit event (Enter on single-line)
 * - Keyboard navigation (arrows, word jumps, line jumps)
 * - ReadOnly mode
 */

import("../../dist/arena-2d.js").then(async (CanvasUI) => {
  const response = await fetch("panels/layer11.html");
  document.getElementById("layer-11").innerHTML = await response.text();

  const { Scene, Container, TextInput, Text } = CanvasUI;

  // ── Controls ──
  const fontSizeSlider = document.getElementById("l11-font-size");
  const fontSizeVal = document.getElementById("l11-font-size-val");
  const inputWidthSlider = document.getElementById("l11-input-width");
  const inputWidthVal = document.getElementById("l11-input-width-val");
  const submitLog = document.getElementById("l11-submit-log");
  const eventLog = document.getElementById("l11-event-log");

  // ── Create Scene ──
  const sceneContainer = document.getElementById("l11-canvas-wrap");
  const scene = new Scene(sceneContainer, 600, 600);

  // Helper to log events
  function logEvent(msg) {
    const line = document.createElement("div");
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    eventLog.prepend(line);
    // Keep max 50 entries
    while (eventLog.children.length > 50) {
      eventLog.removeChild(eventLog.lastChild);
    }
  }

  function logSubmit(name, value) {
    const line = document.createElement("div");
    line.textContent = `${name}: "${value}"`;
    submitLog.prepend(line);
  }

  // ── Helper to draw input frame (label + background) ──
  function createInputBackground(y, width, height) {
    const bg = new Container();
    bg.x = 20;
    bg.y = y;
    bg.width = width;
    bg.height = height;
    bg.paint = (ctx) => {
      const raw = ctx.raw;
      // Background
      raw.fillStyle = "#2a2a3e";
      raw.beginPath();
      raw.roundRect(0, 0, width, height, 4);
      raw.fill();
      // Border
      raw.strokeStyle = "#444466";
      raw.lineWidth = 1;
      raw.stroke();
    };
    return bg;
  }

  // ── Create inputs ──

  let inputWidth = 350;
  const inputPadding = 8;
  const inputHeight = 32;
  const labelStyle = { fontSize: 13, color: "#888899" };

  // 1. Single-line input
  const label1 = new Text("label-name");
  label1.text = "Name";
  label1.x = 20;
  label1.y = 15;
  label1.updateTextStyle({ fontSize: 13, color: "#888899" });
  scene.root.addChild(label1);

  const bg1 = createInputBackground(32, inputWidth, inputHeight);
  scene.root.addChild(bg1);

  const nameInput = new TextInput("name-input");
  nameInput.x = 20 + inputPadding;
  nameInput.y = 32 + 7;
  nameInput.width = inputWidth - inputPadding * 2;
  nameInput.height = inputHeight;
  nameInput.placeholder = "Enter your name...";
  nameInput.updateTextStyle({ fontSize: 16, color: "#e0e0e0" });
  scene.root.addChild(nameInput);

  nameInput.on("submit", (e) => {
    logSubmit("Name", e.value);
    logEvent("submit: Name");
  });
  nameInput.on("change", (e) => {
    logEvent(`change: Name = "${e.value}"`);
  });
  nameInput.on("focus", () => logEvent("focus: Name"));
  nameInput.on("blur", () => logEvent("blur: Name"));

  // 2. Password input
  const label2 = new Text("label-password");
  label2.text = "Password";
  label2.x = 20;
  label2.y = 80;
  label2.updateTextStyle({ fontSize: 13, color: "#888899" });
  scene.root.addChild(label2);

  const bg2 = createInputBackground(97, inputWidth, inputHeight);
  scene.root.addChild(bg2);

  const passwordInput = new TextInput("password-input");
  passwordInput.x = 20 + inputPadding;
  passwordInput.y = 97 + 7;
  passwordInput.width = inputWidth - inputPadding * 2;
  passwordInput.height = inputHeight;
  passwordInput.isPassword = true;
  passwordInput.placeholder = "Enter password...";
  passwordInput.updateTextStyle({ fontSize: 16, color: "#e0e0e0" });
  scene.root.addChild(passwordInput);

  passwordInput.on("submit", (e) => {
    logSubmit("Password", "\u2022".repeat(e.value.length));
    logEvent("submit: Password");
  });
  passwordInput.on("change", () => logEvent("change: Password"));
  passwordInput.on("focus", () => logEvent("focus: Password"));
  passwordInput.on("blur", () => logEvent("blur: Password"));

  // 3. Read-only input
  const label3 = new Text("label-readonly");
  label3.text = "Read Only";
  label3.x = 20;
  label3.y = 145;
  label3.updateTextStyle({ fontSize: 13, color: "#888899" });
  scene.root.addChild(label3);

  const bg3 = createInputBackground(162, inputWidth, inputHeight);
  scene.root.addChild(bg3);

  const readOnlyInput = new TextInput("readonly-input");
  readOnlyInput.x = 20 + inputPadding;
  readOnlyInput.y = 162 + 7;
  readOnlyInput.width = inputWidth - inputPadding * 2;
  readOnlyInput.height = inputHeight;
  readOnlyInput.text = "This text cannot be edited";
  readOnlyInput.readOnly = true;
  readOnlyInput.updateTextStyle({ fontSize: 16, color: "#a0a0b0" });
  scene.root.addChild(readOnlyInput);

  readOnlyInput.on("focus", () => logEvent("focus: ReadOnly"));
  readOnlyInput.on("blur", () => logEvent("blur: ReadOnly"));

  // 4. Multiline input (textarea)
  const label4 = new Text("label-multiline");
  label4.text = "Message (multiline)";
  label4.x = 20;
  label4.y = 210;
  label4.updateTextStyle({ fontSize: 13, color: "#888899" });
  scene.root.addChild(label4);

  const multiHeight = 140;
  const bg4 = createInputBackground(227, inputWidth, multiHeight);
  scene.root.addChild(bg4);

  const multiInput = new TextInput("multi-input");
  multiInput.x = 20 + inputPadding;
  multiInput.y = 227 + 7;
  multiInput.width = inputWidth - inputPadding * 2;
  multiInput.height = multiHeight - 14;
  multiInput.multiline = true;
  multiInput.placeholder = "Type a message...\n(Enter creates new lines)";
  multiInput.updateTextStyle({ fontSize: 16, color: "#e0e0e0" });
  scene.root.addChild(multiInput);

  multiInput.on("change", (e) => {
    logEvent(`change: Multiline (${e.value.length} chars)`);
  });
  multiInput.on("focus", () => logEvent("focus: Multiline"));
  multiInput.on("blur", () => logEvent("blur: Multiline"));

  // 5. Max-length input
  const label5 = new Text("label-maxlen");
  label5.text = "Max 20 chars";
  label5.x = 20;
  label5.y = 385;
  label5.updateTextStyle({ fontSize: 13, color: "#888899" });
  scene.root.addChild(label5);

  const bg5 = createInputBackground(402, inputWidth, inputHeight);
  scene.root.addChild(bg5);

  const maxLenInput = new TextInput("maxlen-input");
  maxLenInput.x = 20 + inputPadding;
  maxLenInput.y = 402 + 7;
  maxLenInput.width = inputWidth - inputPadding * 2;
  maxLenInput.height = inputHeight;
  maxLenInput.maxLength = 20;
  maxLenInput.placeholder = "Max 20 characters...";
  maxLenInput.updateTextStyle({ fontSize: 16, color: "#e0e0e0" });
  scene.root.addChild(maxLenInput);

  maxLenInput.on("change", (e) => {
    logEvent(`change: MaxLen (${e.value.length}/20)`);
  });
  maxLenInput.on("submit", (e) => {
    logSubmit("MaxLen", e.value);
  });

  // 6. Regex Filter (Numbers Only)
  const label6 = new Text("label-numbers");
  label6.text = "Numbers Only (Regex Filter)";
  label6.x = 20;
  label6.y = 450;
  label6.updateTextStyle({ fontSize: 13, color: "#888899" });
  scene.root.addChild(label6);

  const bg6 = createInputBackground(467, inputWidth, inputHeight);
  scene.root.addChild(bg6);

  const numbersInput = new TextInput("numbers-input");
  numbersInput.x = 20 + inputPadding;
  numbersInput.y = 467 + 7;
  numbersInput.width = inputWidth - inputPadding * 2;
  numbersInput.height = inputHeight;
  numbersInput.filter = /^\d*$/;
  numbersInput.placeholder = "Numbers only...";
  numbersInput.updateTextStyle({ fontSize: 16, color: "#e0e0e0" });
  scene.root.addChild(numbersInput);

  numbersInput.on("change", (e) => {
    logEvent(`change: Numbers = "${e.value}"`);
  });

  // 7. Function Filter (Uppercase)
  const label7 = new Text("label-upper");
  label7.text = "Uppercase (Function Filter)";
  label7.x = 20;
  label7.y = 515;
  label7.updateTextStyle({ fontSize: 13, color: "#888899" });
  scene.root.addChild(label7);

  const bg7 = createInputBackground(532, inputWidth, inputHeight);
  scene.root.addChild(bg7);

  const upperInput = new TextInput("upper-input");
  upperInput.x = 20 + inputPadding;
  upperInput.y = 532 + 7;
  upperInput.width = inputWidth - inputPadding * 2;
  upperInput.height = inputHeight;
  upperInput.filter = (val) => val.toUpperCase();
  upperInput.placeholder = "Will be uppercased...";
  upperInput.updateTextStyle({ fontSize: 16, color: "#e0e0e0" });
  scene.root.addChild(upperInput);

  upperInput.on("change", (e) => {
    logEvent(`change: Upper = "${e.value}"`);
  });

  // ── Start render loop ──
  scene.ticker.start();

  // ── Control handlers ──
  function updateInputs() {
    const fontSize = Number.parseInt(fontSizeSlider.value);
    inputWidth = Number.parseInt(inputWidthSlider.value);

    fontSizeVal.textContent = `${fontSize}px`;
    inputWidthVal.textContent = `${inputWidth}px`;

    const inputs = [
      nameInput,
      passwordInput,
      readOnlyInput,
      multiInput,
      maxLenInput,
      numbersInput,
      upperInput,
    ];
    for (const inp of inputs) {
      inp.updateTextStyle({ fontSize });
      inp.width = inputWidth - inputPadding * 2;
    }

    // Update backgrounds
    const bgs = [bg1, bg2, bg3, bg4, bg5, bg6, bg7];
    for (const bg of bgs) {
      bg.width = inputWidth;
      bg.paint = (ctx) => {
        const raw = ctx.raw;
        raw.fillStyle = "#2a2a3e";
        raw.beginPath();
        raw.roundRect(0, 0, inputWidth, bg.height, 4);
        raw.fill();
        raw.strokeStyle = "#444466";
        raw.lineWidth = 1;
        raw.stroke();
      };
    }
  }

  fontSizeSlider.addEventListener("input", updateInputs);
  inputWidthSlider.addEventListener("input", updateInputs);
});
