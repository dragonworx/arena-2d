# Arena-2D — Product Requirements & Technical Specification

> A layered implementation plan for building Arena2D from the ground up, where each stage can be tested and refined before the next begins.

---

## Tech Stack

| Concern | Tool |
|---|---|
| Runtime & Bundler | **Bun** (`bun build`, `bun run`) |
| Language | **TypeScript** (strict mode) |
| Test Runner | **Bun** built-in test runner (`bun test`) |
| Linter | **Biome** (`bunx biome check`) |
| Dev Server | **Bun** HTTP server (`Bun.serve`) with live-reload |
| Demo App | Single-page HTML app served by the dev server |
| Package Format | ESM-only. Entry point: `src/index.ts` |
| CI | `bun run typecheck` + `bun run lint` + `bun test` + `bun run build` |

---

## Guiding Principles

1. **Layer Cake Architecture** — Each stage builds only on the stages below it. No forward references.
2. **Demo-First** — The functional demo site is set up in Layer 0, before any library code, so that every subsequent layer can be immediately inspected in the browser.
3. **Test-as-you-go** — Each layer ships with unit tests. The demo page gains a new visual panel for every layer, serving as a functional integration test.
4. **Narrow API Surface** — Export only what is defined in this Product Requirements Document. Keep internals unexported behind `src/internal/`.
5. **Zero Dependencies** — The library has no runtime npm dependencies.

---

## Dependency Graph

```
Layer 0  Project Scaffold & Demo Site
  │
Layer 1  Core Math & Transformation Engine
  │
Layer 2  Event Emitter
  │
Layer 3  Element Base & Dirty Flagging (VDOM Core)
  │
Layer 4  Container & Child Management
  │
Layer 5  Ticker (Frame Loop)
  │
Layer 6  Rendering Wrapper (Arena2DContext)
  │
Layer 7  Scene & Layering System
  │
  ├──────────────────────────────────┐
Layer 8  Layout Engine              Layer 9  Interaction & Focus System
  │                                   │
  └──────────────────────────────────┘
  │
Layer 10  Text & Text Layout
  │
Layer 11  Text Input & IME
  │
Layer 12  Image & Nine-Slice
  │
Layer 13  Scroll Containers
  │
Layer 14  Error Handling, Debug Mode & Memory Management
  │
Layer 15  API Surface, Bundle & Documentation
```

> **Reading the graph:** An arrow from A → B means "B depends on A". Layers 8 and 9 can be developed in parallel — they both depend on Layer 7 but not on each other. All subsequent layers depend on both.

---

## Layer 0 — Project Scaffold & Demo Site

### Goal
Establish the project skeleton, build pipeline, and a live-reloading demo site that will serve as the visual test-bed for all future layers.

### Deliverables

| # | Item | Details |
|---|---|---|
| 0.1 | **Directory structure** | `src/`, `src/internal/`, `tests/`, `demo/`, `demo/panels/`, `dist/` |
| 0.2 | **`package.json`** | `name: "arena-2d"`, `type: "module"`, scripts: `dev`, `build`, `test` |
| 0.3 | **`tsconfig.json`** | `strict: true`, `target: "ESNext"`, `module: "ESNext"`, `outDir: "dist"` |
| 0.4 | **Bun dev server** | `demo/server.ts` — serves `demo/index.html` + live-reload via WebSocket on file change |
| 0.5 | **Demo shell page** | `demo/index.html` — dark-themed page with a sidebar listing each layer's demo panel and a main content area. Each layer's interactive JS lives in `demo/panels/layerN.js` and is loaded via `<script src>`. Initially shows "Layer 0 — Scaffold Ready" |
| 0.6 | **`bun build` entry** | Bundles `src/index.ts` → `dist/arena-2d.js` (ESM) |
| 0.7 | **Smoke test** | `tests/scaffold.test.ts` — validates the build produces a valid ESM bundle |

### Acceptance Criteria
- `bun run dev` starts the server on `localhost:3000` and opens the demo page.
- `bun run build` produces `dist/arena-2d.js`.
- `bun test` passes.
- Editing any file under `src/` or `demo/` triggers a browser reload.

### Demo Panel
Static "Hello, Arena2D" card confirming the pipeline works.

---

## Layer 1 — Core Math & Transformation Engine

### Philosophy
To achieve GPU-level performance, Arena2D uses 2D Affine Transformation Matrices. This allows complex hierarchies (nesting, rotation, scaling) to be resolved through simple matrix multiplication rather than manual coordinate math.

### Mechanics
- **Matrix Storage**: Stored as `Float32Array(6)` representing the values `[a, b, c, d, tx, ty]`. This follows the **column-major** convention matching the HTML Canvas `setTransform(a, b, c, d, e, f)` parameter order.
- **Identity**: `[1, 0, 0, 1, 0, 0]`.
- **World Matrix**: Calculated as `Parent.WorldMatrix × Local.Matrix` (left-multiply; parent is the left operand).
- **AABB Calculation**: The World Axis-Aligned Bounding Box is derived by transforming the four corners of an element's local bounds through `worldMatrix` and finding the min/max X and Y.
- **Skew**: Supported via `skewX` and `skewY` (in radians). Skew is applied as a shear transformation.

