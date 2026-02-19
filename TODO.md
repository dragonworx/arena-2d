# Layer 13 Animation System — Improvement Plan

> This document details the additions needed to bring the animation system to world-class quality. Each task builds on the previous. The current Clip/Channel/Animator/Timeline/Adapter architecture is the foundation — these tasks extend it.

---

## Task 1: Auto-Detach on Completion

**Priority:** Critical (blocks Task 3 & 5)
**Files:** `src/animation/Animator.ts`, `src/animation/Timeline.ts`

### Problem
When an Animator finishes playing (non-looping), it sets `_isPlaying = false` but remains in the Timeline's `_children` array. Dead animators accumulate as garbage, wasting iteration cycles every frame.

### Requirements

1. **Animator auto-detaches from its Timeline when it finishes.** In `Animator.update()`, after the `finished` block (line ~111–118), call `this.detach()` to remove itself from the timeline.

2. **`Timeline.clear()` must properly detach children.** Currently `clear()` just resets the array (`this._children = []`). It must iterate children and null out their `_timeline` reference first. Add a method or iterate before clearing:
   ```
   for each child in _children:
     if child has a _timeline ref, null it
   ```
   Since `_children` is `ITickable[]` and not all tickables are Animators, use a duck-type check or introduce an optional `onRemovedFromTimeline()` hook on `ITickable`.

   **Recommended approach:** Add an optional `detach?(): void` method to `ITickable`. In `Timeline.clear()`, call `child.detach?.()` wouldn't work because detach calls `timeline.remove()` which would mutate during iteration. Instead, simply clear `_timeline` on Animators directly. The simplest approach: in `Timeline.clear()`, just set `this._children = []`. Animators holding a stale `_timeline` reference will fail gracefully in `detach()` since `indexOf` returns -1. This is acceptable. **No change needed to `Timeline.clear()`** — just document that clearing a timeline orphans animator references.

### Implementation

In `Animator.update()`, replace the `finished` block:

```typescript
if (finished) {
  this._isPlaying = false;
  if (this.onComplete) this.onComplete();
  this.detach(); // <-- ADD THIS
}
```

### Tests
- Create an Animator on a Timeline, play it, advance past duration. Verify the Timeline's children array no longer contains the animator.
- Verify `onComplete` still fires before detach.

---

## Task 2: `cancel()` Method (Freeze in Place)

**Priority:** Critical (needed for conflict resolution in Task 3)
**Files:** `src/animation/Animator.ts`

### Problem
The current `stop()` method resets time to 0 and applies frame 0 values. There is no way to "cancel" an animation and freeze at the current value. The PRD §13.5 requires `cancel()`.

### Requirements

1. **Add `cancel(): void`** to `Animator`. It must:
   - Set `_isPlaying = false`
   - Do NOT reset `time` or apply any values (freeze at current state)
   - Call `this.detach()` to remove from timeline
   - Fire no callbacks (no `onComplete`)

2. **Rename the existing `stop()` semantics clearly.** Keep `stop()` as-is (resets to time 0 and applies). `cancel()` is the new "freeze and remove" method.

### Implementation

Add to `Animator`:
```typescript
cancel(): void {
  this._isPlaying = false;
  this.paused = false;
  this.detach();
}
```

### Tests
- Play an animator, advance to midpoint, call `cancel()`. Verify `isPlaying` is false, the element retains the midpoint value, and the animator is detached from the timeline.
- Verify `onComplete` is NOT called on cancel.

---

## Task 3: Conflict Resolution Registry

**Priority:** Critical (PRD §13.3)
**Files:** New file `src/animation/AnimationRegistry.ts`, modifications to `Animator.ts`

### Problem
PRD §13.3: "Same-property conflict: newest animation cancels older one for that property." Currently if two Animators target the same property on the same element, both run and last-write-wins with no cancellation. This causes jittering and wasted work.

### Requirements

1. **Create `src/animation/AnimationRegistry.ts`** — a singleton-style registry (one per Scene timeline, or a static global) that tracks which Animator currently "owns" each `(adapter, property)` pair.

2. **Data structure:** `Map<IAdapter, Map<string, Animator>>` — for each adapter, maps property names to the currently-owning Animator.

