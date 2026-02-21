# Arena-2D: High-Performance TypeScript Rendering Specification

Arena-2D is a retained-mode, hardware-accelerated UI library for TypeScript and Bun. It abstracts HTML5 Canvas into a high-level Virtual DOM (VDOM) featuring a multi-canvas layering system, hybrid layout engine, and pixel-perfect interaction.

> **Audience.** This specification is intended to be read and implemented by an AI coding agent. Every section follows a consistent structure — Philosophy (why), Mechanics (how), Behavioral Rules (edge cases and invariants), and API Contract (TypeScript interfaces). When a rule is not stated, the implementing agent should raise it as an ambiguity rather than guess.

---

## Table of Contents

1. [Core Math & Transformation Engine](#1-core-math--transformation-engine)
2. [Virtual DOM & Lifecycle (VDOM)](#2-virtual-dom--lifecycle-vdom)
3. [Scene & Layering System](#3-scene--layering-system)
4. [The Layout Engine (Flex & Anchor)](#4-the-layout-engine-flex--anchor)
5. [Interaction & Focus System](#5-interaction--focus-system)
6. [Rich Text & Input Subsystem](#6-rich-text--input-subsystem)
7. [Hierarchical Ticker System](#7-hierarchical-ticker-system)
8. [Rendering Wrapper (Arena2DContext)](#8-rendering-wrapper-arena-2dcontext)
9. [Image & Texture Elements](#9-image--texture-elements)
10. [Scroll Containers](#10-scroll-containers)
11. [Error Handling & Memory Management](#11-error-handling--memory-management)

---

## 1. Core Math & Transformation Engine

### 1.1 Philosophy

To achieve GPU-level performance, Arena2D uses 2D Affine Transformation Matrices. This allows complex hierarchies (nesting, rotation, scaling) to be resolved through simple matrix multiplication rather than manual coordinate math.

### 1.2 Mechanics

- **Matrix Storage**: Stored as `Float32Array(6)` representing the values `[a, b, c, d, tx, ty]`. This follows the **column-major** convention matching the HTML Canvas `setTransform(a, b, c, d, e, f)` parameter order.
- **Identity**: `[1, 0, 0, 1, 0, 0]`.
- **World Matrix**: Calculated as `Parent.WorldMatrix × Local.Matrix` (left-multiply; parent is the left operand).
- **AABB Calculation**: The World Axis-Aligned Bounding Box is derived by transforming the four corners of an element's local bounds through `worldMatrix` and finding the min/max X and Y.
- **Skew**: Supported via `skewX` and `skewY` (in radians). Skew is applied as a shear transformation.

### 1.3 Behavioral Rules

1. When any of `x`, `y`, `rotation`, `scaleX`, `scaleY`, `skewX`, `skewY`, `pivotX`, or `pivotY` change, the element must call `invalidate(DirtyFlags.Transform)`.
2. When an element's transform is invalidated, **all descendants** must also be marked `DirtyFlags.Transform` (cascading downward through the tree). The cascade happens lazily during the next `update()` pass, not eagerly on set.
3. `worldMatrix` is recomputed during `update()` only if `DirtyFlags.Transform` is set. After recomputation the flag is cleared.
4. The local matrix is composed as: `Translate(x, y) × Rotate(rotation) × Skew(skewX, skewY) × Scale(scaleX, scaleY) × Translate(-pivotX, -pivotY)`. The pivot point `(pivotX, pivotY)` in local space always maps to `(x, y)` in parent space — changing the pivot repositions the element around a fixed anchor.

### 1.4 API Contract

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

---

## 2. Virtual DOM & Lifecycle (VDOM)

### 2.1 Philosophy

A retained-mode system where the library tracks object states. Updates are "pushed" via property setters, and rendering is batched into a single tick per frame.

### 2.2 Mechanics

- **Dirty Flagging**: Elements track changes using a bitmask (see `DirtyFlags`). Property setters call `invalidate()` with the relevant flag. Multiple invalidations within a frame are coalesced.
- **Cache-As-Bitmap**: Containers can render their entire sub-tree to an `OffscreenCanvas`. This image is used in subsequent frames until a child is invalidated, saving thousands of draw calls for static UI.

### 2.3 Behavioral Rules

#### Dirty Flags

| Flag | Triggered By | Effect |
|---|---|---|
| `Transform` | `x`, `y`, `rotation`, `scaleX`, `scaleY`, `skewX`, `skewY`, `pivotX`, `pivotY` change | Recompute `worldMatrix` and AABB. Cascades to all descendants. |
| `Visual` | `alpha`, `blendMode`, fill/stroke changes, or any draw-affecting property | Repaint element. Does **not** cascade unless `cacheAsBitmap` ancestor exists (see below). |
| `Layout` | `width`, `height`, style property changes, child add/remove | Re-run layout resolver for this element's subtree. |
| `Spatial` | AABB changes (consequence of Transform or Layout resolution) | Re-insert into `SpatialHashGrid`. |

#### Lifecycle Hooks

Elements go through these lifecycle events (called in this order):

1. **`onAdded(parent: IContainer)`** — Called after the element is added to a parent's child list.
2. **`onSceneChanged(scene: IScene | null)`** — Called when the element's resolved scene changes (e.g., when added to a tree that is attached to a scene, or removed from one). Propagates to all descendants.
3. **`onRemoved(parent: IContainer)`** — Called after the element is removed from a parent's child list.

#### Rendering Order

1. Children are rendered in `zIndex` order (ascending, lowest first). 
2. When two children share the same `zIndex`, they render in **insertion order** (the order they were added via `addChild`).
3. `sortChildren()` performs a **stable sort** on `zIndex`.

#### Alpha Compositing

`alpha` is **multiplicative** through the hierarchy. An element's effective alpha is `parent.effectiveAlpha * element.alpha`. When `effectiveAlpha` reaches `0`, the element and all descendants are skipped during `paint()`.

#### Cache-As-Bitmap Invalidation

When `cacheAsBitmap` is `true` on a container:
- The container renders its sub-tree to an `OffscreenCanvas` and reuses it.
- When **any descendant** (at any depth) is invalidated with `Visual` or `Transform`, the invalidation **bubbles upward** to the nearest `cacheAsBitmap` ancestor. That ancestor's cached bitmap is discarded and re-rendered on the next frame.
- The `OffscreenCanvas` is sized to the container's AABB (with padding for shadows/effects).

#### Element ID

`id` is **user-provided** and optional. It defaults to an auto-generated UUID. IDs are **not** enforced as globally unique — they are a convenience identifier for debugging and lookups. The `Scene` maintains an optional id-to-element index for `getElementById(id)` lookups; duplicate IDs result in the most-recently-added element being returned.

### 2.4 API Contract

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
  destroy(): void;                // Release all resources (OffscreenCanvas, listeners, etc.)
}

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

---

## 3. Scene & Layering System

### 3.1 Philosophy

The Scene manages physical DOM resources. Using multiple `<canvas>` elements allows for **Layered Caching** — the GPU compositor blends static and dynamic content, reducing redundant redraws. Each layer is an independent `<canvas>` element positioned absolutely within the scene's container `<div>`.

### 3.2 Mechanics

- **Interactive Passthrough**: Uses a hidden `HitBuffer` (`OffscreenCanvas`). On each pointer event, the scene samples the hit buffer at the pointer position. If the alpha at that pixel is below `alphaThreshold`, `pointer-events: none` is applied to the topmost canvas layer, allowing clicks to pass through to underlying HTML elements.
- **DPI Handling**: The scene reads `window.devicePixelRatio`. Each layer's `<canvas>` has its CSS size set to `width × height` and its resolution set to `width * dpr × height * dpr`. The rendering context is scaled by `dpr` via `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` as the base transform.

### 3.3 Behavioral Rules

1. **Layer assignment**: An element is assigned to a layer by setting `element.layer = layer`. If no layer is explicitly set, the element inherits its parent's layer. The scene's `root` container is assigned to the default layer (the first layer created).
2. **Layer lifecycle**: `createLayer()` adds a new `<canvas>` to the scene container. `removeLayer(id)` destroys the canvas and detaches all elements assigned to it (they fall back to parent-inherited layer). `getLayer(id)` retrieves a layer by ID.
3. **Layer ordering**: Layers are ordered by `zIndex`. The `<canvas>` elements are positioned using CSS `z-index`.
4. **Resize**: When `scene.resize(width, height)` is called, all layer canvases are resized, the hit buffer is resized, and `DirtyFlags.Layout | DirtyFlags.Transform` is set on the root. The scene also listens for `window.devicePixelRatio` changes (via `matchMedia`) and re-scales canvases accordingly.
5. **Hit Buffer**: A single `OffscreenCanvas` at scene resolution. During the hit-test phase (after rendering), each layer paints its interactive elements to the hit buffer using a unique per-element color. This allows O(1) element lookup from a pixel coordinate.

### 3.4 API Contract

```typescript
export interface IScene {
  readonly container: HTMLElement;   // The host <div>. Must have position: relative.
  width: number;                     // Logical width in CSS pixels.
  height: number;                    // Logical height in CSS pixels.
  readonly dpr: number;              // Resolved device pixel ratio.
  alphaThreshold: number;            // Range [0, 255]. Default: 10. For HTML pass-through.
  readonly root: IContainer;         // The scene-graph root. Always exists.
  readonly hitBuffer: OffscreenCanvas;

  // Layer management
  createLayer(id: string, zIndex: number): ILayer;
  removeLayer(id: string): void;
  getLayer(id: string): ILayer | null;

  // Coordinate transforms
  screenToScene(screenX: number, screenY: number): { x: number; y: number };
  sceneToScreen(sceneX: number, sceneY: number): { x: number; y: number };

  // Lifecycle
  resize(width: number, height: number): void;
  destroy(): void;

  // Lookup
  getElementById(id: string): IElement | null;
}

export interface ILayer {
  readonly id: string;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  zIndex: number;                    // CSS z-index of the canvas element.
  opacity: number;                   // Range [0, 1]. Default: 1. CSS opacity on the canvas.
  render(): void;                    // Clear and repaint all elements assigned to this layer.
}
```

---

## 4. The Layout Engine (Flex & Anchor)

### 4.1 Philosophy

A hybrid layout system providing CSS-like responsiveness. Flex handles flow-based layout; Anchors handle absolute positioning and stretching relative to the parent. Manual mode disables auto-layout entirely.

### 4.2 Mechanics

**Two-Pass Resolver:**
1. **Measure (Bottom-Up)**: Walk leaves first. Each element reports its desired size. For `'auto'` width/height, the desired size is the element's intrinsic content size (e.g., text bounding box, image dimensions). Containers with `display: 'flex'` sum/max their children's desired sizes according to `flexDirection`.
2. **Arrange (Top-Down)**: Walk from root. Distribute available space among children, resolve percentage units, apply alignment, and set final `x`, `y`, `width`, `height` on each element.

### 4.3 Behavioral Rules

#### Display Modes

| Mode | Behavior |
|---|---|
| `'manual'` | **No automatic layout.** The element's `x`, `y`, `width`, `height` are set directly by the user and are not modified by the layout engine. The element also does not participate in its parent's flex calculations (it is skipped). |
| `'flex'` | Children are laid out in a row or column. Supports `flexGrow`, `flexShrink`, `flexBasis`, `flexWrap`, `gap`, `justifyContent`, `alignItems`, and `padding`. |
| `'anchor'` | The element is positioned relative to its parent's bounds using `top`, `left`, `right`, `bottom`. Setting opposing anchors (`left` + `right`, or `top` + `bottom`) causes the element to **stretch** to fill the space. |

#### Unit Resolution

| Unit | Meaning |
|---|---|
| `number` | Absolute value in CSS pixels. |
| `'${number}%'` | Percentage of the parent's **content area** (parent size minus parent padding). |
| `'auto'` | During Measure: report intrinsic content size. During Arrange: expand to fill remaining available space (equivalent to `flexGrow: 1` behavior for a single auto-sized child). If multiple children are `'auto'`, remaining space is divided equally among them. |

#### Flex Properties

- **`flexGrow`** (number, default `0`): How much of the remaining space this child should absorb, proportional to siblings' `flexGrow` values.
- **`flexShrink`** (number, default `1`): How much this child should shrink when children overflow the container, proportional to siblings' `flexShrink` values.
- **`flexBasis`** (`LayoutUnit`, default `'auto'`): The element's initial size along the main axis before grow/shrink is applied. `'auto'` means use the `width`/`height` value.
- **`flexWrap`** (`'nowrap' | 'wrap'`, default `'nowrap'`): When `'wrap'`, children that overflow the main axis are wrapped to a new line. Wrapping creates new **cross-axis lines**, and `alignItems` applies per-line.

#### Overflow and Scrolling

- When children exceed the container's bounds and `clipContent` is `true`, content is visually clipped.
- Scroll behavior is handled by the dedicated `IScrollContainer` (see §11), not by the layout engine directly.

#### Margin

`margin` is specified as `[top, right, bottom, left]` (same order as CSS). Margins create spacing **between siblings** in a flex layout. In anchor mode, margins create an inset from the resolved anchor position.

#### Layout Invalidation Triggers

`DirtyFlags.Layout` is set when:
- A child is added or removed.
- Style properties change (`display`, `flexDirection`, `width`, `height`, `padding`, `margin`, `gap`, etc.).
- A child's intrinsic content size changes (e.g., text content updated).

Layout resolution runs **once per frame**, during the `update()` pass, before `paint()`.

### 4.4 API Contract

```typescript
export type LayoutUnit = number | `${number}%` | 'auto';

export interface IStyle {
  display: 'manual' | 'flex' | 'anchor';  // Default: 'manual'.

  // Flex container properties
  flexDirection: 'row' | 'column';         // Default: 'row'.
  justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around'; // Default: 'start'.
  alignItems: 'start' | 'center' | 'end' | 'stretch';  // Default: 'start'.
  flexWrap: 'nowrap' | 'wrap';             // Default: 'nowrap'.
  gap: number;                             // Default: 0. Pixels between children.

  // Flex child properties
  flexGrow: number;                        // Default: 0.
  flexShrink: number;                      // Default: 1.
  flexBasis: LayoutUnit;                   // Default: 'auto'.

  // Anchor properties
  top?: LayoutUnit;
  left?: LayoutUnit;
  right?: LayoutUnit;
  bottom?: LayoutUnit;

  // Size
  width: LayoutUnit;                       // Default: 'auto'.
  height: LayoutUnit;                      // Default: 'auto'.

  // Spacing
  padding: [number, number, number, number]; // [top, right, bottom, left]. Default: [0, 0, 0, 0].
  margin: [number, number, number, number];  // [top, right, bottom, left]. Default: [0, 0, 0, 0].

  // Constraints
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}
```

---

## 5. Interaction & Focus System

### 5.1 Philosophy

Normalizes Mouse and Touch into a unified Pointer pipeline with standard DOM-like event bubbling. Keyboard events are routed to the focused element.

### 5.2 Mechanics

- **Hit-Testing**: Uses a `SpatialHashGrid` for broad-phase candidate lookup, then tests candidates back-to-front (highest `zIndex` first). For each candidate, the pointer's world position is converted to local coordinates via the element's **inverse world matrix**. If the local coordinates fall within the element's local bounds, it is a hit.
- **SpatialHashGrid**: A 2D grid of cells, each `cellSize × cellSize` pixels (default: `128`). Elements are registered in every cell their world AABB overlaps. The grid is updated when `DirtyFlags.Spatial` is resolved. Querying a pointer position returns all elements in the cell at that position.

### 5.3 Behavioral Rules

#### Event Types

The following pointer events are supported:

| Event | Trigger |
|---|---|
| `pointerdown` | Pointer button pressed or touch start. |
| `pointerup` | Pointer button released or touch end. |
| `pointermove` | Pointer moved (even if no button is pressed). |
| `pointerenter` | Pointer enters an element's bounds. Does **not** bubble. |
| `pointerleave` | Pointer leaves an element's bounds. Does **not** bubble. |
| `click` | `pointerdown` followed by `pointerup` on the same element. |
| `wheel` | Mouse wheel or trackpad scroll gesture. |

The following keyboard events are supported (dispatched to the focused element):

| Event | Trigger |
|---|---|
| `keydown` | Key pressed. |
| `keyup` | Key released. |

#### Event Object

```typescript
export interface IPointerEvent {
  readonly type: string;
  readonly target: IElement;                // The element that was hit.
  readonly currentTarget: IElement;         // The element whose handler is executing (changes during bubbling).
  readonly sceneX: number;                  // Pointer position in scene coordinates.
  readonly sceneY: number;
  readonly localX: number;                  // Pointer position in target's local coordinates.
  readonly localY: number;
  readonly button: number;                  // 0 = left, 1 = middle, 2 = right.
  readonly deltaX: number;                  // For 'wheel' events only.
  readonly deltaY: number;                  // For 'wheel' events only.
  stopPropagation(): void;                  // Stop the event from bubbling further.
  preventDefault(): void;                   // Prevent default browser behavior (if applicable).
}

export interface IKeyboardEvent {
  readonly type: string;
  readonly target: IElement;
  readonly currentTarget: IElement;
  readonly key: string;                     // e.g., 'a', 'Enter', 'ArrowLeft'.
  readonly code: string;                    // e.g., 'KeyA', 'Enter', 'ArrowLeft'.
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  stopPropagation(): void;
  preventDefault(): void;
}
```

#### Event Listener API

Every `IElement` supports subscribing to events:

```typescript
export interface IEventEmitter {
  on(event: string, handler: (e: IPointerEvent | IKeyboardEvent) => void): void;
  off(event: string, handler: (e: IPointerEvent | IKeyboardEvent) => void): void;
  once(event: string, handler: (e: IPointerEvent | IKeyboardEvent) => void): void;
  emit(event: string, e: IPointerEvent | IKeyboardEvent): void;
}
```

`IElement` extends `IEventEmitter`.

#### Bubbling Rules

1. **No capture phase.** Events start at the target and bubble upward through each `parent` until reaching the root, or until `stopPropagation()` is called.
2. **Exceptions**: `pointerenter` and `pointerleave` do **not** bubble.
3. During bubbling, `currentTarget` is updated to the element whose handler is being invoked. `target` remains the original hit element.
4. `interactive` property (boolean, default `true`): when `false`, the element is excluded from hit-testing and receives no pointer events. Its children can still be interactive.

#### Focus

- Only one element can be focused at a time per scene.
- `setFocus(el)` fires `blur` on the previously focused element, then `focus` on the new one.
- **Tab order** is determined by depth-first traversal order of the scene graph. Only elements with `focusable: true` participate. `tabNext()` advances focus to the next focusable element in traversal order; `tabPrev()` goes backward.

### 5.4 API Contract

```typescript
export interface IInteractionManager {
  readonly focusedElement: IElement | null;
  readonly hoveredElement: IElement | null;

  setFocus(el: IElement | null): void;
  tabNext(): void;
  tabPrev(): void;
}
```

Additional properties on `IElement` (appended to the `IElement` interface):

```typescript
// On IElement:
interactive: boolean;   // Default: true. If false, element is invisible to hit-testing.
focusable: boolean;     // Default: false. If true, element can receive focus via tab.
cursor: string;         // Default: 'default'. CSS cursor value shown when hovering.
```

---

## 6. Rich Text & Input Subsystem

### 6.1 Philosophy

Text is a first-class entity with greedy word-wrap and character-level interaction for selection and cursor placement.

### 6.2 Mechanics

- **Text Rendering**: Text is drawn using `ctx.fillText()` with pre-measured character advancements for positioning. Each `ITextLine` stores per-character x-offsets (advancements) to enable precise cursor placement and selection rendering.
- **IME Bridge**: A hidden 1×1 `<textarea>` is moved to the cursor's world position to capture native mobile/OS input (copy/paste, predictive text, CJK composition). When the hidden textarea receives input, it is forwarded to the active `ITextInput`.
- **Font Handling**: Fonts are specified per-element. The library does **not** load fonts — it assumes fonts are loaded via CSS `@font-face` or the `FontFace` API before use. A `fontReady` utility is provided for checking availability.

### 6.3 Behavioral Rules

1. **Word wrap** uses a greedy algorithm: words are added to the current line until the line exceeds the element's available width, at which point a new line starts. A "word" is a sequence of non-whitespace characters. Hard line breaks (`\n`) always start a new line.
2. **Intrinsic content size**: For auto-sized `IText` elements, the intrinsic width is the widest line, and the intrinsic height is `lines.length * lineHeight`.
3. **Selection rendering**: Selection is drawn as filled rectangles behind the selected text range. For multiline text, one rectangle is computed and drawn per line involved in the selection. The rectangle bounds per line are computed from the advancements array: `startX = advancements[selectionStartRelLine]`, `endX = advancements[selectionEndRelLine]`.
4. **Clipboard**: Copy, **Cut**, and Paste are delegated to the hidden `<textarea>`. The `ITextInput` receives `onPaste(text: string)`, `onCopy(): string`, and `onCut(): string` (Copy + Delete) callbacks.
5. **Keyboard Navigation & Interception**:
   - **Option + Arrow (Left/Right)**: Move cursor by skipping to the start/end of the current or adjacent word.
   - **Command + Arrow (Left/Right)**: Move cursor to the start/end of the current line or text block.
   - **Command + Arrow (Up/Down)**: Move cursor to the very start/end of the text content.
   - **Selection (Shift Key)**: Holding the **Shift key** in combination with any of the navigation shortcuts above (Arrow, Cmd+Arrow, Option+Arrow) will start a new selection or expand/contract the existing selection range accordingly.
   - **CRITICAL**: Browser default behaviors for Command + Arrow shortcuts (e.g., navigating history) MUST be intercepted via `preventDefault()` when the `ITextInput` is focused and active.
6. `IText` is a read-only display element. `ITextInput` extends `IText` with editing capabilities.

### 6.4 API Contract

```typescript
export interface ITextStyle {
  fontFamily: string;              // Default: 'sans-serif'.
  fontSize: number;                // In pixels. Default: 14.
  fontWeight: 'normal' | 'bold';   // Default: 'normal'.
  fontStyle: 'normal' | 'italic';  // Default: 'normal'.
  color: string;                   // CSS color string. Default: '#000000'.
  lineHeight: number;              // In pixels. Default: fontSize * 1.2.
  textAlign: 'left' | 'center' | 'right'; // Default: 'left'.
  selectionColor?: string;         // Default: 'rgba(0, 0, 255, 0.3)'.
}

export interface ITextLine {
  text: string;                    // The string content of this line.
  width: number;                   // Measured width in pixels.
  advancements: number[];          // X-offset of each character's left edge, relative to line start.
}

export interface ITextLayout {
  lines: ITextLine[];
  totalHeight: number;             // Sum of all line heights.
}

export interface IText extends IElement {
  text: string;
  readonly textLayout: ITextLayout; // Recomputed when text, font, or width changes.
  style: ITextStyle;
}

export interface ITextInput extends IText {
  selectionStart: number;          // Character index. 0-based.
  selectionEnd: number;            // Character index. When equal to selectionStart, this is the cursor position.
  isPassword: boolean;             // Default: false. When true, display '•' per character.
  placeholder: string;             // Shown when text is empty, in reduced alpha.
  readOnly: boolean;               // Default: false. When true, input is not editable.
  maxLength: number;               // Default: Infinity. Maximum character count.
  multiline: boolean;              // Default: false. When true, Enter inserts a newline. When false, Enter fires 'submit'.

  // Events (emitted via IEventEmitter)
  // 'change'   — text content changed. Event payload: { value: string }.
  // 'submit'   — Enter pressed on single-line input. Event payload: { value: string }.
  // 'focus'    — Input received focus.
  // 'blur'     — Input lost focus.
}
```

---

## 7. Hierarchical Ticker System

### 7.1 Philosophy

A single `requestAnimationFrame` loop drives the entire system. The Ticker provides a stable `deltaTime` and orchestrates the update → layout → paint pipeline in order.

### 7.2 Mechanics

Each frame proceeds in this exact order:
1. **Tick**: Compute `deltaTime` (time since last frame, in **seconds**, capped at `maxDeltaTime` to prevent spiral-of-death after tab backgrounding).
2. **Update**: Walk the scene graph and call `update(dt)` on every element that has `DirtyFlags != None`. This resolves transforms and triggers layout.
3. **Layout**: Run the layout resolver on subtrees that have `DirtyFlags.Layout`.
4. **Paint**: For each layer, call `render()` which walks the layer's elements and calls `paint(ctx)`.

### 7.3 Behavioral Rules

1. `deltaTime` is in **seconds** (e.g., `0.016` at 60fps).
2. `maxDeltaTime` defaults to `0.1` (100ms). If the real delta exceeds this (e.g., tab was backgrounded), it is clamped.
3. `globalFPS` is the target frame rate. When set to a value lower than the display refresh rate, the ticker skips frames to approximate the target. Setting `globalFPS` to `0` pauses the ticker.
4. `add(element)` registers an element for per-frame `update()` calls. `remove(element)` unregisters it. Adding the scene's `root` is sufficient to update the entire tree (since `update()` recurses into children).
5. `start()` begins the `requestAnimationFrame` loop. `stop()` cancels it.

### 7.4 API Contract

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

---

## 8. Rendering Wrapper (Arena2DContext)

### 8.1 Philosophy

A safe wrapper around `CanvasRenderingContext2D` that prevents state leakage and provides high-level drawing primitives. Every `paint()` call is sandwiched between automatic `save()` and `restore()` — the element never needs to manage canvas state manually.

### 8.2 Behavioral Rules

1. Before calling `element.paint(ctx)`, the framework calls `ctx.raw.save()`, applies the element's `worldMatrix` via `setTransform()`, sets `globalAlpha` to the effective alpha, and sets `globalCompositeOperation` to the element's `blendMode`.
2. After `paint()` returns, the framework calls `ctx.raw.restore()`.
3. Elements should use the wrapper methods when possible. Direct access to `ctx.raw` is available for advanced use but the element **must not** call `save()`/`restore()` or `setTransform()` on `raw` — doing so corrupts the state stack.

### 8.3 API Contract

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

  // Line style (applied to subsequent stroke operations)
  setLineWidth(width: number): void;
  setLineDash(segments: number[]): void;
}
```

---

## 9. Image & Texture Elements

### 9.1 Philosophy

Images and sprite sheets are common in canvas UIs. `IImage` provides a simple element for displaying bitmaps, with support for nine-slice scaling for UI panels.

### 9.2 Behavioral Rules

1. **Source loading**: Images are loaded from `HTMLImageElement`, `ImageBitmap`, or `OffscreenCanvas`. The library does **not** handle fetching — the user provides an already-loaded source.
2. **Intrinsic size**: The intrinsic content size is the source image's natural dimensions. If `width`/`height` are set on the style, the image is scaled to fit.
3. **Nine-slice**: When `nineSlice` is set, the image is divided into 9 regions by the insets. The corners are drawn at their natural size, the edges are stretched along one axis, and the center is stretched to fill.

### 9.3 API Contract

```typescript
export interface IImage extends IElement {
  source: CanvasImageSource | null;        // The image to draw. Set to null to clear.
  sourceRect?: IRect;                      // Optional sub-region of the source (for sprite sheets).
  nineSlice?: [number, number, number, number]; // [top, right, bottom, left] insets. Optional.
  tint?: string;                           // Optional color tint applied via compositing.
}
```

---


## 10. Scroll Containers

### 10.1 Philosophy

A specialized container that allows its children to overflow and be navigated via pointer drag or wheel events, with optional inertial scrolling and scroll bars.

### 10.2 Behavioral Rules

1. **Scroll offset**: The scroll container offsets its children's rendering by `(scrollX, scrollY)`. This is applied as a translation in the container's `paint()` method, not by modifying children's transforms.
2. **Content bounds**: The scrollable area is determined by the union of all children's AABBs at layout time.
3. **Clamping**: `scrollX` and `scrollY` are clamped to `[0, contentWidth - viewportWidth]` and `[0, contentHeight - viewportHeight]` respectively. If content is smaller than the viewport, scrolling is disabled on that axis.
4. **Inertia**: When `inertia` is `true`, releasing a drag applies residual velocity that decays exponentially. The decay factor is `decelerationRate` (default `0.95`, applied per frame).
5. **Scroll bars**: When `showScrollBars` is `true`, a semi-transparent rounded-rect indicator is drawn on the right/bottom edges indicating scroll position. Bars fade out after `scrollBarFadeDelay` seconds of inactivity.

### 10.3 API Contract

```typescript
export interface IScrollContainer extends IContainer {
  scrollX: number;                 // Current horizontal scroll offset.
  scrollY: number;                 // Current vertical scroll offset.
  readonly contentWidth: number;   // Computed total content width.
  readonly contentHeight: number;  // Computed total content height.
  scrollEnabled: [boolean, boolean]; // [horizontal, vertical]. Default: [false, true].
  inertia: boolean;                // Default: true.
  decelerationRate: number;        // Default: 0.95.
  showScrollBars: boolean;         // Default: true.
  scrollBarFadeDelay: number;      // Default: 1.0 seconds.

  scrollTo(x: number, y: number, animated?: boolean): void;
  scrollBy(dx: number, dy: number, animated?: boolean): void;

  // Events emitted: 'scroll' — { scrollX, scrollY }.
}
```

---

## 11. Error Handling & Memory Management

### 11.1 Error Handling

The library uses the following conventions:

| Situation | Behavior |
|---|---|
| Adding a child that already has a parent | Silently remove from old parent first, then add to new parent. |
| Removing a child that is not in the container | No-op (no error thrown). |
| Setting `scaleX` or `scaleY` to `0` | Clamp to `Number.EPSILON`. Log a warning in debug mode. |
| Invalid layout unit string (e.g., `'abc'`) | Treat as `0` and log a warning. |
| Setting `alpha` outside `[0, 1]` | Clamp to `[0, 1]`. |

**Debug mode** is enabled by setting `Arena2D.debug = true`. In debug mode, warnings are printed to `console.warn` for invalid states and performance hints (e.g., "Container with 500+ children and no cacheAsBitmap").

### 11.2 Memory Management

1. **`destroy()`** must be called on elements when they are no longer needed. `destroy()` on a container recursively destroys all children.
2. `destroy()` releases: `OffscreenCanvas` objects (cache-as-bitmap), event listeners, spatial hash grid entries, animation handles, and the hidden `<textarea>` for text inputs.
3. **`scene.destroy()`** removes all layer canvases from the DOM, cancels the ticker, and destroys the root container.
4. Scenes that are garbage-collected without `destroy()` being called will leak DOM elements. In debug mode, a `FinalizationRegistry` logs a warning if this occurs.

---

## Appendix A: Full Inheritance Diagram

```
IEventEmitter
  └── IElement (+ ITransform)
        ├── IContainer
        │     ├── IScrollContainer
        │     └── (user subclasses)
        ├── IText
        │     └── ITextInput
        ├── IImage
        └── (user subclasses)
```

## Appendix B: Frame Pipeline Summary

```
requestAnimationFrame
  │
  ├── 1. Ticker: compute deltaTime
  ├── 2. Update: walk scene graph, resolve DirtyFlags.Transform
  ├── 3. Layout: resolve DirtyFlags.Layout subtrees (measure → arrange)
  ├── 4. Spatial: update SpatialHashGrid for moved elements
  ├── 5. Paint: for each layer, paint elements in zIndex order
  └── 6. Hit Buffer: render interactive elements for hit-testing (if pointer moved)
```