### Behavioral Rules
1. When any of `x`, `y`, `rotation`, `scaleX`, `scaleY`, `skewX`, `skewY`, `pivotX`, or `pivotY` change, the element must call `invalidate(DirtyFlags.Transform)`.
2. When an element's transform is invalidated, **all descendants** must also be marked `DirtyFlags.Transform` (cascading downward through the tree). The cascade happens lazily during the next `update()` pass, not eagerly on set.
3. `worldMatrix` is recomputed during `update()` only if `DirtyFlags.Transform` is set. After recomputation the flag is cleared.
4. The local matrix is composed as: `Translate(x, y) × Rotate(rotation) × Skew(skewX, skewY) × Scale(scaleX, scaleY) × Translate(-pivotX, -pivotY)`. The pivot point `(pivotX, pivotY)` in local space always maps to `(x, y)` in parent space — changing the pivot repositions the element around a fixed anchor.

### API Contract
```typescript
export type MatrixArray = Float32Array; // [a, b, c, d, tx, ty]

export interface ITransform {
  localMatrix: MatrixArray;
  worldMatrix: MatrixArray;
  x: number;
  y: number;
  rotation: number;       // Radians, clockwise.
  skewX: number;          // Radians. Default: 0.
  skewY: number;          // Radians. Default: 0.
  scaleX: number;          // Default: 1. Must not be 0.
  scaleY: number;          // Default: 1. Must not be 0.
  pivotX: number;          // Local-space pivot X. Default: 0.
  pivotY: number;          // Local-space pivot Y. Default: 0.
  updateLocalMatrix(): void;
}

export interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 1.1 | **`src/math/matrix.ts`** | `MatrixArray` type, `identity()`, `multiply(a, b)`, `translate()`, `rotate()`, `scale()`, `invert()`, `transformPoint()` |
| 1.2 | **`src/math/aabb.ts`** | `computeAABB(localBounds, worldMatrix)` returning `IRect` |
| 1.3 | **`ITransform` mixin / base** | Properties (`x`, `y`, `rotation`, `scaleX`, `scaleY`, `pivotX`, `pivotY`) with `updateLocalMatrix()` composing as specified. |
| 1.4 | **Unit tests** | Exercise identity, composition, inversion, pivoted rotation, AABB from rotated rect, edge cases (`scaleX = -1`, very small angles) |

### Acceptance Criteria
- All matrix operations produce results matching hand-calculated values within `1e-6` tolerance.
- `bun test` passes all math tests.

### Demo Panel
A live canvas showing a rectangle with draggable sliders for `x`, `y`, `rotation`, `scaleX`, `scaleY`, `pivotX`, `pivotY`. The rectangle's world-space AABB is drawn as a dashed overlay.

---

## Layer 2 — Event Emitter

### Philosophy
A minimal, typed event emitter that `IElement` will later extend. This allows for unified event handling and decoupling of components.

### API Contract
```typescript
export interface IEventEmitter {
  on(event: string, handler: (e: any) => void): void;
  off(event: string, handler: (e: any) => void): void;
  once(event: string, handler: (e: any) => void): void;
  emit(event: string, e: any): void;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 2.1 | **`src/events/EventEmitter.ts`** | `on()`, `off()`, `once()`, `emit()` — handler list per event name. `once` auto-removes after first call. |
| 2.2 | **Unit tests** | Add/remove/once, emit with payload, multiple handlers per event, `off` during `emit` safety |

### Acceptance Criteria
- Emitting an event invokes all registered handlers in registration order.
- `off` during an `emit` callback does not skip or double-fire other handlers.

### Demo Panel
No new visual demo for this layer (utility only). Existing demos continue to work.

---

## Layer 3 — Element Base & Dirty Flagging (VDOM Core)

### Philosophy
A retained-mode system where the library tracks object states. Updates are "pushed" via property setters, and rendering is batched into a single tick per frame.

### Mechanics
- **Dirty Flagging**: Elements track changes using a bitmask. Property setters call `invalidate()` with the relevant flag. Multiple invalidations within a frame are coalesced.

### Behavioral Rules
1. **Dirty Flags**:
    - `Transform`: Recompute `worldMatrix` and AABB. Cascades to all descendants.
    - `Visual`: Repaint element. Does **not** cascade unless `cacheAsBitmap` ancestor exists.
    - `Layout`: Re-run layout resolver for this element's subtree.
    - `Spatial`: Re-insert into `SpatialHashGrid`.
2. **Alpha Compositing**: `alpha` is **multiplicative** through the hierarchy. An element's effective alpha is `parent.effectiveAlpha * element.alpha`. When `effectiveAlpha` reaches `0`, the element and all descendants are skipped during `paint()`.
3. **Element ID**: `id` is user-provided and optional. Defaults to an auto-generated UUID.

### API Contract
```typescript
export enum DirtyFlags {
  None      = 0,
  Transform = 1 << 0,
  Visual    = 1 << 1,
  Layout    = 1 << 2,
  Spatial   = 1 << 3,
  All       = 0b1111,
}

export interface IElement extends ITransform {
  readonly id: string;
  parent: IContainer | null;
  scene: IScene | null;
  layer: ILayer | null;

  // Visual state
  visible: boolean;               // Default: true. When false, skip paint() and hit-testing.
  alpha: number;                  // Range [0, 1]. Default: 1. Multiplied with parent alpha.
  zIndex: number;                 // Default: 0. Integer.
  blendMode: GlobalCompositeOperation; // Default: 'source-over'.
  cacheAsBitmap: boolean;         // Default: false.

  // Dirty system
  readonly dirtyFlags: DirtyFlags;
  invalidate(flag: DirtyFlags): void;

  // Lifecycle (called by the framework, not the user)
  onAdded(parent: IContainer): void;
  onRemoved(parent: IContainer): void;
  onSceneChanged(scene: IScene | null): void;

  // Frame loop
  update(dt: number): void;       // Called once per tick. Resolve dirty flags.
  paint(ctx: IArena2DContext): void; // Called once per render. Draw self.

  // Disposal
  destroy(): void;                // Release all resources
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 3.1 | **`src/core/DirtyFlags.ts`** | Enum: `None`, `Transform`, `Visual`, `Layout`, `Spatial`, `All` |
| 3.2 | **`src/core/Element.ts`** | Implements `IElement` + `IEventEmitter`. Property setters call `invalidate()`. `update(dt)` resolves `Transform` flag, recomputes `worldMatrix`. |
| 3.3 | **Alpha chain** | `effectiveAlpha` = `parent.effectiveAlpha * alpha`, clamped `[0, 1]`. |
| 3.4 | **`visible` / `zIndex` / `blendMode`** | Set defaults, wire setters to `Visual` dirty flag. |
| 3.5 | **`destroy()`** | Detach from parent, clear listeners, clear flags. |
| 3.6 | **Unit tests** | Dirty flag coalescing (multiple sets → single flag), lifecycle hook ordering, alpha multiplicativity, destroy cleanup |

### Acceptance Criteria
- Setting a transform property marks `DirtyFlags.Transform`.
- Calling `update()` clears the flag and recomputes `worldMatrix`.
- `effectiveAlpha` is correctly multiplicative through a manually-linked parent.

### Demo Panel
A grid of colored squares. Clicking a square toggles its `visible`. Sliders control a "parent" alpha that multiplicatively affects all children.

---

## Layer 4 — Container & Child Management

### Mechanics
- **Cache-As-Bitmap**: Containers can render their entire sub-tree to an `OffscreenCanvas`. This image is used in subsequent frames until a child is invalidated, saving thousands of draw calls for static UI.

### Behavioral Rules
1. **Lifecycle Hooks**: `onAdded`, `onSceneChanged`, `onRemoved` (propagates to descendants).
2. **Rendering Order**: `zIndex` order (ascending). Ties broken by insertion order. `sortChildren()` performs stable sort.
3. **Cache-As-Bitmap Invalidation**: bubbles upward to the nearest `cacheAsBitmap` ancestor. The `OffscreenCanvas` is sized to the container's AABB.

### API Contract
```typescript
export interface IContainer extends IElement {
  readonly children: ReadonlyArray<IElement>;
  clipContent: boolean;           // Default: false. If true, clip painting to this container's bounds.

