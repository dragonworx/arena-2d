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
- 🎞️ **Tweening System**: Built-in animation engine with standard easing functions.
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
import { Scene, Container, Ticker, Rect } from 'arena-2d';

// 1. Initialize the Scene
const scene = new Scene({
  container: document.getElementById('app'),
  width: 800,
  height: 600
});

// 2. Create a Root Container
const root = new Container();
scene.root.addChild(root);

// 3. Add an Element
const box = new Rect({
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  fill: '#ff0000'
});
root.addChild(box);

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
  button.animate({ scaleX: 1.1, scaleY: 1.1 }, { duration: 0.1 });
});

button.on('pointerleave', () => {
  button.animate({ scaleX: 1.0, scaleY: 1.0 }, { duration: 0.1 });
});
```

### 🎞️ Smooth Animations
Animate any property with built-in easing functions.

```typescript
import { Easing } from 'arena-2d';

element.animate({
  x: 500,
  rotation: Math.PI * 2,
  alpha: 0
}, {
  duration: 1.5,
  easing: Easing.easeOutBack,
  onComplete: () => element.destroy()
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
For a deep dive into the architecture and API, please refer to the following:
- [Product Requirements Document (PRD)](docs/PRD.md)
- [Technical Specification (SPEC)](docs/SPEC.md)

---

## 📄 License
MIT © [dragonworx](https://github.com/dragonworx)
