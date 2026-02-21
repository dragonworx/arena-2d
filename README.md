# Arena-2D 🏟️

**High-Performance TypeScript Rendering Engine**

Arena-2D is a retained-mode, hardware-accelerated UI library for building rich 2D applications. It abstracts HTML5 Canvas into a high-level Virtual DOM (VDOM) featuring a multi-canvas layering system, a hybrid responsive layout engine, and pixel-perfect interaction.

[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> [!NOTE]
> While Arena-2D uses [Bun](https://bun.sh) for its build pipeline and development environment, the final package is compiled to standard ESM and is compatible with any modern TypeScript/JavaScript environment.

---

## ✨ Features

- 🏗️ **Layer Cake Architecture**: Clean dependency graph with strict isolation.
- 📐 **Hybrid Layout Engine**: CSS-like **Flexbox** and **Anchor** (absolute) positioning.
- ⚡ **High Performance**: Affine transformations via 2D matrices and GPU-composited layers.
- 🖱️ **Unified Interaction**: Normalized pointer and keyboard pipeline with event bubbling.
- 📝 **Rich Text Subsystem**: Greedy word-wrap, character-level metrics, and IME bridge support.
- 🖼️ **Nine-Slice Scaling**: Smart UI scaling for panels and buttons.
- 🏗️ **Retained Mode**: VDOM with intelligent dirty-flagging and `cacheAsBitmap` support.

---

## 🚀 Installation

Install the package via your preferred package manager:

```bash
# Using npm
npm install arena-2d

# Using bun
bun add arena-2d

# Using yarn
yarn add arena-2d
```

---

## 📖 General Usage

### 1. Basic Setup
Create a `Scene`, add some elements, and start the `Ticker`.

```typescript
import { Scene, Container, Ticker, Text } from 'arena-2d';

// 1. Initialize the Scene
const scene = new Scene(
  document.getElementById('app'),
  800,
  600
);

// 2. Create a Root Container
// scene.root is automatically created

// 3. Add a Container
const box = new Container();
box.width = 100;
box.height = 100;
scene.root.addChild(box);

// 4. Start the Loop
const ticker = new Ticker();
ticker.add(scene.root);
ticker.start();
```

---

## 🔥 Advanced Features Guide

### 🧩 Layered Rendering
Boost performance by splitting static and dynamic content into separate canvases.

```typescript
// Create a background layer for static elements
const bgLayer = scene.createLayer('background', 0);
const fgLayer = scene.createLayer('foreground', 1);

// Static elements stick to the background
const staticGrid = new Container();
staticGrid.layer = bgLayer;
scene.root.addChild(staticGrid);

// Dynamic/Interactive elements on the foreground
const player = new Container();
player.layer = fgLayer;
scene.root.addChild(player);
```

### 📏 Responsive Layout (Flex & Anchor)
Arena-2D provides a hybrid layout system that feels like CSS.

```typescript
const container = new Container();
container.style = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 20,
  padding: [10, 10, 10, 10]
};

// This child will grow to fill space
const sidebar = new Container();
sidebar.style = {
  width: 200,
  height: '100%'
};

// This child is anchored to the bottom-right
const fab = new Container();
fab.style = {
  display: 'anchor',
  right: 20,
  bottom: 20,
  width: 56,
  height: 56
};
```

### 🖱️ Event Bubbling & Interaction
Handle pointer events with a standard bubbling model.

```typescript
const button = new Container();
button.interactive = true;

button.on('pointerdown', (e) => {
  console.log('Button pressed at:', e.localX, e.localY);
});

button.on('pointerenter', () => {
  button.cursor = 'pointer';
  button.alpha = 0.8;
});

button.on('pointerleave', () => {
  button.cursor = 'default';
  button.alpha = 1.0;
});
```


---

## 🛠️ Development

```bash
# Run the live-reloading demo site
bun run dev

# Run unit tests
bun test

# Typecheck the project
bun run typecheck

# Lint the codebase
bun run lint

# Build the production bundle
bun run build
```

---

## 📜 Documentation
For a deep dive into the architecture and API, please refer to:
- [Product Requirements & Technical Specification](docs/PRD.md)

---

## 📄 License
MIT © [dragonworx](https://github.com/dragonworx)