  addChild(child: IElement): void;
  addChildAt(child: IElement, index: number): void;
  removeChild(child: IElement): void;
  removeAllChildren(): void;
  sortChildren(): void;           // Stable sort by zIndex.
  getChildByID(id: string): IElement | null;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 4.1 | **`src/core/Container.ts`** | `addChild`, `addChildAt`, `removeChild`, `removeAllChildren`, `sortChildren` (stable sort by `zIndex`), `getChildByID`, `clipContent` |
| 4.2 | **Scene propagation** | `onAdded` / `onRemoved` / `onSceneChanged` cascade to all descendants. Re-parenting (adding a child that already has a parent) silently removes from old parent first. |
| 4.3 | **Transform cascade** | On `invalidate(Transform)`, cascade `DirtyFlags.Transform` to all descendants lazily. |
| 4.4 | **Cache-as-bitmap** | `cacheAsBitmap` renders subtree to `OffscreenCanvas`. Descendant `Visual`/`Transform` invalidation bubbles up to nearest cached ancestor, discarding the cache. |
| 4.5 | **Unit tests** | Insert order vs. z-order rendering, re-parenting, cascade invalidation depth, cache invalidation via deep child |

### Acceptance Criteria
- Stable sort verified: same-`zIndex` children maintain insertion order.
- Re-parenting removes from old parent before adding to new (no duplicate).
- Cache-as-bitmap invalidation correctly bubbles from arbitrary depth.

### Demo Panel
A nested container tree visualized as colored boxes-within-boxes. Buttons to add/remove/reorder children. Toggle cache-as-bitmap with a visual indicator showing cache hit/miss count.

---

## Layer 5 — Ticker (Frame Loop)

### Philosophy
A single `requestAnimationFrame` loop drives the entire system. The Ticker provides a stable `deltaTime` and orchestrates the update → layout → paint pipeline in order.

### Mechanics
Each frame proceeds in this exact order:
1. **Tick**: Compute `deltaTime` (time since last frame, in **seconds**, capped at `maxDeltaTime`).
2. **Update**: Walk the scene graph and call `update(dt)` on every element that has `DirtyFlags != None`.
3. **Layout**: Run the layout resolver on subtrees that have `DirtyFlags.Layout`.
4. **Paint**: For each layer, call `render()` which walks the layer's elements and calls `paint(ctx)`.

### Behavioral Rules
1. `deltaTime` is in **seconds** (e.g., `0.016` at 60fps).
2. `maxDeltaTime` defaults to `0.1` (100ms).
3. `globalFPS` is the target frame rate. `globalFPS = 0` pauses.
4. `add(element)` registers an element for per-frame `update()`. Adding the scene's `root` is sufficient.

### API Contract
```typescript
export interface ITicker {
  globalFPS: number;               // Default: 60. Target frames per second. 0 = paused.
  maxDeltaTime: number;            // Default: 0.1. Clamp for deltaTime in seconds.
  readonly deltaTime: number;      // Seconds since last frame (after clamping).
  readonly elapsedTime: number;    // Total seconds since start().

  add(element: IElement): void;
  remove(element: IElement): void;
  start(): void;
  stop(): void;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 5.1 | **`src/core/Ticker.ts`** | `start()`, `stop()`, `add()`, `remove()`. Computes `deltaTime` in seconds, clamps to `maxDeltaTime` (default `0.1`). |
| 5.2 | **FPS throttling** | When `globalFPS < display refresh`, skip frames. `globalFPS = 0` pauses. |
| 5.3 | **Frame pipeline order** | Animations → Update → Layout → Paint → Hit Buffer (stubs for layout/paint/hit at this layer). |
| 5.4 | **`elapsedTime`** | Accumulates clamped deltas since `start()`. |
| 5.5 | **Unit tests** | DeltaTime clamping, FPS throttling behavior, start/stop/restart, elapsed accumulation |

### Acceptance Criteria
- `deltaTime` never exceeds `maxDeltaTime`.
- Setting `globalFPS = 30` on a 60Hz display results in ~30 updates per second.
- `stop()` then `start()` does not produce a massive delta spike.

### Demo Panel
An FPS counter and `deltaTime` readout. Slider to set `globalFPS`. A ball bouncing with physics driven by `deltaTime` to visually confirm frame-rate independence.

---

## Layer 6 — Rendering Wrapper (Arena2DContext)

### Philosophy
A safe wrapper around `CanvasRenderingContext2D` that prevents state leakage and provides high-level drawing primitives. Every `paint()` call is sandwiched between automatic `save()` and `restore()`.

### Behavioral Rules
1. Before calling `element.paint(ctx)`, the framework calls `ctx.raw.save()`, applies the element's `worldMatrix`, sets `globalAlpha`, and sets `globalCompositeOperation`.
2. After `paint()` returns, the framework calls `ctx.raw.restore()`.
3. Elements should use the wrapper methods when possible. Direct access to `ctx.raw` is available but the element **must not** call `save()`/`restore()` or `setTransform()`.

### API Contract
```typescript
export type FillStyle = string | CanvasGradient | CanvasPattern;

export interface IArena2DContext {
  readonly raw: CanvasRenderingContext2D;

