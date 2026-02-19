# Arena-2D — Product Requirements Document

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
4. **Narrow API Surface** — Export only what SPEC.md defines. Keep internals unexported behind `src/internal/`.
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
Layer 13  Animation System
  │
Layer 14  Scroll Containers
  │
Layer 15  Error Handling, Debug Mode & Memory Management
  │
Layer 16  API Surface, Bundle & Documentation
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

> **Spec Reference:** §1

### Goal
Implement the affine transformation math utilities that everything else builds on.

### Deliverables

| # | Item | Details |
|---|---|---|
| 1.1 | **`src/math/matrix.ts`** | `MatrixArray` type, `identity()`, `multiply(a, b)`, `translate()`, `rotate()`, `scale()`, `invert()`, `transformPoint()` |
| 1.2 | **`src/math/aabb.ts`** | `computeAABB(localBounds, worldMatrix)` returning `IRect` |
| 1.3 | **`ITransform` mixin / base** | Properties (`x`, `y`, `rotation`, `scaleX`, `scaleY`, `pivotX`, `pivotY`) with `updateLocalMatrix()` composing as specified: `T(x+px, y+py) × R(θ) × S(sx, sy) × T(-px, -py)` |
| 1.4 | **Unit tests** | Exercise identity, composition, inversion, pivoted rotation, AABB from rotated rect, edge cases (`scaleX = -1`, very small angles) |

### Acceptance Criteria
- All matrix operations produce results matching hand-calculated values within `1e-6` tolerance.
- `bun test` passes all math tests.

### Demo Panel
A live canvas showing a rectangle with draggable sliders for `x`, `y`, `rotation`, `scaleX`, `scaleY`, `pivotX`, `pivotY`. The rectangle's world-space AABB is drawn as a dashed overlay.

---

## Layer 2 — Event Emitter

> **Spec Reference:** §5.3 (Event Listener API)

### Goal
A minimal, typed event emitter that `IElement` will later extend.

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

> **Spec Reference:** §2.1–2.4 (partial: `IElement` without container logic)

### Goal
Implement the base `Element` class with dirty flag management, lifecycle hooks, alpha compositing, and the `ITransform` interface from Layer 1.

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

> **Spec Reference:** §2.4 (`IContainer`), §2.3 (rendering order, cache-as-bitmap)

### Goal
Implement the `Container` class that manages child lists, z-ordering, scene propagation, and cache-as-bitmap.

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

> **Spec Reference:** §7

### Goal
Implement the single `requestAnimationFrame` loop that drives the update → layout → paint pipeline.

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

> **Spec Reference:** §8

### Goal
Build the safe `CanvasRenderingContext2D` wrapper with high-level drawing primitives and automatic save/restore.

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
- Drawing primitives produce the correct shapes on a test canvas (visual snapshot or bounds check).
- State stack never leaks between paint calls.

### Demo Panel
A "shape gallery" drawing every primitive: rects, rounded rects, circles, ellipses, lines, polygons, gradients, shadows. A second area shows clipping in action.

---

## Layer 7 — Scene & Layering System

> **Spec Reference:** §3

### Goal
Implement the `Scene` which manages DOM `<canvas>` elements, DPI scaling, layers, and the hit buffer.

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
A full Scene with two layers: a "background" layer with static shapes and a "foreground" layer with a draggable element (pointer tracking only — full interaction in Layer 9). Layer opacity sliders.

---

## Layer 8 — Layout Engine (Flex & Anchor)

> **Spec Reference:** §4

### Goal
Implement the two-pass layout resolver: Measure (bottom-up) then Arrange (top-down), supporting `manual`, `flex`, and `anchor` display modes. This layer drives the positioning of all elements.

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
| 8.10 | **Performance Strategy** | **Layout Boundaries**: Elements with fixed dimensions stop dirtiness bubbling. **Measurement Caching**: Cache `measure()` results based on input constraints. **Integer Snapping**: Snap final values to avoid sub-pixel blurring. |
| 8.11 | **Unit tests** | Flex row/column distribution, wrap behavior, percentage units, anchor stretching, min/max clamping, nested flex, auto sizing, boundary optimization |

