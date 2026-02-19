# Arena-2D — Implementation Progress

> This file is the single source of truth for implementation state.
> An AI agent reads this at the start of every session to know where to pick up.

---

### Layer 10 — Text & Text Layout ✅
- [x] 10.1 `src/elements/Text.ts` — `IText` with `fillText()` rendering
- [x] 10.2 `src/text/TextLayout.ts` — greedy word-wrap, per-character advancements
- [x] 10.3 Intrinsic sizing (widest line × lineHeight × line count)
- [x] 10.4 `ITextStyle` implementation
- [x] 10.5 `fontReady` utility
- [x] 10.6 Unit tests (wrap boundary, hard breaks, empty string, single long word, alignment)
- [x] 10.7 Demo panel — text block with font controls and width slider
- **Acceptance:** Word-wrap is correct; font size change triggers re-measure; alignment works
- Tests: 364/364 passing (40 new text tests + 324 prior)

---

## Current Phase

Layer 11 — Text Input & IME

## Status

🔍 AWAITING REVIEW

---

## Agent Rules

1. **Read before writing.** Always read this file, `PRD.md`, and the relevant `SPEC.md` section before doing any work.
2. **One layer at a time.** Only work on the `Current Phase`. Never jump ahead.
3. **Update as you go.** Check off sub-items as they are completed.
4. **Test before review.** Run `bun test` and confirm all tests pass before requesting review.
5. **Quality gates before review.** After completing work, all of the following must pass in order:
   1. `bun run typecheck` — no type errors
   2. `bun run lint` — no lint errors
   3. `bun test` — all unit tests pass
   4. Functional browser test — verify the demo panel in the browser for features added
6. **Stop at the gate.** When all sub-items are done, set status to `🔍 AWAITING REVIEW` and stop.
7. **Never modify completed layers** without explicit human approval.
8. **Never add npm dependencies.** The library has zero runtime dependencies.
9. **Never deviate from SPEC.md** without raising it as an ambiguity first.

### Autonomy Boundaries

| ✅ Autonomous | 🚫 Must Ask First |
|---|---|
| Create/edit files in `src/`, `tests/`, `demo/` | Change public API interfaces |
| Write and run tests | Deviate from SPEC.md behavior |
| Build and update demo panels | Skip a sub-item or acceptance criterion |
| Fix failing tests in current layer | Modify code in a completed layer |
| Refactor internals within current layer | Add any npm dependency |

---

## Completed Layers

### Layer 0 — Project Scaffold & Demo Site ✅
- [x] 0.1 Directory structure
- [x] 0.2 `package.json` with scripts
- [x] 0.3 `tsconfig.json`
- [x] 0.4 Bun dev server with WebSocket live-reload
- [x] 0.5 Demo shell page
- [x] 0.6 `bun build` entry producing `dist/arena-2d.js`
- [x] 0.7 Smoke test
- Tests: 4/4 passing

---

### Layer 1 — Core Math & Transformation Engine ✅
- [x] 1.1 `src/math/matrix.ts` — `MatrixArray`, identity, multiply, translate, rotate, scale, invert, transformPoint
- [x] 1.2 `src/math/aabb.ts` — `computeAABB(localBounds, worldMatrix)`
- [x] 1.3 `ITransform` mixin with property setters and `updateLocalMatrix()`
- [x] 1.4 Unit tests (identity, composition, inversion, pivoted rotation, AABB, edge cases)
- [x] 1.5 Demo panel — rectangle with transform sliders and AABB overlay
- Tests: 47/47 passing

---

### Layer 2 — Event Emitter ✅
- [x] 2.1 `src/events/EventEmitter.ts` — `on()`, `off()`, `once()`, `emit()`
- [x] 2.2 Unit tests (add/remove/once, emit ordering, off-during-emit safety)
- [x] 2.3 Demo panel — Interactive event emitter playground
- Tests: 7/7 passing

