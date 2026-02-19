# Fantoccini

> *Fantoccini* — Italian for marionettes; puppets animated by strings.

A plan for the library-level primitives needed to support a future **motion-recording
application** where users puppeteer objects by streaming mouse/keyboard input into
animation channels across multiple recording passes.

The recording layer, input capture, UI chrome (arm/disarm buttons, transport bar, etc.)
are **application concerns** and out of scope. This document covers only the engine
features Arena2D must provide so that such an application can be built on top.

---

## 1. SampleBuffer — Dense Fixed-Rate Storage

### Problem

`Channel<T>` stores sparse keyframes in a sorted array. Inserting a sample every frame
(~16ms at 60fps) means `O(n)` splice-into-sorted-array on every write, and the
evaluation path (binary search) is overkill when samples are uniformly spaced. A
10-second recording at 60fps = 600 entries — manageable, but the insert path does a
full re-sort on every call to `addKeyframe`.

### Design

```
class SampleBuffer {
  readonly sampleRate: number;       // e.g. 60 (samples per second)
  readonly data: Float64Array;       // pre-allocated or growable
  length: number;                    // samples written so far

  push(value: number): void;         // O(1) append
  get(index: number): number;        // O(1) random access
  evaluate(time: number): number;    // index = floor(time * sampleRate), lerp neighbours
  get duration(): number;            // length / sampleRate
  slice(startTime, endTime): SampleBuffer;
  clear(): void;
}
```

- **Write path:** `push()` appends to a flat typed array. No sorting, no objects.
  If the buffer is full, grow by doubling (or use a chunked ring buffer).
- **Read path:** `evaluate(time)` computes `index = time * sampleRate`, reads
  `data[floor(index)]` and `data[ceil(index)]`, lerps by fractional part. O(1).
- **Memory:** `Float64Array` — 8 bytes per sample. 60fps * 60s * 8B = ~28KB per
  minute per channel. Negligible.

### Why not just add samples as keyframes?

Keyframes carry object overhead (`{ time, value, ease }`), require sorted insertion,
and trigger `_sortAndComputeDuration()` on every add. A typed array is orders of
magnitude more cache-friendly and avoids GC pressure during recording.

### Integration

`SampleBuffer` does **not** extend `Channel<T>`. It is a raw data container — the
recording application writes into it, and when done, the application converts it to a
`NumberChannel` (via simplification) or wraps it in a `SampleChannel` for playback.

---

## 2. SampleChannel — Channel Backed by a SampleBuffer

### Problem

After recording, the application needs to play back the raw samples through the
existing Clip → Animator → Registry pipeline. This requires a `Channel<number>` that
reads from a `SampleBuffer` instead of interpolating between sparse keyframes.

### Design

```
class SampleChannel extends Channel<number> {
  constructor(buffer: SampleBuffer);

  // Override evaluate() to use O(1) index lookup + lerp
  evaluate(time: number): number;

  // The interpolate() method from Channel<T> is unused — SampleChannel
  // bypasses the keyframe binary-search path entirely.
  protected interpolate(v1: number, v2: number, t: number): number;
}
```

- Plugs directly into `Clip.addChannel("x", sampleChannel)`.
- The existing `Animator` / `AnimationRegistry` pipeline works unchanged.
- Duration derived from `buffer.duration`.

---

## 3. Curve Simplification — Samples to Keyframes

### Problem

Raw recorded data is noisy and dense. The application needs to convert a `SampleBuffer`
into a sparse `NumberChannel` with a controllable quality/fidelity tradeoff. This is
analogous to "bounce to audio" in a DAW — bake the performance into clean keyframes.

### Design

```
function simplifySamples(
  buffer: SampleBuffer,
  tolerance: number,          // max allowed deviation in value units
): Keyframe<number>[];
```

**Algorithm:** Ramer-Douglas-Peucker (RDP) applied to the time-value polyline.

1. Treat each sample as a point `(time, value)`.
2. RDP recursively finds the point with maximum perpendicular distance from the
   line segment between endpoints.
3. If that distance exceeds `tolerance`, split and recurse. Otherwise, discard
   intermediate points.