### Acceptance Criteria
- **Flex Layout Verification**:
    - A `row` container with `justify-content: space-between` correctly positions first/last children against edges.
    - `flex-wrap: wrap` moves overflowing items to a new line, respecting `align-content` (if implemented) or simple line stacking.
    - `flex-grow` distributes free space proportionally (e.g., item A with grow 2 gets twice the extra space of item B with grow 1).
    - `flex-shrink` correctly reduces sizes of items when container overflows, weighted by `flex-basis`.
    - `align-items: center` correctly centers children of varying heights on the cross-axis.
- **Constraints & Sizing**:
    - `min-width` prevents an element from shrinking below a threshold even with `flex-shrink: 1`.
    - `max-width` clamps an element even if `flex-grow` would expand it further.
    - Percentage `width: 50%` resolves accurately against parent content box (parent width minus padding).
    - `padding` on a container reduces the available space for children.
    - `margin` creates correct spacing between siblings and successfully collapses (if implementing margin collapsing, otherwise specify no-collapse behavior).
- **Advanced / Edge Cases**:
    - **Nesting**: A flex column inside a flex row correctly calculates its own size before the parent finishes.
    - **Anchoring**: An element with `position: absolute` (implemented via `display: manual` + anchors in this engine) inside a relative parent is removed from flex flow but positioned correctly.
    - **Zero-size handling**: Elements with `0` width/height do not cause division-by-zero errors in alignment logic.
- **Performance**:
    - Modifying a child element's internal text (which changes its size) triggers layout *only* up to the nearest `Layout Boundary` (if the boundary has fixed size).
    - Layout time scales linearly `O(n)` with number of elements for simple flex trees.

### Demo Panel
**Interactive Layout Playground:**
A split-screen interface:
1.  **Sidebar (Controls):**
    - **Container Settings:**
        - `flex-direction` (Row/Column)
        - `justify-content` (Start/Center/End/Space-Between/Space-Around)
        - `align-items` (Start/Center/End/Stretch)
        - `flex-wrap` (NoWrap/Wrap)
        - `gap` (Slider: 0-50px)
        - `padding` (Slider: 0-50px)
    - **Select Child:** Dropdown or click-to-select specific child box.
        - `flex-grow` (Input/Slider)
        - `flex-shrink` (Input/Slider)
        - `flex-basis` (Input: px/%)
        - `align-self` (Override parent align)
        - `width` / `height` (Slider, toggle 'auto')
    - **Actions:**
        - [Add Child] (Adds random colored box)
        - [Remove Selected]
        - [Randomize Layout]
2.  **Main View (Preview):**
    - The flex container rendered with a dashed border to show bounds.
    - Children rendered as colored boxes with their index number.
    - **Visual Debug Overlays** (Toggleable):
        - Show Padding (Green overlay)
        - Show Margins (Orange overlay)
        - Show Gaps (Hatched overlay)
    - **Performance HUD:**
        - "Layout Time: 0.12ms"
        - "Nodes Visited: 15"
        - "Reflows/sec"


---

## Layer 9 — Interaction & Focus System

> **Spec Reference:** §5

### Goal
Implement unified pointer/keyboard event handling, hit-testing via SpatialHashGrid, event bubbling, and tab-focus management.

### Deliverables

| # | Item | Details |
|---|---|---|
| 9.1 | **Drag & Drop System** | `src/interaction/DragManager.ts`. `draggable` property on elements. Events: `dragstart`, `dragmove`, `dragend`, `dragenter`, `dragleave`, `drop`. Supports drag targets, axis constraints (lock X/Y), and cancellation via `Escape` or invalid drop. Integrates with `InteractionManager`. |
| 9.2 | **`src/interaction/SpatialHashGrid.ts`** | 2D grid (default cell size `128`). Insert/remove/query by world AABB. Updated on `DirtyFlags.Spatial`. |
| 9.3 | **`src/interaction/InteractionManager.ts`** | Listens on scene's topmost canvas for pointer/keyboard DOM events. Translates to `IPointerEvent` / `IKeyboardEvent`. Hooks for drag initiation. |
| 9.4 | **Hit-testing** | Broad phase: query `SpatialHashGrid`. Narrow phase: inverse world matrix point-in-bounds test, back-to-front ordering. |
| 9.5 | **Event dispatch** | `pointerdown`, `pointerup`, `pointermove`, `pointerenter/leave`, `click`, `wheel`. Bubbling (no capture phase). `stopPropagation()`. `pointerenter`/`leave` do not bubble. |
| 9.6 | **Keyboard dispatch** | `keydown`, `keyup` to focused element. |
| 9.7 | **Focus management** | `setFocus()`, `tabNext()`, `tabPrev()`. Depth-first traversal for tab order. `focus`/`blur` events. |
| 9.8 | **Interactive passthrough** | Hit buffer alpha sampling for HTML pass-through (CSS `pointer-events: none`). |
| 9.9 | **Cursor** | Set `container.style.cursor` based on hovered element's `cursor` property. |
| 9.10 | **Unit tests** | Hit-test ordering, bubbling chain, stopPropagation, enter/leave non-bubbling, tab order, focus/blur, spatial hash grid insert/query, drag constraints, drop events. |