---

### Layer 3 — Element Base & Dirty Flagging ✅
- [x] 3.1 `src/core/DirtyFlags.ts` — bitmask enum
- [x] 3.2 `src/core/Element.ts` — `IElement` + `IEventEmitter`, property setters → `invalidate()`
- [x] 3.3 Alpha chain (`effectiveAlpha = parent.effectiveAlpha * alpha`)
- [x] 3.4 `visible`, `zIndex`, `blendMode` with `Visual` dirty flag
- [x] 3.5 `destroy()` — detach, clear listeners, clear flags
- [x] 3.6 Unit tests (flag coalescing, lifecycle hooks, alpha chain, destroy)
- [x] 3.7 Demo panel — dirty flag inspector, transform controls, auto/manual update, destroy demo
- Tests: 102/102 passing (35 new element tests + 67 prior)

---

### Layer 4 — Container & Child Management ✅
- [x] 4.1 `src/core/Container.ts` — `addChild`, `addChildAt`, `removeChild`, `removeAllChildren`, `sortChildren`, `getChildByID`, `clipContent`
- [x] 4.2 Scene propagation — `onAdded`/`onRemoved`/`onSceneChanged` cascade
- [x] 4.3 Transform cascade — `invalidate(Transform)` propagates to descendants
- [x] 4.4 Cache-as-bitmap — invalidation bubbling to nearest cached ancestor
- [x] 4.5 Unit tests (z-order, re-parenting, cascade depth, cache invalidation)
- [x] 4.6 Demo panel — nested container tree with add/remove/reorder controls
- Tests: 138/138 passing (36 new container tests + 102 prior)

---

### Layer 5 — Ticker (Frame Loop) ✅
- [x] 5.1 `src/core/Ticker.ts` — `start()`, `stop()`, `add()`, `remove()`
- [x] 5.2 FPS throttling (`globalFPS < refresh → skip frames; 0 = pause`)
- [x] 5.3 Frame pipeline ordering (stubs for layout/paint/hit)
- [x] 5.4 `elapsedTime` accumulation
- [x] 5.5 Unit tests (clamping, throttling, start/stop/restart, elapsed)
- [x] 5.6 Demo panel — FPS counter, deltaTime readout, bouncing ball, nested ticker
- Tests: 163/163 passing (25 new ticker tests)

---

### Layer 6 — Rendering Wrapper (CanvasUIContext) ✅
- [x] 6.1 `src/rendering/CanvasUIContext.ts` — all shape primitives
- [x] 6.2 Image drawing (`drawImage`, `drawImageRegion`)
- [x] 6.3 Text drawing (`drawText`, `measureText`)
- [x] 6.4 Effects (`setShadow`, `clearShadow`)
- [x] 6.5 Clipping (`clipRect`, `clipRoundedRect`)
- [x] 6.6 Gradients (`createLinearGradient`, `createRadialGradient`)
- [x] 6.7 Line style (`setLineWidth`, `setLineDash`)
- [x] 6.8 Auto save/restore wrapping (`beginElement`, `endElement`)
- [x] 6.9 Unit tests (save/restore balance, gradient stops, measureText)
- [x] 6.10 Demo panel — shape gallery with every primitive
- Tests: 194/194 passing (31 new context tests)

---

### Layer 7 — Scene & Layering System
- [x] 7.1 `src/core/Scene.ts` — host `<div>`, root container, resize, DPI handling
- [x] 7.2 `src/core/Layer.ts` — create/remove/get layers, CSS z-index ordering
- [x] 7.3 Layer assignment (inherit from parent unless overridden)
- [x] 7.4 Hit buffer (`OffscreenCanvas` with unique per-element colors)
- [x] 7.5 Coordinate transforms (`screenToScene`, `sceneToScreen`)
- [x] 7.6 `getElementById` with ID→element index
- [x] 7.7 Full frame pipeline wiring (Ticker → Elements → Context → Layers)
- [x] 7.8 Unit tests (layer ordering, DPR math, resize, hit buffer uniqueness)
- [x] 7.9 Demo panel — two-layer scene with static background and interactive foreground
- **Acceptance:** Elements render via Ticker; layers composite correctly; resize works; getElementById works
- Tests: 225/225 passing (31 new scene/layer tests)
---

