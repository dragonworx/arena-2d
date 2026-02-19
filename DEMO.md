# Layer 13 Demo Plan

> The current demo shows a solar system (looping orbit) and a pulsing box with timeline controls. This is a good start but leaves most animation features invisible. This document proposes a richer single-page demo that showcases every major capability.

---

## Current Coverage Gaps

| Feature | Currently Demoed? |
|---|---|
| Looping | Yes (orbit) |
| Multi-channel clips | Yes (pulse) |
| Easing functions | Partial (QuadIn/Out only) |
| Timeline timeScale | Yes (slider) |
| Timeline pause/resume | Yes (button) |
| **Yoyo mode** | No |
| **Delay** | No |
| **Animator timeScale** (per-animator) | Partially (moon 5x) |
| **onComplete callback** | No |
| **onLoop callback** | No |
| **onUpdate / progress** | No |
| **Reusable clips on multiple targets** | Partially (orbit clip reused) |
| **stop() vs cancel()** | No |
| **Nested timelines** | No |
| **Conflict resolution (registry)** | No |
| **StringChannel / BooleanChannel** | No |
| **Easing comparison** | No |
| **Multi-segment channels (3+ keyframes)** | Yes (pulse) |
| **Clip.sample() for debugging** | No |
| **attachTo / detach** | No |

---

## Proposed Demo Layout — Single Page

All demos fit on **one page** organized into visual sections. Each section is a self-contained canvas area (or shared canvas with labeled regions). The page scrolls vertically with the canvas at top and feature cards below.

### Section 1: Easing Gallery (Top Left Region)

**What it shows:** All easing functions side-by-side.

- 10 small circles arranged in a vertical column, each labeled with its easing name (Linear, QuadIn, QuadOut, QuadInOut, CubicIn, CubicOut, CubicInOut, BackIn, BackOut, ElasticOut).
- A "Play" button starts all circles animating simultaneously from left to right (x: 0 -> 300) with the same duration (2s) but each using its own easing.
- Uses **yoyo + loop** so they continuously bounce back and forth, making easing differences easy to compare.
- Each circle uses a different color for visual distinction.

**Features demonstrated:** All easing functions, yoyo mode, loop, visual comparison.

### Section 2: Staggered Delay (Top Right Region)

**What it shows:** Delay and stagger patterns.

- 8 rectangles stacked vertically.
- On button press, each rectangle animates from x=0 to x=250 with increasing delays (0s, 0.1s, 0.2s, ... 0.7s), creating a cascade/wave effect.
- Uses `BackOut` easing for a satisfying overshoot.
- An `onComplete` callback on the **last** animator triggers a status label: "Sequence complete!".

**Features demonstrated:** Delay, onComplete, stagger pattern, BackOut easing.

### Section 3: Solar System (Center — Keep Existing)

**What it shows:** Nested hierarchy, reusable clips, per-animator timeScale.

- Keep the existing solar system demo as-is (sun, earth orbit, moon orbit).
- **Enhancement:** Add a label showing the current `earthAnimator.time` and `moonAnimator.time` via `onUpdate`, proving the progress callback works.
- **Enhancement:** Add Mars with a different orbit speed to further demonstrate clip reuse.

**Features demonstrated:** Looping, clip reuse, ElementAdapter, per-animator timeScale, onUpdate callback.

### Section 4: Playback Controls (Below Solar System)

**What it shows:** stop() vs cancel() vs pause(), nested timelines.

- A single animated element (a colored square) bouncing left-right with yoyo+loop.
- **Buttons:**
  - **Pause / Resume** — pauses and resumes the animator. Element freezes in place.
  - **Stop** — calls `stop()`. Element resets to initial position (time 0 values applied).
  - **Cancel** — calls `cancel()`. Element freezes at current position, animator detaches.
  - **Play** — re-attaches and plays from the beginning.
- A **status label** shows: `isPlaying`, `paused`, `time`, and `progress` in real-time via `onUpdate`.

**Features demonstrated:** pause, stop vs cancel semantics, play, isPlaying state, progress tracking.

### Section 5: Nested Timelines (Below Playback Controls)

**What it shows:** Timeline as a child of another timeline, compounding timeScale.

- A parent timeline with timeScale slider (0.1x to 3x).
- A child sub-timeline with its own timeScale slider (0.1x to 3x).
- Two elements: one animated on the parent timeline, one on the child sub-timeline.
- Both animate the same clip (x oscillation with yoyo+loop).
- The child element's effective speed = parent.timeScale * child.timeScale — shown as a computed label.

**Features demonstrated:** Nested timelines, compounding time scales, timeline hierarchy.

### Section 6: Conflict Resolution (Bottom Region)

**What it shows:** AnimationRegistry cancelling older animations.