### Acceptance Criteria
- Clicking overlapping elements hits the topmost by z-index.
- Event bubbles from target to root unless stopped.
- `pointerenter`/`pointerleave` fire only on the target, not ancestors.
- Tab cycles through focusable elements in depth-first order.
- Dragging an element moves it visually and fires drag events.
- Releasing a drag over a drop target fires `drop`. Esc cancels.

### Demo Panel
Interactive scene with overlapping, nested elements. Click displays event propagation path. Focus ring drawn around focused element. Tab key cycles focus. Hover shows cursor change. Draggable box with "Drop Zone" targets.

---

## Layer 10 — Text & Text Layout

> **Spec Reference:** §6.1–6.3 (IText, ITextLayout, word-wrap)

### Goal
Implement the **Inline Layout** system. This is a specialized sub-engine that handles glyph positioning, efficient wrapping, and text metrics. It is opaque to the main Layout Engine (Layer 8) — providing only intrinsic size measurements.

### Deliverables

| # | Item | Details |
|---|---|---|
| 10.1 | **`src/elements/Text.ts`** | Implements `IText`. Renders via `ctx.fillText()` using pre-measured advancements. |
| 10.2 | **`src/text/TextLayout.ts`** | specialized resolver for **Inline Layout**. Handles word-wrapping, kerning (via canvas), and line breaking. |
| 10.3 | **Measure Contract** | `measure(availableWidth, availableHeight)` returns intrinsic size. Caches results to avoid potentially expensive `ctx.measureText` calls. |
| 10.4 | **Intrinsic Sizing** | Reports proper `min-content` (widest word) and `max-content` (full single line) widths to Layer 8. |
| 10.5 | **`ITextStyle`** | `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `color`, `lineHeight`, `textAlign` |
| 10.6 | **`fontReady` utility** | Check font availability via `document.fonts.check()`. |
| 10.7 | **Unit tests** | Word wrap at exact boundary, hard line breaks, empty string, single word wider than container, alignment offsets |

### Acceptance Criteria
- Text wraps correctly at container width boundaries.
- Changing `fontSize` triggers layout re-measure in Layer 8.
- `textAlign: 'center'` centers each line within the element's width.
- Thousands of characters can be rendered without creating thousands of `IElement` nodes.

### Demo Panel
A text block with editable content (via browser textarea), font controls, and width slider showing live word-wrap behavior. Advancements visualized as vertical tick marks. Performance test with large text blocks.

---

## Layer 11 — Text Input & IME

> **Spec Reference:** §6 (ITextInput, IME bridge)

### Goal
Extend `IText` into an editable `ITextInput` with cursor, selection, clipboard, and IME support.

### Deliverables

| # | Item | Details |
|---|---|---|
| 11.1 | **`src/elements/TextInput.ts`** | Extends `Text`. `selectionStart`, `selectionEnd`, cursor rendering (blinking caret). |
| 11.2 | **Selection rendering** | Multi-rect rendering behind selected text (one rect per line). Selection color configurable via `ITextStyle`. |
| 11.3 | **IME bridge** | Hidden 1×1 `<textarea>` positioned at cursor world position. Forwards input events to `ITextInput`. |
| 11.4 | **Clipboard** | Copy, **Cut**, and Paste via hidden textarea delegation. `onCopy`, `onCut`, `onPaste` callbacks. |
| 11.5 | **Input properties** | `isPassword` (bullet masking), `placeholder`, `readOnly`, `maxLength`, `multiline`. |
| 11.6 | **Events** | Emits `change`, `submit` (Enter on single-line), `focus`, `blur`. |
| 11.7 | **Keyboard Navigation** | **Intercepted Browser behavior**: Option + Left/Right (jump words), Cmd + Left/Right (move to start/end of line). **Selection**: Holding the **Shift key** in combination with any navigation shortcut starts or expands a selection range. |
| 11.8 | **Unit tests** | Cursor movement (arrow keys, word jumps), selection bounds, password masking, maxLength enforcement, multiline Enter vs single-line submit |

### Acceptance Criteria
- Clicking in text positions cursor at the correct character.
- Shift+Arrow expands selection. Copy/paste works via keyboard shortcuts.
- IME composition (tested manually with CJK input) inserts correctly.
- `isPassword` displays bullets.

### Demo Panel
A form with single-line input, password input, and multiline textarea. Shows cursor/selection behavior, placeholder text, and a "submitted values" readout.

---

## Layer 12 — Image & Nine-Slice

> **Spec Reference:** §9

### Goal
Implement `IImage` element for displaying bitmaps with optional nine-slice scaling and sprite sheet regions.

### Deliverables

| # | Item | Details |
|---|---|---|
| 12.1 | **`src/elements/Image.ts`** | Implements `IImage`. Draws `source` via `Arena2DContext.drawImage`. |
| 12.2 | **Source rect** | `sourceRect` for sprite sheet sub-regions. |
| 12.3 | **Nine-slice** | `nineSlice: [top, right, bottom, left]` divides image into 9 regions. Corners at natural size, edges stretched on one axis, center fills. |
| 12.4 | **Tint** | Color tint via compositing. |
| 12.5 | **Intrinsic size** | Natural image dimensions when style is `'auto'`. |
| 12.6 | **Unit tests** | Nine-slice region math, source rect clipping, null source handling |

### Acceptance Criteria
- Image renders at correct position and size.
- Nine-slice correctly preserves corner dimensions while stretching center.
- Setting `source = null` clears the element.

### Demo Panel
An image gallery: standard image, sprite sheet with selectable region, and a nine-slice panel resizable via drag handles.

---

## Layer 13 — Animation System

> **Spec Reference:** §10

### Goal
Lightweight tweening system for animating element properties with easing.

### Deliverables

| # | Item | Details |
|---|---|---|
| 13.1 | **`src/animation/Animation.ts`** | `element.animate(props, options)` returns `IAnimation`. Processes during `update()` phase. |
| 13.2 | **Easing functions** | `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutCubic`, `easeInBack`, `easeOutBack`, `easeOutElastic` |
| 13.3 | **Conflict resolution** | Same-property conflict: newest animation cancels older one for that property. |
| 13.4 | **Loop & yoyo** | `loop: true` repeats. `yoyo: true` alternates direction. |
| 13.5 | **Lifecycle** | `cancel()`, `pause()`, `resume()`. Auto-cleanup on completion. Cancelled on `destroy()`. |
| 13.6 | **Callbacks** | `onComplete`, `onUpdate(progress)`. |
| 13.7 | **Unit tests** | Duration accuracy, easing curve verification, conflict cancellation, pause/resume, loop count, yoyo direction, destroy cleanup |

### Acceptance Criteria
- An animation completes within ±1 frame of the specified duration.
- Same-property conflict correctly cancels the older tween.
- `pause()` then `resume()` continues from the paused progress.

### Demo Panel
An animation playground: draggable elements with preset animations (slide, fade, scale, bounce). Easing curve selector with live preview. Loop/yoyo toggles.

---

## Layer 14 — Scroll Containers

> **Spec Reference:** §11

### Goal
Implement scrollable containers with inertial scrolling and scroll bar indicators.

### Deliverables

| # | Item | Details |
|---|---|---|
| 14.1 | **`src/elements/ScrollContainer.ts`** | Extends `Container`. Offsets children by `(scrollX, scrollY)` during paint. |
| 14.2 | **Content bounds** | Union of children's AABBs determines scrollable area. |
| 14.3 | **Clamping** | Scroll values clamped to `[0, max]`. Disabled axes when content fits. |
| 14.4 | **Pointer drag scrolling** | Track pointer delta on `pointermove` while button down. |
| 14.5 | **Wheel scrolling** | `wheel` event maps to scroll offset. |
| 14.6 | **Inertia** | Residual velocity on release, decaying by `decelerationRate` per frame. |
| 14.7 | **Scroll bars** | Semi-transparent rounded-rect indicators. Fade out after `scrollBarFadeDelay`. |
| 14.8 | **`scrollTo` / `scrollBy`** | Programmatic scrolling, optional animation. |
| 14.9 | **Events** | Emits `scroll` events with `{ scrollX, scrollY }`. |
| 14.10 | **Unit tests** | Clamping correctness, inertia decay, scroll bar sizing, wheel delta mapping, disabled axis |

### Acceptance Criteria
- Scrolling clamps correctly and does not overshoot.
- Inertia provides smooth deceleration after release.
- Scroll bars correctly indicate position and fade after inactivity.
- Wheel events scroll the content.

### Demo Panel
A scrollable list of items (100+ rows) with both vertical and horizontal scrolling. Inertia toggle. Deceleration rate slider. Scroll bar visibility toggle.

---

## Layer 15 — Error Handling, Debug Mode & Memory Management

> **Spec Reference:** §12

### Goal
Implement defensive error handling, debug mode diagnostics, and robust memory cleanup.

### Deliverables

| # | Item | Details |
|---|---|---|
| 15.1 | **Error conventions** | Re-parenting auto-removes. Remove non-child is no-op. Scale 0 → `Number.EPSILON`. Invalid layout units → `0`. Alpha clamped to `[0, 1]`. |
| 15.2 | **Debug mode** | `Arena2D.debug = true` enables `console.warn` for: invalid states, performance hints (500+ children without cache-as-bitmap). |
| 15.3 | **`destroy()` audit** | Verify every element type releases: `OffscreenCanvas`, event listeners, spatial hash entries, animations, hidden `<textarea>`. |
| 15.4 | **`FinalizationRegistry`** | In debug mode, warn when a Scene is GC'd without `destroy()`. |
| 15.5 | **Unit tests** | Each error convention, debug mode warnings, destroy resource release |

### Acceptance Criteria
- All error scenarios from SPEC §12 table are handled without throwing.
- Debug mode produces actionable warnings.
- After `scene.destroy()`, no DOM elements or animation frames remain.

### Demo Panel
A "Stress Test" panel: create/destroy hundreds of elements, monitor for memory leaks via performance counters. Debug mode toggle showing live warnings.

---

## Layer 16 — API Surface, Bundle & Documentation

### Goal
Finalize the public API surface, produce the production bundle, and ensure the demo site serves as comprehensive documentation.

### Deliverables

| # | Item | Details |
|---|---|---|
| 16.1 | **`src/index.ts`** | Single barrel export. Export only public API types and classes. |
| 16.2 | **Production bundle** | `bun build` → `dist/arena-2d.js` (minified ESM) + `dist/arena-2d.d.ts` (type declarations). |
| 16.3 | **Demo site polish** | All layer demo panels reviewed, navigation polished, mobile responsive. |
| 16.4 | **README.md** | Quick-start guide linking to demo site and SPEC.md. |
| 16.5 | **Final test sweep** | All `bun test` suites green. Manual walkthrough of every demo panel. |

### Acceptance Criteria
- `import { Scene, Container, Text } from 'arena-2d'` works from a consumer project.
- Type declarations are correct and complete.
- Demo site demonstrates every feature from SPEC.md.
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
| **M5 — Polish** | 13–15 | Animation, scrolling, error handling, memory management |
| **M6 — Ship** | 16 | Bundle, types, docs, final QA |

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Canvas text measurement inconsistency across browsers | Text layout breaks on different engines | Use `OffscreenCanvas` for measurement where available; fallback metrics comparison tests |
| HiDPI rendering artifacts | Blurry or misaligned rendering | DPR handling tested on 1x, 2x, and 3x pixel ratios from Layer 7 onward |
| Layout engine combinatorial complexity | Long test cycles for flex edge cases | Follow CSS Flexbox spec test suite as reference; start with basic cases, expand iteratively |
| IME integration differences across OS | Text input broken on certain platforms | Hidden textarea approach tested on macOS, Windows, and mobile Safari |
| Performance regression as layers accumulate | Frame drops in demo | FPS counter in demo from Layer 5 onward; performance budget: 60fps with 1000 elements |