### Layer 8 — Layout Engine (Flex & Anchor) ✅
- [x] 8.1 `src/layout/LayoutResolver.ts` — two-pass walker (measure bottom-up, arrange top-down)
- [x] 8.2 `src/layout/Style.ts` — `IStyle` with defaults and unit resolution
- [x] 8.3 Manual mode (skip layout, user-set position/size)
- [x] 8.4 Flex mode (direction, justify, align, grow, shrink, basis, wrap, gap)
- [x] 8.5 Anchor mode (top/left/right/bottom, opposing = stretch)
- [x] 8.6 Margin (sibling spacing in flex, inset in anchor)
- [x] 8.7 Min/max constraints
- [x] 8.8 Integration with update() phase on `DirtyFlags.Layout`
- [x] 8.9 Unit tests (flex distribution, wrap, percentages, anchors, min/max, nested flex, auto)
- [x] 8.10 Demo panel — interactive layout playground
- **Acceptance:** Flex distributes space correctly; anchors stretch; percentages resolve against parent
- Tests: 270/270 passing (45 new layout tests + 225 prior)
---

### Layer 9 — Interaction & Focus System ✅
- [x] 9.1 Drag & Drop System — `src/interaction/DragManager.ts`, `draggable` property, drag events, drop targets, constraints
- [x] 9.2 `src/interaction/SpatialHashGrid.ts` — insert/remove/query by AABB
- [x] 9.3 `src/interaction/InteractionManager.ts` — DOM event translation
- [x] 9.4 Hit-testing (broad phase → narrow phase, back-to-front)
- [x] 9.5 Pointer event dispatch with bubbling
- [x] 9.6 Keyboard dispatch to focused element
- [x] 9.7 Focus management (`setFocus`, `tabNext`, `tabPrev`, depth-first order)
- [x] 9.8 Interactive passthrough (hit buffer alpha → `pointer-events: none`)
- [x] 9.9 Cursor management
- [x] 9.10 Unit tests (drag constraints, drop events, in addition to existing tests)
- [x] 9.11 Demo panel — overlapping elements, focus ring, plus NEW draggable box with drop zones
- **Acceptance:** Topmost element wins click; bubbling works; tab cycles; dragging moves visually; drop fires events
- Tests: 307/307 passing (37 new interaction tests + 270 prior)
---

## Layer Checklist

### 🔴 Layer 0 — Project Scaffold & Demo Site
- [ ] 0.1 Directory structure (`src/`, `src/internal/`, `tests/`, `demo/`, `dist/`)
- [ ] 0.2 `package.json` with scripts: `dev`, `build`, `test`
- [ ] 0.3 `tsconfig.json` (strict, ESNext)
- [ ] 0.4 Bun dev server (`demo/server.ts`) with WebSocket live-reload
- [ ] 0.5 Demo shell page (`demo/index.html`) — dark theme, sidebar nav, main content area
- [ ] 0.6 `bun build` entry producing `dist/canvasui.js`
- [ ] 0.7 Smoke test (`tests/scaffold.test.ts`)
- **Acceptance:** `bun run dev` serves on localhost, `bun run build` produces bundle, `bun test` passes, live-reload works

---