3. **On play:** When an Animator starts playing (in `play()` or when first attached), it must register all its clip's channel property names with the registry. For each property, if an existing Animator already owns it on the same adapter:
   - Call `cancel()` on the old animator for **only** the conflicting properties. If the old animator has no remaining non-conflicted properties, cancel it entirely. **Simplification:** Since cancelling per-property is complex, cancel the entire old animator if ANY property conflicts. This matches common animation library behavior (GSAP, Framer Motion).

4. **On completion/cancel/stop:** The Animator must unregister all its properties from the registry.

5. **Registry should be passed into Animator** (not global state). The `AnimatorOptions` interface gains an optional `registry?: AnimationRegistry` field. The `element.animate()` convenience API (Task 5) will auto-pass the scene's registry.

### Implementation

**`src/animation/AnimationRegistry.ts`:**
```typescript
export class AnimationRegistry {
  // adapter -> (property -> animator)
  private _map: Map<IAdapter, Map<string, Animator>> = new Map();

  register(adapter: IAdapter, properties: string[], animator: Animator): void {
    let adapterMap = this._map.get(adapter);
    if (!adapterMap) {
      adapterMap = new Map();
      this._map.set(adapter, adapterMap);
    }
    for (const prop of properties) {
      const existing = adapterMap.get(prop);
      if (existing && existing !== animator) {
        existing.cancel(); // Cancel entire old animator
      }
      adapterMap.set(prop, animator);
    }
  }

  unregister(adapter: IAdapter, properties: string[], animator: Animator): void {
    const adapterMap = this._map.get(adapter);
    if (!adapterMap) return;
    for (const prop of properties) {
      if (adapterMap.get(prop) === animator) {
        adapterMap.delete(prop);
      }
    }
    if (adapterMap.size === 0) {
      this._map.delete(adapter);
    }
  }

  clear(): void {
    this._map.clear();
  }
}
```