**Tolerance as a quality dial:**
- `tolerance = 0` → keep every sample (lossless).
- `tolerance = 0.5` → allow ±0.5 unit deviation (e.g. half a pixel for position).
- `tolerance = 5` → aggressive reduction, smooth but lossy.

The application calls this when the user wants to "bake" a recording. The result is
a standard `Keyframe<number>[]` array that can be fed into `new NumberChannel(keyframes)`.

### Future consideration

RDP preserves corners well but produces linear segments. A more advanced pass could
fit cubic bezier segments to the simplified points, but RDP is the right starting
point — it's simple, fast, and well-understood.

---

## 4. Timeline Seek — Absolute Time Positioning

### Problem

The `Timeline` and `Animator` use delta-time accumulation. There is no way to say
"evaluate the entire animation state at t=3.5s". This is essential for:

- **Scrubbing:** dragging a playhead to preview any point in the animation.
- **Punch-in:** starting a recording pass at an arbitrary offset.
- **Non-linear editing:** jumping to loop points, markers, or specific frames.

### Design

```
class Timeline {
  // Existing
  time: number;
  update(dt: number): void;

  // New
  seek(time: number): void;
}
```

`seek(time)` sets the timeline's absolute position and forces all child Animators
to evaluate at the corresponding local time, **without** advancing by a delta.

This requires a corresponding change in `Animator`:

```
class Animator {
  // New
  seekTo(time: number): void;   // Set this.time = time, call _apply(time)
}
```

**Key constraint:** `seek()` must trigger the full restore → accumulate → flush
cycle for a single frame so that blended values resolve correctly. The simplest
approach is for `Timeline.seek()` to compute `dt = targetTime - this.time` and
call `update(dt)`, but this has edge cases with delay, looping, and yoyo. A
dedicated `seekTo()` on Animator that bypasses delta logic is cleaner.

### Scope

The application builds transport controls (play, pause, scrub bar) on top of
`timeline.seek()`. The library just needs to support the primitive.

---

## 5. Clip Composition — Merging and Layering Clips

### Problem

The puppeteering workflow produces one clip per recording pass. The user records X
movement, then Y movement, then rotation — each as a separate clip. The application
needs to merge these into a single composite clip, or layer them for playback.

### Design

```
class Clip {
  // Existing
  addChannel(property: string, channel: Channel<any>): void;

  // New
  static merge(clips: Clip[], name?: string): Clip;
}
```

`Clip.merge()` combines channels from multiple clips into one. If two clips both
have a channel for the same property, the later clip's channel wins (or optionally,
they could be mixed — but last-wins is the simple correct default for override mode).

This is a simple utility — it just collects all channels into a single Map. The
real blending is already handled by `AnimationRegistry` when multiple Animators
target the same property.

### Additionally: Clip.fromChannels()

A convenience factory for the recording use case:

```
static fromChannels(
  name: string,
  channels: Record<string, Channel<any>>,
): Clip;
```

---

## 6. Channel Utilities — Slice, Shift, Scale

### Problem

Editing recorded channels requires basic time-domain operations:

- **Slice:** extract a time range (trim start/end of a recording).
- **Shift:** offset all keyframes in time (move a clip later on the timeline).
- **Scale:** stretch or compress time (speed up / slow down).

These are needed for both `Channel<T>` (keyframe-based) and `SampleBuffer`.

### Design

For `Channel<T>`:

```
class Channel<T> {
  // New
  slice(startTime: number, endTime: number): Channel<T>;  // returns new channel
  shift(offset: number): void;       // mutates: adds offset to all keyframe times
  scale(factor: number): void;       // mutates: multiplies all keyframe times
}
```

For `SampleBuffer`:

```
class SampleBuffer {
  // slice() already listed above
  // shift and scale are implicit — the application adjusts the Animator's
  // delay and timeScale respectively.
}
```

---

## 7. Read Access to Channel Internals

### Problem

The recording application needs to inspect channel data for visualization (drawing
waveforms, curves in a timeline editor). Currently `_keyframes` is `protected` and
there is no public read API beyond `evaluate()`.

### Design

```
class Channel<T> {
  // New — read-only access
  get keyframes(): ReadonlyArray<Keyframe<T>>;
  get keyframeCount(): number;
}
```

For `SampleBuffer`:

