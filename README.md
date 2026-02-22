# Arena-2D 🏟️

**High-Performance TypeScript Rendering Engine for Rich 2D Applications**

Arena-2D is a retained-mode, hardware-accelerated Canvas library that abstracts the raw canvas API into a high-level Virtual DOM. Build pixel-perfect, responsive 2D apps with ease—from interactive dashboards and data visualizations to real-time games and creative tools.

[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> [!NOTE]
> While Arena-2D uses [Bun](https://bun.sh) for its build pipeline, the final package compiles to standard ESM and works with any modern TypeScript/JavaScript environment.

---

## 🚀 Installation

```bash
# Using npm
npm install arena-2d

# Using bun
bun add arena-2d

# Using yarn
yarn add arena-2d
```

---

## ⚡ Core Features

### 🎯 Retained-Mode VDOM

Think React, but for Canvas. Define your scene graph once, then mutate properties. Arena-2D intelligently tracks dirty state and only redraws what changed.

**Use cases:** Dashboards, live charts, editor UIs, anything that updates frequently without full redraws.

```typescript
import { Scene, Container } from 'arena-2d';

const scene = new Scene(document.getElementById('app'), 800, 600);
const box = new Container();
box.x = 100;
box.y = 50;
box.width = 200;
box.height = 150;
scene.root.addChild(box);

// Later: just update properties
box.x = 200; // Only that property is redrawn
```

---

### 📐 Hybrid Layout Engine

CSS-like **Flexbox** layout for responsive designs + **Anchor positioning** for fixed elements. Perfect for building UI frameworks on canvas.

**Use cases:** Responsive UIs, panels, dashboards, game HUDs.

```typescript
const container = new Container();
container.style = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 16,
  padding: [10, 10, 10, 10]
};

// Anchor a floating button to bottom-right
const fab = new Container();
fab.style = {
  display: 'anchor',
  right: 20,
  bottom: 20,
  width: 56,
  height: 56
};
scene.root.addChild(fab);
```

---

### 🖱️ Unified Interaction Model

Pointer events with event bubbling, keyboard input, focus management, and precise hit-testing. Feels like DOM events but optimized for canvas.

**Use cases:** Interactive tools, games, button interfaces, draggable elements.

```typescript
const button = new Container();
button.interactive = true;

button.on('pointerdown', (e) => {
  console.log('Clicked at:', e.localX, e.localY);
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

### 🎨 Affine Transformations

Full support for 2D matrix transforms: position, rotation, scale, skew, and pivot points. All computed in hardware via canvas transforms.

**Use cases:** Animated UI, rotating objects, zoom + pan interactions, complex animations.

```typescript
const shape = new Container();
shape.x = 200;
shape.y = 150;
shape.rotation = Math.PI / 4; // 45 degrees
shape.scaleX = 1.5;
shape.scaleY = 0.8;
shape.pivotX = 50; // Rotate around center
shape.pivotY = 50;
```

---

### 📝 Rich Text & Typography

Character-level text metrics, word-wrap with greedy algorithms, multiline support, text alignment, and font styling. Full IME bridge for international text input.

**Use cases:** Text editors, form inputs, rich UI text, multilingual apps.

```typescript
import { Text } from 'arena-2d';

const label = new Text('Hello, world!');
label.style = {
  fontSize: 16,
  fontFamily: 'sans-serif',
  fill: '#ffffff'
};

// Or editable input
const textInput = new TextInput();
textInput.width = 300;
textInput.placeholder = 'Enter text...';
textInput.on('submit', (value) => console.log('Submitted:', value));
```

---

### 🎬 Multi-View Rendering

Render the same scene graph to multiple canvases with independent transforms. Zoom and pan each view separately—perfect for CAD-style interfaces.

**Use cases:** CAD tools, minimap + main view, quad-view editors, split-screen games.

```typescript
const scene = new Scene(document.getElementById('main'), 800, 600);

// Create 4 views of the same scene, each with independent zoom/pan
const quadView1 = scene.createView(0, 0, 400, 300);
const quadView2 = scene.createView(400, 0, 400, 300);
const quadView3 = scene.createView(0, 300, 400, 300);
const quadView4 = scene.createView(400, 300, 400, 300);
```

---

### 🎬 Independent Animation Timelines

Nested `Ticker` instances with independent frame rates. Animate different parts of your app at different speeds.

**Use cases:** Complex animations, UI transitions, background effects, games with multiple time scales.

```typescript
const mainTicker = new Ticker();
mainTicker.fps = 60;
mainTicker.add(scene.root);

// Slow animation on a child element
const slowTicker = new Ticker();
slowTicker.fps = 12; // Slower
mainTicker.add(slowTicker);
slowTicker.add(slowAnimatedElement);

mainTicker.start();
```

---

### 📜 Scroll Containers with Momentum

Virtualized scroll areas with viewport clipping, drag-to-scroll, and inertia. Built-in click-deferral for distinguishing drag from tap.

**Use cases:** Long lists, scrollable panels, mobile-style UIs, content viewers.

```typescript
import { ScrollContainer } from 'arena-2d';

const scroller = new ScrollContainer();
scroller.width = 400;
scroller.height = 300;
scroller.scrollable.x = true;
scroller.scrollable.y = true;

// Add content that overflows
const content = new Container();
content.width = 800;
content.height = 1200;
scroller.addChild(content);
```

---

### 🖼️ Image & Sprite Rendering

Standard image painting, sprite sheet support with column/row indexing, and **nine-slice scaling** for flexible UI panels.

**Use cases:** Game assets, UI graphics, scaling panels, sprite animations.

```typescript
import { Image, NineSlice } from 'arena-2d';

// Standard image
const img = new Image('assets/texture.png');
img.width = 200;
img.height = 200;

// Nine-slice panel (scales borders, stretches center)
const panel = new NineSlice('assets/panel.png', {
  top: 16,
  right: 16,
  bottom: 16,
  left: 16
});
panel.width = 400;
panel.height = 200;
```

---

### 🎨 Advanced Rendering Primitives

Draw shapes, gradients, shadows, and apply clipping—all with automatic state management. Wraps Canvas2D with a clean, predictable API.

**Use cases:** Custom visualizations, graph rendering, generative art, debug overlays.

```typescript
const ctx = scene.context; // Arena2DContext

ctx.fillStyle = '#ff6b6b';
ctx.fillRect(100, 100, 200, 150);

// Gradient
const gradient = ctx.createLinearGradient(0, 0, 200, 0);
gradient.addColorStop(0, '#ff6b6b');
gradient.addColorStop(1, '#ffd93d');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 200, 200);

// Shadow
ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
ctx.shadowBlur = 10;
ctx.shadowOffsetX = 2;
ctx.shadowOffsetY = 2;
```

---

### 🔄 Layer Composition

Split static and dynamic content into separate canvas layers. Huge performance win for apps with lots of static visuals.

**Use cases:** Games with static backgrounds, dashboards with static grids, complex scenes.

```typescript
const bgLayer = scene.createLayer('background', 0);
const fgLayer = scene.createLayer('foreground', 1);

// Static grid stays in background layer
const grid = new Container();
grid.layer = bgLayer;
scene.root.addChild(grid);

// Dynamic player updates foreground only
const player = new Container();
player.layer = fgLayer;
scene.root.addChild(player);
```

---

### ⚙️ Debug Mode & Error Handling

Automatic validation and correction of invalid values (NaN, Infinity, zero scale). Optional debug logging surfaces warnings when things go wrong.

**Use cases:** Development, catching bugs early, stress testing, performance profiling.

```typescript
import { enableDebugMode } from 'arena-2d';

enableDebugMode(true);

// Invalid values are corrected
element.alpha = NaN; // Silently corrected to 1.0
element.x = Infinity; // Corrected to safe value

// Logs warnings when appropriate
// e.g., destroying scene without cleanup, >500 uncached elements, etc.
```

---

## 📚 Getting Started

### 1. Create a Scene

```typescript
import { Scene, Ticker, Container } from 'arena-2d';

const scene = new Scene(
  document.getElementById('app'),
  800, // width
  600  // height
);
```

### 2. Add Elements

```typescript
const box = new Container();
box.width = 100;
box.height = 100;
box.style = { backgroundColor: '#3498db' };
scene.root.addChild(box);
```

### 3. Start the Animation Loop

```typescript
const ticker = new Ticker();
ticker.add(scene.root);
ticker.start();
```

### 4. Interact & Animate

```typescript
box.interactive = true;
box.on('pointerdown', () => {
  box.x += 20;
});

// Or animate with tweens
import { TweenManager, Easing } from 'arena-2d';

const tween = TweenManager.to(box, { x: 400, y: 300 }, 1000, {
  easing: Easing.easeOutQuad
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

## 📖 Learn More

For a deep dive into architecture and API details:
- [Product Requirements & Technical Specification](docs/PRD.md)

---

## 📄 License

MIT © [dragonworx](https://github.com/dragonworx)