- A single large circle.
- 4 target position buttons ("Top-Left", "Top-Right", "Bottom-Left", "Bottom-Right").
- Clicking a button creates a new Animator targeting `x` and `y` to that position (duration: 1s, easing: CubicInOut).
- Clicking rapidly cancels the previous animation mid-flight — the circle smoothly redirects to the new target with no jitter.
- A log area shows messages like: "New animation started → cancelled previous" using `onComplete` (which won't fire on cancelled animators) to demonstrate that only the final animation completes.

**Features demonstrated:** AnimationRegistry, cancel() on conflict, smooth redirection, onComplete only on non-cancelled.

### Section 7: Multi-Channel & Channel Types (Info Card)

**What it shows:** All channel types in one animation.

- An element with a custom paint function displaying a label.
- Animated with a single Clip containing:
  - `NumberChannel` for x, y (position movement)
  - `NumberChannel` for scaleX, scaleY (grow/shrink)
  - `NumberChannel` for alpha (fade in/out)
  - `NumberChannel` for rotation (spin)
  - `BooleanChannel` for visible (toggles visibility at midpoint)
  - `StringChannel` for a custom label property (changes text at keyframe boundaries)
- Loop + yoyo to continuously demonstrate.
- A live readout panel shows all current property values sampled from the clip via `Clip.sample()`.

**Features demonstrated:** All channel types, multi-channel clips, Clip.sample(), BooleanChannel step behavior, StringChannel step behavior.

---

## Controls Bar (Persistent, Bottom of Canvas)

Shared across all sections:

- **Global Timeline timeScale** — slider (0x to 5x) controlling `scene.timeline.timeScale`.
- **Global Pause/Resume** — pauses the entire scene timeline.
- **Reset All** — stops all animators and resets to initial state.

---

## Implementation Notes

### Single Page Feasibility

All sections can fit on one demo page by:
1. Using a tall canvas (800-1000px) divided into labeled regions, OR
2. Using multiple smaller canvases (one per section), each with its own Scene.

**Recommendation:** Use a **single canvas/scene** with regions. This is more authentic to real usage and better demonstrates the timeline hierarchy (one scene timeline governing everything). Separate the visual regions using positioned Container elements with background labels.

### Layout Sketch

```
┌─────────────────────────────────────────────────────────┐
│  Easing Gallery              │  Staggered Delay         │
│  ○ Linear      ●─────────── │  ▬▬▬▬▬▬▬▬               │
│  ○ QuadIn      ●──────      │   ▬▬▬▬▬▬▬▬              │
│  ○ QuadOut        ───●      │    ▬▬▬▬▬▬▬▬             │
│  ○ CubicInOut    ──●──      │     ▬▬▬▬▬▬▬▬            │
│  ...                        │  [▶ Trigger Stagger]     │
├─────────────────────────────┼──────────────────────────│
│           Solar System (Existing + Enhanced)            │
│              ☀ ── 🌍 ── 🌑                              │
│                    🔴 Mars                              │
│         [time: 3.2s] [progress: 0.32]                  │
├─────────────────────────────────────────────────────────│
│  Playback Controls          │  Nested Timelines        │
│  ■ ←────→ (yoyo)           │  Parent: [===1.0x===]    │
│  [Pause][Stop][Cancel][Play]│  Child:  [===1.5x===]   │
│  Status: playing, t=1.23   │  Effective: 1.5x         │
├─────────────────────────────┴──────────────────────────│
│  Conflict Resolution              │  Multi-Channel     │
│       ● (circle)                  │  ■ rotating,       │
│  [TL] [TR] [BL] [BR]            │  scaling, fading   │
│  Log: cancelled prev → new       │  vis: true, "Hi"   │
└─────────────────────────────────────────────────────────┘
│  [══════ Global Speed: 1.0x ══════] [⏸ Pause] [↺ Reset] │
```

### What NOT to Demo (Future Tasks from TODO.md)

These features from the TODO are **not yet implemented** and should NOT be included:
- `element.animate()` convenience API (Task 5)
- `animateFrom()` (Task 9)
- `ColorChannel` (Task 8)
- Promise-based `await` chaining (Task 7)

The demo should only showcase what's currently built in the animation system.

---

## Summary

| Section | Primary Features |
|---|---|
| Easing Gallery | All 10 easing functions, yoyo, loop |
| Staggered Delay | delay, onComplete, stagger pattern |
| Solar System | Clip reuse, per-animator timeScale, onUpdate |
| Playback Controls | stop vs cancel vs pause, isPlaying, progress |
| Nested Timelines | Sub-timelines, compounding timeScale |
| Conflict Resolution | AnimationRegistry, cancel on conflict |
| Multi-Channel | NumberChannel, BooleanChannel, StringChannel, Clip.sample() |
| Controls Bar | Global timeline timeScale, global pause |