  // Shape primitives
  drawRect(x: number, y: number, w: number, h: number, fill?: FillStyle, stroke?: FillStyle): void;
  drawRoundedRect(x: number, y: number, w: number, h: number, radius: number | [number, number, number, number], fill?: FillStyle, stroke?: FillStyle): void;
  drawCircle(cx: number, cy: number, r: number, fill?: FillStyle, stroke?: FillStyle): void;
  drawEllipse(cx: number, cy: number, rx: number, ry: number, fill?: FillStyle, stroke?: FillStyle): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, stroke: FillStyle, lineWidth?: number): void;
  drawPolygon(points: Array<{ x: number; y: number }>, fill?: FillStyle, stroke?: FillStyle): void;
  drawPath(path: Path2D, fill?: FillStyle, stroke?: FillStyle): void;

  // Image
  drawImage(image: CanvasImageSource, x: number, y: number, w?: number, h?: number): void;
  drawImageRegion(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;

  // Text
  drawText(text: string, x: number, y: number, style: ITextStyle): void;
  measureText(text: string, style: ITextStyle): { width: number; height: number };

  // Effects
  setShadow(color: string, blur: number, offsetX: number, offsetY: number): void;
  clearShadow(): void;

  // Clipping
  clipRect(x: number, y: number, w: number, h: number): void;
  clipRoundedRect(x: number, y: number, w: number, h: number, radius: number): void;

  // Gradient/Pattern helpers
  createLinearGradient(x0: number, y0: number, x1: number, y1: number, stops: Array<{ offset: number; color: string }>): CanvasGradient;
  createRadialGradient(cx: number, cy: number, r: number, stops: Array<{ offset: number; color: string }>): CanvasGradient;

  // Line style
  setLineWidth(width: number): void;
  setLineDash(segments: number[]): void;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 6.1 | **`src/rendering/Arena2DContext.ts`** | Wraps `CanvasRenderingContext2D`. Implements all shape primitives: `drawRect`, `drawRoundedRect`, `drawCircle`, `drawEllipse`, `drawLine`, `drawPolygon`, `drawPath` |
| 6.2 | **Image drawing** | `drawImage`, `drawImageRegion` |
| 6.3 | **Text drawing** | `drawText`, `measureText` |
| 6.4 | **Effects** | `setShadow`, `clearShadow` |
| 6.5 | **Clipping** | `clipRect`, `clipRoundedRect` |
| 6.6 | **Gradients** | `createLinearGradient`, `createRadialGradient` |
| 6.7 | **Line style** | `setLineWidth`, `setLineDash` |
| 6.8 | **Auto save/restore** | Framework applies before/after each `paint()`: `save() → setTransform(worldMatrix) → globalAlpha → globalCompositeOperation → paint() → restore()` |
| 6.9 | **Unit tests** | Verify save/restore balance, gradient stop ordering, measure text returns non-zero for non-empty strings |

### Acceptance Criteria
- Drawing primitives produce the correct shapes on a test canvas.
- State stack never leaks between paint calls.

### Demo Panel
A "shape gallery" drawing every primitive. A second area shows clipping in action.

---

## Layer 7 — Scene & Layering System

### Philosophy
The Scene manages physical DOM resources. Using multiple `<canvas>` elements allows for **Layered Caching** — the GPU compositor blends static and dynamic content, reducing redundant redraws.

### Mechanics
- **Interactive Passthrough**: Uses a hidden `HitBuffer`. If alpha at a pixel is below `alphaThreshold`, `pointer-events: none` is applied to allow clicks to pass through to underlying HTML.
- **DPI Handling**: Reads `window.devicePixelRatio`. Canvases resized by `dpr`.

### Behavioral Rules
1. **Layer assignment**: Inherited from parent if not explicitly set. `root` is assigned to default layer.
2. **Layer lifecycle**: `createLayer`, `removeLayer`, `getLayer`.
3. **Layer ordering**: CSS `z-index` based on `layer.zIndex`.
4. **Hit Buffer**: Unique per-element color for O(1) lookup.

### API Contract
```typescript
export interface IScene {
  readonly container: HTMLElement;
  width: number;
  height: number;
  readonly dpr: number;
  alphaThreshold: number;
  readonly root: IContainer;
  readonly hitBuffer: OffscreenCanvas;

  createLayer(id: string, zIndex: number): ILayer;
  removeLayer(id: string): void;
  getLayer(id: string): ILayer | null;

  screenToScene(screenX: number, screenY: number): { x: number; y: number };
  sceneToScreen(sceneX: number, sceneY: number): { x: number; y: number };

  resize(width: number, height: number): void;
  destroy(): void;
  getElementById(id: string): IElement | null;
}

export interface ILayer {
  readonly id: string;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  zIndex: number;
  opacity: number;
  render(): void;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 7.1 | **`src/core/Scene.ts`** | Creates host `<div>`, manages `root` container. `resize()` updates all canvases. DPI via `devicePixelRatio` + `matchMedia` listener. |
| 7.2 | **`src/core/Layer.ts`** | `createLayer(id, zIndex)`, `removeLayer(id)`, `getLayer(id)`. Each layer = absolutely-positioned `<canvas>`. CSS `z-index` ordering. |
| 7.3 | **Layer assignment** | Elements inherit parent's layer unless explicitly overridden. `render()` clears and repaints assigned elements. |
| 7.4 | **Hit buffer** | Single `OffscreenCanvas`. Paint interactive elements with unique per-element color for O(1) lookup. |
| 7.5 | **Coordinate transforms** | `screenToScene`, `sceneToScreen` accounting for DPR and container offset. |
| 7.6 | **`getElementById`** | ID→element index maintained during add/remove. |
| 7.7 | **Full frame pipeline** | Wire the Ticker (Layer 5) → Elements (Layer 3/4) → Arena2DContext (Layer 6) → Layers into a working render loop. |
| 7.8 | **Unit tests** | Layer ordering, DPR scaling math, resize propagation, hit buffer color uniqueness |

### Acceptance Criteria
- Creating a Scene with elements renders them to screen via the Ticker.
- Multiple layers composite correctly (lower z-index behind higher).
- `resize()` correctly updates canvas dimensions and DPR scale.
- `getElementById` returns correct element.

### Demo Panel
A full Scene with two layers: a "background" layer with static shapes and a "foreground" layer with a draggable element. Layer opacity sliders.

---

## Layer 8 — Layout Engine (Flex & Anchor)

### Philosophy
A hybrid layout system providing CSS-like responsiveness. Flex handles flow-based layout; Anchors handle absolute positioning and stretching relative to the parent.

### Mechanics
**Two-Pass Resolver:**
1. **Measure (Bottom-Up)**: Walk leaves first. Each element reports its desired size. For `'auto'` width/height, the desired size is the element's intrinsic content size.
2. **Arrange (Top-Down)**: Walk from root. Distribute available space among children, resolve percentage units, apply alignment, and set final bounds.

### Behavioral Rules
1. **Display Modes**:
    - `'manual'`: No automatic layout. Skip participation in parent flex.
    - `'flex'`: Row or column layout with wrapping, gap, and alignment.
    - `'anchor'`: Position relative to parent bounds. Opposing anchors stretch.
2. **Unit Resolution**: `number` (px), `'${number}%'` (parent content area), `'auto'` (intrinsic/fill).
3. **Margin/Padding**: Margins between siblings (flex) or inset from anchor. Padding inside content box.
4. **Invalidation**: `DirtyFlags.Layout` set on child add/remove, style change, or intrinsic size change.

### API Contract
```typescript
export type LayoutUnit = number | `${number}%` | 'auto';

export interface IStyle {
  display: 'manual' | 'flex' | 'anchor';
  flexDirection: 'row' | 'column';
  justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  alignItems: 'start' | 'center' | 'end' | 'stretch';
  flexWrap: 'nowrap' | 'wrap';
  gap: number;
  flexGrow: number;
  flexShrink: number;
  flexBasis: LayoutUnit;
  top?: LayoutUnit;
  left?: LayoutUnit;
  right?: LayoutUnit;
  bottom?: LayoutUnit;
  width: LayoutUnit;
  height: LayoutUnit;
  padding: [number, number, number, number];
  margin: [number, number, number, number];
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 8.1 | **`src/layout/LayoutResolver.ts`** | Two-pass walker. Measure: leaves first, intrinsic sizes. Arrange: root first, distribute space. |
| 8.2 | **`src/layout/Style.ts`** | `IStyle` implementation with defaults. Unit resolution (`number`, `'%'`, `'auto'`, `'min-content'`, `'max-content'`). |
| 8.3 | **Manual mode** | Element's position/size set directly, skipped by parent flex. |
| 8.4 | **Flex mode** | `flexDirection`, `justifyContent`, `alignItems`, `flexGrow`, `flexShrink`, `flexBasis`, `flexWrap`, `gap`. |
| 8.5 | **Anchor mode** | `top`, `left`, `right`, `bottom`. Opposing anchors = stretch. |
| 8.6 | **Margin** | Spacing between siblings in flex; inset in anchor mode. |
| 8.7 | **Padding** | Spacing inside element's border. |
| 8.8 | **Min/Max constraints** | `minWidth`, `maxWidth`, `minHeight`, `maxHeight` enforced after grow/shrink. |
| 8.9 | **Integration** | Layout runs during `update()` phase when `DirtyFlags.Layout` is set. Runs once per frame. |
| 8.10 | **Performance Strategy** | **Layout Boundaries**: Elements with fixed dimensions stop dirtiness bubbling. **Measurement Caching**: Cache `measure()` results based on input constraints. **Integer Snapping**: Snap final values. |
| 8.11 | **Unit tests** | Flex row/column distribution, wrap behavior, percentage units, anchor stretching, min/max clamping, nested flex, auto sizing, boundary optimization |

### Acceptance Criteria
- **Flex Layout Verification**: `justify-content`, `flex-wrap`, `flex-grow/shrink`, `align-items` work as expected.
- **Constraints & Sizing**: `min/max-width`, `padding`, `percentage units` resolve accurately.
- **Performance**: Layout time scales linearly `O(n)` with number of elements.

### Demo Panel
**Interactive Layout Playground:** A split-screen interface with controls for container/child settings and a preview area with visual debug overlays showing padding, margins, and performance metrics.


---

## Layer 9 — Interaction & Focus System

### Philosophy
Normalizes Mouse and Touch into a unified Pointer pipeline with standard DOM-like event bubbling. Keyboard events are routed to the focused element.

### Mechanics
- **Hit-Testing**: Uses a `SpatialHashGrid` for broad-phase candidate lookup, then tests candidates back-to-front. Local coordinates tested via inverse world matrix.
- **SpatialHashGrid**: 2D grid of cells (default `128`). Elements registered in cells overlapping world AABB.

### Behavioral Rules
1. **Event Types**: `pointerdown/up/move/enter/leave`, `click`, `wheel`. `keydown/keyup` (to focused).
2. **Bubbling**: Starts at target, bubbles upward to root (except `pointerenter/leave`). `stopPropagation()` supported.
3. **Interactive property**: when `false`, element is excluded from hit-testing.
4. **Focus**: Only one element focused. Tab order determined by depth-first traversal of the scene graph.

### API Contract
```typescript
export interface IPointerEvent {
  readonly type: string;
  readonly target: IElement;
  readonly currentTarget: IElement;
  readonly sceneX: number;
  readonly sceneY: number;
  readonly localX: number;
  readonly localY: number;
  readonly button: number;
  readonly deltaX: number;
  readonly deltaY: number;
  stopPropagation(): void;
  preventDefault(): void;
}

export interface IKeyboardEvent {
  readonly type: string;
  readonly target: IElement;
  readonly currentTarget: IElement;
  readonly key: string;
  readonly code: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  stopPropagation(): void;
  preventDefault(): void;
}

export interface IInteractionManager {
  readonly focusedElement: IElement | null;
  readonly hoveredElement: IElement | null;
  setFocus(el: IElement | null): void;
  tabNext(): void;
  tabPrev(): void;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 9.1 | **Drag & Drop System** | `src/interaction/DragManager.ts`. `draggable` property. Events: `dragstart/move/end/enter/leave`, `drop`. |
| 9.2 | **`src/interaction/SpatialHashGrid.ts`** | 2D grid. Insert/remove/query by world AABB. Updated on `DirtyFlags.Spatial`. |
| 9.3 | **`src/interaction/InteractionManager.ts`** | Translates DOM events to `IPointerEvent` / `IKeyboardEvent`. |
| 9.4 | **Hit-testing** | Broad phase: `SpatialHashGrid`. Narrow phase: inverse world matrix point-in-bounds test. |
| 9.5 | **Event dispatch** | Bubbling, `stopPropagation()`. `pointerenter`/`leave` do not bubble. |
| 9.6 | **Keyboard dispatch** | `keydown`, `keyup` to focused element. |
| 9.7 | **Focus management** | `setFocus()`, `tabNext()`, `tabPrev()`. Depth-first tab traversal. |
| 9.8 | **Interactive passthrough** | Hit buffer alpha sampling for HTML pass-through. |
| 9.9 | **Cursor** | Set `container.style.cursor` based on hovered element. |
| 9.10 | **Unit tests** | Hit-test ordering, bubbling, stopPropagation, tab order, focus, spatial hash, drag/drop. |

### Acceptance Criteria
- Clicking overlapping elements hits the topmost.
- Event bubbles unless stopped.
- Tab cycles focusable elements in depth-first order.
- Dragging an element moves it visually and fires drag events.

### Demo Panel
Interactive scene with overlapping, nested elements. Event propagation visualization. Focus ring and tab cycling. Draggable boxes with drop targets.

---

## Layer 10 — Text & Text Layout

### Philosophy
Text is a first-class entity with greedy word-wrap and character-level interaction for selection and cursor placement.

### Mechanics
- **Text Rendering**: Drawn using `ctx.fillText()` with pre-measured advancements. `ITextLine` stores per-character x-offsets.
- **Word Wrap**: Greedy algorithm. words added until line exceeds width.

### Behavioral Rules
1. **Intrinsic content size**: Width is widest line, height is `lines.length * lineHeight`.
2. **Font Handling**: Assume loaded via CSS or `FontFace` API.

### API Contract
```typescript
export interface ITextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  selectionColor?: string;
}

export interface ITextLine {
  text: string;
  width: number;
  advancements: number[];
}

export interface ITextLayout {
  lines: ITextLine[];
  totalHeight: number;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 10.1 | **`src/elements/Text.ts`** | Implements `IText`. Renders via `ctx.fillText()` using pre-measured character advancements. |
| 10.2 | **`src/text/TextLayout.ts`** | specialized resolver for **Inline Layout**. Handles word-wrapping and line breaking. |
| 10.3 | **Measure Contract** | `measure(availableWidth, availableHeight)` returns intrinsic size. Caches results. |
| 10.4 | **Intrinsic Sizing** | Reports `min-content` (widest word) and `max-content` widths to Layer 8. |
| 10.5 | **`ITextStyle`** | `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `color`, `lineHeight`, `textAlign` |
| 10.6 | **`fontReady` utility** | Check font availability via `document.fonts.check()`. |
| 10.7 | **Unit tests** | Word wrap, hard line breaks, empty string, alignment offsets |

### Acceptance Criteria
- Text wraps correctly at container width boundaries.
- Changing `fontSize` triggers layout re-measure.
- `textAlign: 'center'` centers each line.

### Demo Panel
A text block with editable content, font controls, and width slider showing live word-wrap behavior. Performance test with large text blocks.

---

## Layer 11 — Text Input & IME

### Mechanics
- **IME Bridge**: Hidden 1×1 `<textarea>` moved to cursor position to capture native input/clipboard.

### Behavioral Rules
1. **Selection rendering**: Filled rectangles behind selected text range (one per line).
2. **Keyboard Navigation**: Option+Arrow (words), Cmd+Arrow (line/block), Shift (expand selection). Interecept browser default behaviors for Cmd+Arrow.

### API Contract
```typescript
export interface ITextInput extends IText {
  selectionStart: number;
  selectionEnd: number;
  isPassword: boolean;
  placeholder: string;
  readOnly: boolean;
  maxLength: number;
  multiline: boolean;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 11.1 | **`src/elements/TextInput.ts`** | Extends `Text`. `selectionStart`, `selectionEnd`, cursor rendering. |
| 11.2 | **Selection rendering** | Multi-rect rendering behind selected text. |
| 11.3 | **IME bridge** | Hidden 1×1 `<textarea>` forwards events to `ITextInput`. |
| 11.4 | **Clipboard** | Copy/Cut/Paste via hidden textarea delegation. |
| 11.5 | **Input properties** | `isPassword` (masking), `placeholder`, `readOnly`, `maxLength`, `multiline`. |
| 11.6 | **Events** | `change`, `submit`, `focus`, `blur`. |
| 11.7 | **Keyboard Navigation** | Option+Arrow, Cmd+Arrow. Shift for selection. |
| 11.8 | **Unit tests** | Cursor movement, selection, password masking, maxLength enforcement. |

### Acceptance Criteria
- Clicking positions cursor at correct character.
- Shift+Arrow expands selection. Copy/paste works via keyboard.
- IME composition inserts correctly.
- `isPassword` displays bullets.

### Demo Panel
A form with single-line, password, and multiline inputs. Shows cursor/selection behavior and placeholder text.

---

## Layer 12 — Image & Nine-Slice

### Philosophy
`IImage` provides a element for displaying bitmaps, with support for nine-slice scaling for UI panels.

### Behavioral Rules
1. **Source loading**: `HTMLImageElement`, `ImageBitmap`, or `OffscreenCanvas`.
2. **Nine-slice**: divided into 9 regions. Corners at natural size, edges stretched one axis, center fills.

### API Contract
```typescript
export interface IImage extends IElement {
  source: CanvasImageSource | null;
  sourceRect?: IRect;
  nineSlice?: [number, number, number, number];
  tint?: string;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 12.1 | **`src/elements/Image.ts`** | Implements `IImage`. Draws `source`. |
| 12.2 | **Source rect** | `sourceRect` for sprite sheet sub-regions. |
| 12.3 | **Nine-slice** | `nineSlice: [top, right, bottom, left]` insets. |
| 12.4 | **Tint** | Color tint via compositing. |
| 12.5 | **Intrinsic size** | Natural dimensions when style is `'auto'`. |
| 12.6 | **Unit tests** | Nine-slice regions, source rect clipping, null source handling |

### Acceptance Criteria
- Image renders at correct position and size.
- Nine-slice preserves corner dimensions while stretching center.
- Setting `source = null` clears the element.

### Demo Panel
An image gallery: standard image, sprite sheet, and resizable nine-slice panel.

---


## Layer 13 — Scroll Containers

### Philosophy
A specialized container for navigating overflowing content via pointer drag or wheel events, with optional inertial scrolling and scroll bars.

### Behavioral Rules
1. **Scroll offset**: applied as translation in `paint()`, not by modifying children's transforms.
2. **Clamping**: to `[0, contentSize - viewportSize]`.
3. **Inertia**: residual velocity decays by `decelerationRate` (default `0.95`).
4. **Scroll bars**: Semi-transparent rounded-rect. Fade after `scrollBarFadeDelay`.

### API Contract
```typescript
export interface IScrollContainer extends IContainer {
  scrollX: number;
  scrollY: number;
  readonly contentWidth: number;
  readonly contentHeight: number;
  scrollEnabled: [boolean, boolean];
  inertia: boolean;
  decelerationRate: number;
  showScrollBars: boolean;
  scrollBarFadeDelay: number;

  scrollTo(x: number, y: number, animated?: boolean): void;
  scrollBy(dx: number, dy: number, animated?: boolean): void;
}
```

### Deliverables

| # | Item | Details |
|---|---|---|
| 13.1 | **`src/elements/ScrollContainer.ts`** | Extends `Container`. Offsets children by `(scrollX, scrollY)` during paint. |
| 13.2 | **Content bounds** | Union of children's AABBs determines scrollable area. |
| 13.3 | **Clamping** | Scroll values clamped to `[0, max]`. Disabled axes when content fits. |
| 13.4 | **Pointer drag scrolling** | Track pointer delta on `pointermove` while button down. |
| 13.5 | **Wheel scrolling** | `wheel` event maps to scroll offset. |
| 13.6 | **Inertia** | Residual velocity on release, decaying by `decelerationRate` per frame. |
| 13.7 | **Scroll bars** | Semi-transparent rounded-rect indicators. Fade out after `scrollBarFadeDelay`. |
| 13.8 | **`scrollTo` / `scrollBy`** | Programmatic scrolling, optional animation. |
| 13.9 | **Events** | Emits `scroll` events with `{ scrollX, scrollY }`. |
| 13.10 | **Unit tests** | Clamping correctness, inertia decay, scroll bar sizing, wheel delta mapping, disabled axis |

### Acceptance Criteria
- Scrolling clamps correctly and does not overshoot.
- Inertia provides smooth deceleration after release.
- Scroll bars correctly indicate position and fade after inactivity.
- Wheel events scroll the content.

### Demo Panel
A scrollable list of items (100+ rows) with both vertical and horizontal scrolling. Inertia toggle. Deceleration rate slider. Scroll bar visibility toggle.

---

## Layer 14 — Error Handling, Debug Mode & Memory Management

### Behavioral Rules
1. **Error conventions**:
    - Re-parenting auto-removes.
    - Remove non-child is no-op.
    - Scale 0 → `Number.EPSILON`.
    - Invalid layout units → `0`.
    - Alpha clamped to `[0, 1]`.
2. **Debug mode**: `Arena2D.debug = true`. Warnings for invalid states and performance hints (e.g., thousands of children without cache-as-bitmap).
3. **Memory management**: `destroy()` must be called. In debug mode, `FinalizationRegistry` warns if scene is GC'd without `destroy()`.

### Deliverables

| # | Item | Details |
|---|---|---|
| 14.1 | **Error conventions** | Re-parenting auto-removes. Remove non-child is no-op. Scale 0 → `Number.EPSILON`. Invalid layout units → `0`. Alpha clamped to `[0, 1]`. |
| 14.2 | **Debug mode** | `Arena2D.debug = true` enables `console.warn` for: invalid states, performance hints (500+ children without cache-as-bitmap). |
| 14.3 | **`destroy()` audit** | Verify every element type releases resources. |
| 14.4 | **`FinalizationRegistry`** | In debug mode, warn when a Scene is GC'd without `destroy()`. |
| 14.5 | **Unit tests** | Each error convention, debug mode warnings, destroy resource release |

### Acceptance Criteria
- All error scenarios are handled without throwing.
- Debug mode produces actionable warnings.
- After `scene.destroy()`, no DOM elements or animation frames remain.

### Demo Panel
A "Stress Test" panel: create/destroy hundreds of elements, monitor for memory leaks. Debug mode toggle showing live warnings.

---

## Layer 15 — API Surface, Bundle & Documentation

### Goal
Finalize the public API surface, produce the production bundle, and ensure the demo site serves as comprehensive documentation.

### Deliverables

| # | Item | Details |
|---|---|---|
| 15.1 | **`src/index.ts`** | Single barrel export. Export only public API types and classes. |
| 15.2 | **Production bundle** | `bun build` → `dist/arena-2d.js` (minified ESM) + `dist/arena-2d.d.ts` (type declarations). |
| 15.3 | **Demo site polish** | All layer demo panels reviewed, navigation polished, mobile responsive. |
| 15.4 | **`README.md`** | Quick-start guide linking to demo site and `PRD.md`. |
| 15.5 | **Final test sweep** | All `bun test` suites green. Manual walkthrough of every demo panel. |

### Acceptance Criteria
- `import { Scene, Container, Text } from 'arena-2d'` works from a consumer project.
- Type declarations are correct and complete.
- Demo site demonstrates every feature from `PRD.md`.
- All tests pass.

---

## Milestone Summary

| Milestone | Layers | Outcome |
|---|---|---|
| **M0 — Scaffold** | 0 | Project builds, dev server runs, demo page loads |
| **M1 — Core Primitives** | 1–4 | Math, events, elements, containers — testable in isolation |
| **M2 — Rendering Pipeline** | 5–7 | Full frame loop, rendering to layered canvases, elements visible on screen |
| **M3 — Layout & Interaction** | 8–9 | Flex/anchor layout, pointer/keyboard events, focus management |
| **M4 — Content Elements** | 10–12 | Text, text input, images — all content types renderable |
| **M5 — Polish** | 13–14 | Scrolling, error handling, memory management |
| **M6 — Ship** | 15 | Bundle, types, docs, final QA |

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Canvas text measurement inconsistency across browsers | Text layout breaks on different engines | Use `OffscreenCanvas` for measurement where available; fallback metrics comparison tests |
| HiDPI rendering artifacts | Blurry or misaligned rendering | DPR handling tested on 1x, 2x, and 3x pixel ratios from Layer 7 onward |
| Layout engine combinatorial complexity | Long test cycles for flex edge cases | Follow CSS Flexbox spec test suite as reference; start with basic cases, expand iteratively |
| IME integration differences across OS | Text input broken on certain platforms | Hidden textarea approach tested on macOS, Windows, and mobile Safari |
| Performance regression as layers accumulate | Frame drops in demo | FPS counter in demo from Layer 5 onward; performance budget: 60fps with 1000 elements |