### 🟡 Layer 1 — Core Math & Transformation Engine
- [ ] 1.1 `src/math/matrix.ts` — `MatrixArray`, identity, multiply, translate, rotate, scale, invert, transformPoint
- [ ] 1.2 `src/math/aabb.ts` — `computeAABB(localBounds, worldMatrix)`
- [ ] 1.3 `ITransform` mixin with property setters and `updateLocalMatrix()`
- [ ] 1.4 Unit tests (identity, composition, inversion, pivoted rotation, AABB, edge cases)
- [ ] 1.5 Demo panel — rectangle with transform sliders and AABB overlay
- **Acceptance:** All matrix operations match hand-calculated values within `1e-6`

---



---

### Layer 4 — Container & Child Management ✅
- [x] 4.1 `src/core/Container.ts` — `addChild`, `addChildAt`, `removeChild`, `removeAllChildren`, `sortChildren`, `getChildByID`, `clipContent`
- [x] 4.2 Scene propagation — `onAdded`/`onRemoved`/`onSceneChanged` cascade
- [x] 4.3 Transform cascade — `invalidate(Transform)` propagates to descendants
- [x] 4.4 Cache-as-bitmap — invalidation bubbling to nearest cached ancestor
- [x] 4.5 Unit tests (z-order, re-parenting, cascade depth, cache invalidation)
- [x] 4.6 Demo panel — nested container tree with add/remove/reorder controls
- Tests: 138/138 passing (36 new container tests + 102 prior)

---

### Layer 5 — Ticker (Frame Loop) ✅
- [x] 5.1 `src/core/Ticker.ts` — `start()`, `stop()`, `add()`, `remove()`
- [x] 5.2 FPS throttling (`globalFPS < refresh → skip frames; 0 = pause`)
- [x] 5.3 Frame pipeline ordering (stubs for layout/paint/hit)
- [x] 5.4 `elapsedTime` accumulation
- [x] 5.5 Unit tests (clamping, throttling, start/stop/restart, elapsed)
- [x] 5.6 Demo panel — FPS counter, deltaTime readout, bouncing ball, nested ticker
- **Acceptance:** `deltaTime` never exceeds `maxDeltaTime`; FPS throttle works; no spike on restart

---



---



### 🟡 Layer 10 — Text & Text Layout
- [x] 10.1 `src/elements/Text.ts` — `IText` with `fillText()` rendering
- [x] 10.2 `src/text/TextLayout.ts` — greedy word-wrap, per-character advancements
- [x] 10.3 Intrinsic sizing (widest line × lineHeight × line count)
- [x] 10.4 `ITextStyle` implementation
- [x] 10.5 `fontReady` utility
- [x] 10.6 Unit tests (wrap boundary, hard breaks, empty string, single long word, alignment)
- [x] 10.7 Demo panel — text block with font controls and width slider
- **Acceptance:** Word-wrap is correct; font size change triggers re-measure; alignment works
- Tests: 364/364 passing (40 new text tests + 324 prior)

---

### 🔴 Layer 11 — Text Input & IME
- [ ] 11.1 `src/elements/TextInput.ts` — cursor, selection, caret blinking
- [ ] 11.2 Selection rendering (filled rect from advancements)
- [ ] 11.3 IME bridge (hidden 1×1 `<textarea>`)
- [ ] 11.4 Clipboard (copy/paste via hidden textarea)
- [ ] 11.5 Input properties (`isPassword`, `placeholder`, `readOnly`, `maxLength`, `multiline`)
- [ ] 11.6 Events (`change`, `submit`, `focus`, `blur`)
- [ ] 11.7 Unit tests (cursor movement, selection, password masking, maxLength, multiline vs single-line)
- [ ] 11.8 Demo panel — form with single-line, password, and multiline inputs
- **Acceptance:** Click positions cursor correctly; shift+arrow selects; copy/paste works; password shows bullets

---