```
class SampleBuffer {
  // data is already public (Float64Array), but add:
  toArray(): number[];                    // copy to plain array
  forEach(fn: (value: number, time: number, index: number) => void): void;
}
```

This gives the application enough to draw curve editors, waveform previews, and
data inspectors without coupling to internal structure.

---

## 8. PropertyTrack Generics in AnimationRegistry

### Problem

`PropertyTrack` in `AnimationRegistry` hard-codes `baseValue: number` and
`override: number | null` with `any` casts sprinkled throughout. This works but is
fragile and prevents proper additive blending for non-numeric types (e.g. additive
color blending, or additive `Vec2` operations if vector channels are added later).

### Design

Genericize `PropertyTrack` or switch to a discriminated approach:

```
interface PropertyTrack<T = unknown> {
  baseValue: T;
  override: T | null;
  additive: T | null;       // null instead of 0 for non-numeric
  dirty: boolean;
  blend?: (base: T, additive: T) => T;   // custom blend function
}
```

The `blend` function allows channel types to define how additive blending works
for their value type. Numbers add. Colors add per-component. Vectors add per-axis.
If no `blend` is provided, additive falls back to override behavior (current
behavior preserved).

### Scope

This is a quality/correctness improvement to the existing system. It removes the
`any` casts and makes the blend pipeline extensible without changing the
restore → accumulate → flush architecture.

---

## 9. Animator.evaluate() — Stateless Single-Frame Evaluation

### Problem

`Animator.update(dt)` is stateful — it advances internal time, handles looping,
delay, yoyo, and triggers lifecycle events. For scrubbing and preview, the
application needs to evaluate an Animator at an arbitrary time without side effects.

### Design

```
class Animator {
  // New
  evaluate(time: number): Record<string, unknown>;
}
```

Returns the sampled property values at the given time without modifying internal
state, triggering callbacks, or writing to the adapter. This is the read-only
counterpart to `_apply()`.

Internally it just calls `this.clip.sample(time)` — but having it on Animator
is semantically clearer and allows future per-animator transforms (timeScale
applied to the input time, etc.).

---

## Summary — Dependency Order

The features have a natural implementation order based on dependencies:

| #  | Feature                          | Depends On | Scope    |
|----|----------------------------------|------------|----------|
| 1  | `SampleBuffer`                   | —          | New file |
| 2  | `SampleChannel`                  | 1          | New file |
| 3  | `simplifySamples` (RDP)          | 1          | New file |
| 4  | Channel read access              | —          | Edit     |
| 5  | Channel slice / shift / scale    | 4          | Edit     |
| 6  | `Clip.merge` / `Clip.fromChannels` | —        | Edit     |
| 7  | `Timeline.seek` / `Animator.seekTo` | —       | Edit     |
| 8  | `Animator.evaluate`              | —          | Edit     |
| 9  | `PropertyTrack` generics         | —          | Edit     |

Features 1–3 form the **recording data pipeline** (write → store → simplify).
Features 4–6 form the **editing toolkit** (inspect → transform → compose).
Features 7–9 form the **playback upgrades** (seek → preview → blend correctly).

All three groups are independent and can be implemented in parallel.

---

## What This Enables

With these primitives, a recording application can:

1. **Arm a property** — application-level concept, no library support needed.
2. **Stream input into a SampleBuffer** — `buffer.push(value)` each frame.
3. **Preview during recording** — wrap buffer in `SampleChannel`, attach to
   `Animator`, play through existing pipeline.
4. **Multi-pass layering** — each pass produces a `Clip` with one channel.
   Use `Clip.merge()` or multiple `Animator` instances with additive blending
   to compose passes.
5. **Scrub and review** — `timeline.seek(t)` to preview any moment.
6. **Bake to keyframes** — `simplifySamples(buffer, tolerance)` converts raw
   data to a clean `NumberChannel` at the user's chosen quality level.
7. **Trim and arrange** — `channel.slice()`, `channel.shift()` for basic
   non-linear editing.
8. **Serialize** — keyframe arrays and sample buffers are plain data,
   trivially JSON-serializable.

The library stays focused on playback, blending, and data representation.
The application owns input capture, UI, and workflow orchestration.