**Modifications to `Animator`:**
- Add `private _registry: AnimationRegistry | null = null` field.
- Accept `registry` in `AnimatorOptions`.
- In `play()`: call `this._registry?.register(this.adapter, [...this.clip.channels.keys()], this)`.
- In `cancel()`, `stop()`, and the `finished` block of `update()`: call `this._registry?.unregister(this.adapter, [...this.clip.channels.keys()], this)`.
- Guard against re-entrant cancel (if cancel is called from within register's conflict resolution): add an `_isCancelled` flag, check it at the top of `cancel()`.

**Wire into Scene:** Add `readonly animationRegistry: AnimationRegistry` to `Scene`. Create it in the constructor. Pass it to the convenience `element.animate()` API in Task 5. Clear it in `Scene.destroy()`.

### Tests
- Create two Animators targeting `x` on the same element/adapter with the same registry. Play both. Verify the first is cancelled when the second starts.
- Create two Animators targeting different properties (`x` vs `alpha`). Play both. Verify neither is cancelled.
- Create Animator A targeting `x` and `y`, Animator B targeting only `x`. Play A, then B. Verify A is fully cancelled (because it had a conflict on `x`).
- Verify unregister happens on completion: play an animator, let it finish, play a new one on the same property — no cancellation of a dead animator.

---

## Task 4: Delay Support

**Priority:** High
**Files:** `src/animation/Animator.ts`

### Problem
Standard animation APIs support a `delay` parameter — seconds to wait before the animation begins. The current system has no delay support.

### Requirements

1. **Add `delay: number` (default `0`) to `AnimatorOptions` and as a public field on `Animator`.**

2. **Delay behavior:** When `play()` is called, the animator enters a "waiting" state. During `update()`, the delay is counted down before the animation time begins advancing. While in the delay period:
   - `isPlaying` returns `true` (the animation has been started, it's just delayed)
   - The animator does NOT apply any values to the target
   - Progress callbacks are not fired

3. **Implementation approach:** Add a `_delayRemaining: number` field. In `play()`, set `_delayRemaining = this.delay`. In `update()`, if `_delayRemaining > 0`, subtract `dt * timeScale` from it. If it goes to 0 or below, apply the leftover time as the first real delta. On subsequent calls, `_delayRemaining` is 0 so normal playback proceeds.

4. **Cancel/stop during delay:** Both should work — cancel freezes (no values applied yet), stop resets.

### Implementation

Add to `AnimatorOptions`:
```typescript
delay?: number;
```

Add to `Animator` class:
```typescript
delay = 0;
private _delayRemaining = 0;
```

In constructor, read `options.delay`.

In `play()`:
```typescript
play(): void {
  this._isPlaying = true;
  this.paused = false;
  this._delayRemaining = this.delay;
}
```

In `update()`, before existing logic:
```typescript
if (this._delayRemaining > 0) {
  this._delayRemaining -= dt * this.timeScale;
  if (this._delayRemaining > 0) return; // Still waiting
  // Delay just finished — use leftover as first delta
  dt = -this._delayRemaining / this.timeScale; // Convert remaining back to unscaled
  this._delayRemaining = 0;
}
```

### Tests
- Create an animator with `delay: 0.5`, duration 1s. Play and update by 0.3s — element should not have changed. Update by 0.3s (total 0.6s) — element should be at 0.1s progress (0.6 - 0.5 delay = 0.1s into animation).
- Cancel during delay — element unchanged, animator detached.
- Delay with `timeScale: 2` — delay of 0.5s should complete in 0.25s wall time.

---

## Task 5: `element.animate()` Convenience API

**Priority:** Critical (PRD §13.1)
**Files:** `src/core/Element.ts`, `src/animation/Animator.ts`, `src/animation/Channel.ts`

### Problem
PRD §13.1 requires `element.animate(props, options)` returning an `IAnimation` handle. Currently creating an animation requires ~15 lines: manually creating a Clip, Channels, Adapter, Animator, and attaching to a Timeline. The spec envisions a one-liner.

### Requirements

1. **Add `animate()` method to `Element`:**
   ```typescript
   animate(
     properties: Record<string, number>,
     options: AnimateOptions
   ): IAnimation
   ```

2. **`AnimateOptions` interface:**
   ```typescript
   interface AnimateOptions {
     duration: number;          // In seconds
     easing?: EasingFunction;   // Applied to all channels. Default: Easing.Linear
     delay?: number;            // Default: 0
     loop?: boolean;            // Default: false
     yoyo?: boolean;            // Default: false
     onComplete?: () => void;
     onUpdate?: (progress: number) => void;
   }
   ```

3. **`IAnimation` interface** (the returned handle):
   ```typescript
   interface IAnimation {
     readonly isPlaying: boolean;
     readonly progress: number;   // 0–1
     cancel(): void;
     pause(): void;
     resume(): void;
     then(onFulfilled: () => void): IAnimation;  // Promise-like chaining (Task 7)
   }
   ```

4. **Implementation:** `element.animate()` does the following internally:
   - Creates a new `Clip` with a `NumberChannel` per property. Each channel has two keyframes: `{ time: 0, value: currentValue }` and `{ time: duration, value: targetValue, ease: easing }`.
   - Reads current values from the element (e.g., `this.x` for property `"x"`).
   - Creates an `ElementAdapter` for `this`.
   - Creates an `Animator` with the clip, adapter, and options (including `delay`, `loop`, `yoyo`, callbacks).
   - Passes the scene's `AnimationRegistry` if the element is attached to a scene.
   - Attaches the Animator to the scene's timeline (`this.scene.timeline`).
   - Calls `animator.play()`.
   - Returns the animator (which implements `IAnimation`). **Make `Animator` implement `IAnimation`** by adding `resume()` (alias for `play()` when paused) and a `progress` getter.

5. **Error handling:** If `element.scene` is null (not attached to a scene), throw an error: `"Cannot animate an element that is not attached to a scene"`.

6. **Track active animators on the element.** Add a `private _activeAnimators: Set<Animator>` to `Element`. When `animate()` creates an animator, add it. When the animator completes, is cancelled, or is stopped, remove it. This set is needed for Task 6 (destroy cleanup).

### Implementation Details

**`Animator` changes to implement `IAnimation`:**
- Add `resume(): void` — same as `play()` but only if `paused` is true (sets `paused = false`).
- Add `get progress(): number` — returns `this.time / this._duration`, clamped to [0, 1].
- Rename `isPlaying` getter is fine as-is.
- Add `then()` stub that stores a callback (full implementation in Task 7).

**`Element.animate()` method:**

```typescript
animate(properties: Record<string, number>, options: AnimateOptions): IAnimation {
  if (!this.scene) {
    throw new Error("Cannot animate an element that is not attached to a scene");
  }

  const clip = new Clip("animate");
  for (const [prop, targetValue] of Object.entries(properties)) {
    const currentValue = (this as any)[prop] as number;
    const channel = new NumberChannel();
    channel.addKeyframe(0, currentValue);
    channel.addKeyframe(options.duration, targetValue, options.easing);
    clip.addChannel(prop, channel);
  }

  const adapter = new ElementAdapter(this);
  const animator = new Animator(clip, adapter, {
    delay: options.delay,
    loop: options.loop,
    yoyo: options.yoyo,
    onComplete: () => {
      this._activeAnimators.delete(animator);
      options.onComplete?.();
    },
    onUpdate: options.onUpdate,
    registry: this.scene.animationRegistry,
  });

  this._activeAnimators.add(animator);
  animator.attachTo(this.scene.timeline);
  animator.play();

  return animator;
}
```

### Exports

Add to `src/index.ts`:
```typescript
export type { IAnimation, AnimateOptions } from "./animation/Animator";
```

Also export `IAdapter`:
```typescript
export type { IAdapter } from "./animation/adapter/IAdapter";
```

### Tests
- `element.animate({ x: 100 }, { duration: 1 })` — verify element.x moves to 100 over 1 second.
- Verify returned `IAnimation.isPlaying` is true during animation, false after.
- Verify `IAnimation.cancel()` stops the animation and freezes value.
- Verify `IAnimation.pause()` / `resume()` works.
- Verify conflict: `element.animate({ x: 100 })` then `element.animate({ x: 200 })` — first is cancelled.
- Verify error thrown when element has no scene.

---

## Task 6: Destroy Integration

**Priority:** Critical (PRD §13.5)
**Files:** `src/core/Element.ts`, `src/core/Scene.ts`

### Problem
PRD §13.5: "Cancelled on `destroy()`." When an element is destroyed, its active animations must be cancelled. Currently `Element.destroy()` has no knowledge of animations.

### Requirements

1. **In `Element.destroy()`**, iterate `_activeAnimators` and call `cancel()` on each, then clear the set.

2. **In `Scene.destroy()`**, clear the `AnimationRegistry` and clear the timeline:
   ```typescript
   this.animationRegistry.clear();
   this.timeline.clear();
   ```
   Add these lines before stopping the ticker.

### Implementation

In `Element.destroy()` (at `src/core/Element.ts:549`), add before the existing cleanup:
```typescript
// Cancel all active animations
for (const animator of this._activeAnimators) {
  animator.cancel();
}
this._activeAnimators.clear();
```

In `Scene.destroy()` (at `src/core/Scene.ts:255`), add before `this.ticker.stop()`:
```typescript
this.animationRegistry.clear();
this.timeline.clear();
```

### Tests
- Create an element, animate it, destroy the element mid-animation. Verify the animator is cancelled and detached from the timeline.
- Destroy a scene with active animations. Verify no errors and timeline is empty.

---

## Task 7: Promise-Based Completion

**Priority:** High
**Files:** `src/animation/Animator.ts`

### Problem
Sequencing animations requires nested callbacks. A promise-based API enables `await element.animate(...)` for clean sequential animation code.

### Requirements

1. **`element.animate()` should return an object that is both `IAnimation` and `PromiseLike<void>`.**

2. **Implementation:** The Animator stores a `Promise<void>` internally, created in `play()`. The resolve function is called when `onComplete` fires. The `then` method delegates to this promise.

3. **Cancel should reject the promise** (or resolve it silently — **resolve silently** to avoid unhandled rejection warnings). Cancellation resolves the promise, it does not reject.

4. **Looping animations never resolve** (since they never complete). This is expected behavior.

### Implementation

Add to `Animator`:
```typescript
private _resolve: (() => void) | null = null;
private _promise: Promise<void> | null = null;

// PromiseLike implementation
then<TResult = void>(
  onfulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | null
): Promise<TResult> {
  if (!this._promise) {
    this._promise = new Promise<void>((resolve) => {
      this._resolve = resolve;
    });
  }
  return this._promise.then(onfulfilled);
}
```

In the `finished` block of `update()` and in `cancel()`, call `this._resolve?.()` and null it out.

In `play()`, create a fresh promise if one doesn't exist:
```typescript
if (!this._promise) {
  this._promise = new Promise<void>((resolve) => {
    this._resolve = resolve;
  });
}
```

### Tests
- `await element.animate({ x: 100 }, { duration: 1 })` — verify it resolves after the animation completes.
- Cancel mid-animation — verify the promise resolves (not rejects).
- Chain: `await el.animate({ x: 100 }, { duration: 0.5 }); await el.animate({ y: 200 }, { duration: 0.5 });` — verify sequential execution.

---

## Task 8: ColorChannel

**Priority:** High
**Files:** New file `src/animation/ColorChannel.ts`, modifications to `src/animation/Channel.ts` exports, `src/animation/adapter/ElementAdapter.ts`

### Problem
There is no way to animate colors. Elements have properties like `backgroundColor` or tint that are color strings. A `ColorChannel` is needed for component-wise interpolation.

### Requirements

1. **Create `src/animation/ColorChannel.ts`** extending `Channel<string>`.

2. **Supported input formats:** `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb(r, g, b)`, `rgba(r, g, b, a)`. All stored internally as `[r, g, b, a]` tuples (0–255 for rgb, 0–1 for alpha).

3. **Interpolation:** Component-wise linear interpolation in RGB space. Output as `rgba(r, g, b, a)` string.

4. **Color parsing utility:** Create a `parseColor(color: string): [number, number, number, number]` function. Also create `colorToString(rgba: [number, number, number, number]): string`.

5. **Override `interpolate()`:**
   ```typescript
   interpolate(v1: string, v2: string, t: number): string {
     const c1 = parseColor(v1);
     const c2 = parseColor(v2);
     return colorToString([
       c1[0] + (c2[0] - c1[0]) * t,
       c1[1] + (c2[1] - c1[1]) * t,
       c1[2] + (c2[2] - c1[2]) * t,
       c1[3] + (c2[3] - c1[3]) * t,
     ]);
   }
   ```

6. **Performance:** Cache parsed color values per keyframe to avoid re-parsing every frame. Override `addKeyframe()` to pre-parse, or store a parallel array of parsed RGBA tuples.

### Convenience Integration

Update `element.animate()` (from Task 5) to auto-detect color properties. When the target value is a string that looks like a color (starts with `#` or `rgb`), use `ColorChannel` instead of `NumberChannel`. Update the `properties` parameter type:
```typescript
animate(
  properties: Record<string, number | string>,
  options: AnimateOptions
): IAnimation
```

### Exports

Add to `src/index.ts`:
```typescript
export { ColorChannel } from "./animation/ColorChannel";
```

### Tests
- Interpolate `#000000` to `#ffffff` at t=0.5 → `rgba(128, 128, 128, 1)` (approximately).
- Interpolate `rgba(255, 0, 0, 1)` to `rgba(0, 0, 255, 0.5)` at t=0.5 → `rgba(128, 0, 128, 0.75)`.
- Parse `#f00` (shorthand) correctly as `[255, 0, 0, 1]`.
- Parse `#ff000080` (with alpha) correctly.
- Verify cached parsing: evaluate the same channel 1000 times, no re-parsing.

---

## Task 9: `animateFrom()` Convenience Method

**Priority:** Medium
**Files:** `src/core/Element.ts`

### Problem
Enter animations are extremely common: fade in from 0, slide in from off-screen. Currently you must know and specify the current value as the target. An `animateFrom()` method reverses this — you specify the starting values and it animates TO the current values.

### Requirements

1. **Add `animateFrom()` to `Element`:**
   ```typescript
   animateFrom(
     properties: Record<string, number | string>,
     options: AnimateOptions
   ): IAnimation
   ```

2. **Behavior:** For each property, read the current value, immediately set the element to the `from` value, then animate from `from` to the original current value.

3. **Implementation:** Swap the keyframe order compared to `animate()`:
   ```
   keyframe(0, fromValue)  →  keyframe(duration, currentValue)
   ```
   Then immediately apply the from values so the element "jumps" to the start state on the first frame.

### Tests
- `element.x = 100; element.animateFrom({ x: 0 }, { duration: 1 })` — element starts at 0, ends at 100.
- Verify the element visually starts at the "from" position on the first frame.

---

## Task 10: Expanded Test Coverage

**Priority:** High
**Files:** `tests/animation.test.ts`

### Problem
Current tests cover basic happy paths only. Many features and edge cases are untested.

### Requirements — Add Tests For

**Channels:**
- `StringChannel` — step behavior between two string values.
- Multi-segment channels — 3+ keyframes, verify correct segment selection.
- Edge: evaluate empty channel throws error.
- Edge: single keyframe — returns that value for any time.
- `addKeyframes()` bulk method.
- `ColorChannel` (from Task 8) — full interpolation suite.

**Easing:**
- Verify all easing functions: at t=0 return 0, at t=1 return 1.
- `BackIn` goes negative (overshoot), `BackOut` exceeds 1 temporarily.
- `ElasticOut` oscillates around 1.

**Timeline:**
- `remove()` — add two children, remove one, verify only the remaining child receives updates.
- `clear()` — add children, clear, verify none receive updates.
- Nested timelines — Timeline as child of Timeline, verify time scaling compounds.

**Animator:**
- `pause()` / `resume()` — pause mid-animation, verify time doesn't advance, resume and verify it continues.
- `stop()` — verify element resets to time-0 values.
- `timeScale` — verify 2x speed completes in half the wall time.
- `onLoop` callback — verify it fires on each loop iteration.
- `onUpdate` callback — verify it fires every frame with correct progress value.
- Zero-duration clip — should complete immediately.
- `attachTo()` / `detach()` — verify adding/removing from timeline.

**Conflict Resolution (Task 3):**
- Two animators on same property — newer cancels older.
- Two animators on different properties — both run.
- Animator finishes, new one on same property — no spurious cancellation.

**Delay (Task 4):**
- Animation doesn't start until delay elapses.
- Cancel during delay.

**`element.animate()` (Task 5):**
- Basic property animation.
- Error when no scene.
- Conflict resolution via convenience API.
- Returned `IAnimation` handle methods.

**Destroy Integration (Task 6):**
- Destroy element cancels active animations.
- Destroy scene clears registry and timeline.

**Promise (Task 7):**
- `await` resolves on completion.
- `await` resolves on cancel (no rejection).

---

## Task 11: Update Demo Panel

**Priority:** Medium
**Files:** `demo/panels/layer13.js`, `demo/panels/layer13.html`

### Problem
The demo should showcase the new convenience API, conflict resolution, color animation, and sequencing.

### Requirements

1. **Keep the existing Solar System demo** — it showcases the low-level Clip/Channel/Animator API well.

2. **Add a "Convenience API" section** demonstrating:
   - `element.animate({ x, y, alpha }, { duration, easing })` one-liner.
   - Click an element to trigger animation to a random position.
   - Show conflict resolution: rapidly clicking triggers new animations that cancel old ones.

3. **Add a "Color Animation" section** demonstrating:
   - A rectangle that cycles through colors using `ColorChannel`.
   - Color picker input that animates the element to the selected color.

4. **Add a "Sequencing" section** demonstrating:
   - `await`-based sequential animation: element moves right, then down, then fades out.
   - Button to trigger the sequence.

5. **Add a "Delay" demo:**
   - Staggered animation: multiple elements animate with increasing delays.

6. **Update controls:**
   - Add easing function dropdown that applies to the convenience API demos.
   - Keep the existing timeline timeScale slider and pause/resume button.

---

## Task 12: Export `IAdapter` Interface

**Priority:** Low (quick fix)
**Files:** `src/index.ts`

### Problem
`IAdapter` is not exported from the public API. Users who want to create custom adapters (animating plain objects, CSS properties, etc.) cannot implement the interface.

### Implementation

Add to the Layer 13 section of `src/index.ts`:
```typescript
export type { IAdapter } from "./animation/adapter/IAdapter";
```

---

## Execution Order Summary

| Order | Task | Depends On | Estimated Scope |
|-------|------|------------|-----------------|
| 1 | Auto-Detach on Completion | — | Small (5 lines) |
| 2 | `cancel()` Method | Task 1 | Small (10 lines) |
| 3 | Conflict Resolution Registry | Tasks 1, 2 | Medium (new file + modifications) |
| 4 | Delay Support | — | Small (15 lines) |
| 5 | `element.animate()` Convenience API | Tasks 1–4 | Large (new interfaces, Element changes) |
| 6 | Destroy Integration | Task 5 | Small (10 lines) |
| 7 | Promise-Based Completion | Task 5 | Medium (promise wiring) |
| 8 | ColorChannel | — | Medium (new file, parsing utils) |
| 9 | `animateFrom()` | Task 5 | Small (variant of animate) |
| 10 | Expanded Test Coverage | Tasks 1–9 | Large (comprehensive test suite) |
| 11 | Update Demo Panel | Tasks 1–9 | Medium (demo code) |
| 12 | Export `IAdapter` | — | Trivial (1 line) |