### 🟢 Layer 12 — Image & Nine-Slice
- [ ] 12.1 `src/elements/Image.ts` — `IImage` rendering
- [ ] 12.2 Source rect for sprite sheets
- [ ] 12.3 Nine-slice rendering
- [ ] 12.4 Tint via compositing
- [ ] 12.5 Intrinsic sizing from natural dimensions
- [ ] 12.6 Unit tests (nine-slice math, source rect, null source)
- [ ] 12.7 Demo panel — image gallery with sprite sheet, nine-slice, drag-resize
- **Acceptance:** Nine-slice preserves corners; sprite region clips correctly; null source clears

---

### 🟡 Layer 13 — Animation System
- [ ] 13.1 `src/animation/Animation.ts` — `element.animate()` returning `IAnimation`
- [ ] 13.2 Built-in easing functions (10 functions)
- [ ] 13.3 Same-property conflict resolution (newest wins)
- [ ] 13.4 Loop and yoyo support
- [ ] 13.5 Lifecycle (`cancel`, `pause`, `resume`, auto-cleanup, destroy cleanup)
- [ ] 13.6 Callbacks (`onComplete`, `onUpdate`)
- [ ] 13.7 Unit tests (duration accuracy, easing curves, conflicts, pause/resume, loop, yoyo, destroy)
- [ ] 13.8 Demo panel — animation playground with easing selector and loop/yoyo toggles
- **Acceptance:** Completes within ±1 frame; conflicts cancel older tween; pause/resume works

---

### 🟡 Layer 14 — Scroll Containers
- [ ] 14.1 `src/elements/ScrollContainer.ts` — scroll offset during paint
- [ ] 14.2 Content bounds computation (union of children AABBs)
- [ ] 14.3 Scroll clamping and axis disabling
- [ ] 14.4 Pointer drag scrolling
- [ ] 14.5 Wheel scrolling
- [ ] 14.6 Inertia with deceleration
- [ ] 14.7 Scroll bar indicators with fade
- [ ] 14.8 `scrollTo` / `scrollBy` (programmatic, optional animation)
- [ ] 14.9 `scroll` event emission
- [ ] 14.10 Unit tests (clamping, inertia decay, scroll bar sizing, wheel, disabled axis)
- [ ] 14.11 Demo panel — scrollable list with 100+ items, toggles for inertia/bars
- **Acceptance:** No overshoot; inertia decelerates smoothly; bars fade; wheel works

---

### 🟡 Layer 15 — Error Handling, Debug Mode & Memory Management
- [ ] 15.1 Error conventions (re-parent auto-remove, scale 0 → epsilon, alpha clamp, etc.)
- [ ] 15.2 Debug mode (`CanvasUI.debug = true` → `console.warn`)
- [ ] 15.3 `destroy()` audit across all element types
- [ ] 15.4 `FinalizationRegistry` warning for un-destroyed Scenes
- [ ] 15.5 Unit tests (each error convention, debug warnings, destroy release)
- [ ] 15.6 Demo panel — stress test with create/destroy + debug toggle
- **Acceptance:** No error scenarios throw; debug mode warns; destroy leaves no DOM/RAF residue

---

### 🔴 Layer 16 — API Surface, Bundle & Documentation
- [ ] 16.1 `src/index.ts` barrel export (public API only)
- [ ] 16.2 Production bundle (`dist/arena-2d.js` minified + `dist/arena-2d.d.ts`)
- [ ] 16.3 Demo site polish (all panels reviewed, responsive, nav complete)
- [ ] 16.4 `README.md` (quick-start, link to demo + SPEC)
- [ ] 16.5 Final test sweep (all suites green, manual walkthrough)
- **Acceptance:** `import { Scene, Container, Text } from 'canvasui'` works; types correct; all tests pass; demo complete

---

## Known Issues

_(none yet)_

---

## Review Gate Legend

| Icon | Gate | Expected Review Time |
|---|---|---|
| 🟢 | **Light** — glance at tests + demo | ~2 min |
| 🟡 | **Standard** — review tests, check demo, spot-check code | ~10 min |
| 🔴 | **Deep** — review code structure, test edge cases, validate API | ~30 min |
