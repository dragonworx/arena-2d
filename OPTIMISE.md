# Bundle Size Optimisation Plan

Low-hanging-fruit pass to reduce bundle size through consolidation, deduplication,
and better use of inheritance. Every item is scoped to avoid regressions.

---

## 1. Geometry: Move `intersectsShape()` default into base class

**Priority: HIGH | ~120 lines saved across 8 files**

8 of 9 geometry subclasses implement an identical 32-point sampling
`intersectsShape()` that calls `this.containsPoint()`. These are:
Rectangle, Ellipse, Arc, Line, Polygon, BezierCurve, QuadraticCurve, Path.

**Circle is the exception** — it uses a direct distance-to-center check
(`dist <= this.radius + 1e-6`) instead of delegating to `containsPoint()`.
This is an intentional optimisation and must remain as an override.

Add a default implementation in `Geometry` base class and delete the 8 generic
copies. Circle keeps its override.

```ts
// Geometry.ts — default implementation
intersectsShape(shape: IGeometry): Array<{ x: number; y: number }> {
  const results: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 32; i++) {
    const pt = shape.pointAt(i / 32);
    if (this.containsPoint(pt.x, pt.y)) results.push(pt);
  }
  return results;
}
```

**Files to change:** `geometry/Geometry.ts` (add default), then remove from:
`Rectangle.ts`, `Ellipse.ts`, `Arc.ts`, `Line.ts`, `Polygon.ts`,
`BezierCurve.ts`, `QuadraticCurve.ts`, `Path.ts`

Circle.ts keeps its override (distance-based check).

---

## 2. Geometry: Move curve `containsPoint()` default into base class

**Priority: HIGH | ~12 lines saved across 3 files**

BezierCurve, QuadraticCurve, and Path all implement the same `containsPoint()`:

```ts
containsPoint(x: number, y: number): boolean {
  const closest = this.closestPointTo(x, y);
  return Math.abs(closest.x - x) < 1e-6 && Math.abs(closest.y - y) < 1e-6;
}
```

This can serve as the default `containsPoint()` in `Geometry` base class. Shapes
with actual area (Circle, Rectangle, etc.) already override it with their own
logic, so those are unaffected.

**Files to change:** `geometry/Geometry.ts` (add default), remove from
`BezierCurve.ts:216-219`, `QuadraticCurve.ts:229-232`, `Path.ts:245-248`

---

## 3. Geometry: Extract `lineSegmentIntersection()` to base class

**Priority: MEDIUM | ~35 lines saved across 3 files**

Rectangle, Polygon, and Line each contain their own implementation of the
standard line-segment intersection algorithm. **Verified: the core math is
100% identical** (same denominator, same t/u parametric calculation, same
`1e-10` tolerance, same bounds check). The only differences are wrapping:

- Rectangle: takes `{x,y}` object pairs, pushes to a results array
- Polygon: takes scalar numbers, returns `{x,y} | null`
- Line: inlined directly in `intersectsLine()`, returns an array

Extract the shared math into a single protected static method. Each class
retains its own `intersectsLine()` with its specific iteration/deduplication
logic, but delegates the per-segment math to the shared helper.

```ts
// Geometry.ts
protected static lineSegmentIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): { x: number; y: number } | null
```

**Files to change:** `geometry/Geometry.ts` (add), refactor usage in
`Rectangle.ts:127-151`, `Polygon.ts:178-196`, `Line.ts:106-127`

---

## 4. Geometry: Add scale helper to base class

**Priority: MEDIUM | ~20 lines saved across 8 files**

Eight geometry classes repeat `Math.sqrt(Math.abs(this.scaleX * this.scaleY))`
or similar in their `area`/`perimeter` getters.

Add to `Geometry`:

```ts
protected get uniformScale(): number {
  return Math.sqrt(Math.abs(this.scaleX * this.scaleY));
}
```

**Files to change:** `geometry/Geometry.ts` (add), simplify scale code in
`Circle.ts`, `Rectangle.ts`, `Ellipse.ts`, `Arc.ts`, `Polygon.ts`, `Line.ts`,
`BezierCurve.ts`, `QuadraticCurve.ts`

---

## 5. Elements: Introduce `ShapeElement` base class for fill/stroke/lineWidth

**Priority: HIGH | ~40 lines saved**

`Rect` and `Circle` duplicate identical private fields and getter/setter pairs
for `fill`, `stroke`, and `lineWidth` (including identical dirty-flag
invalidation). Create a `ShapeElement` class extending `Element` that owns these
properties, then have `Rect` and `Circle` extend it.

```
Element
  └─ ShapeElement  (fill, stroke, lineWidth)
       ├─ Rect
       └─ CircleElement
```

**Files to change:** Create `elements/ShapeElement.ts`, modify `Rect.ts` and
`Circle.ts` to extend it and remove the duplicated properties.

---

## 6. View.ts: Extract duplicated frustum culling logic

**Priority: HIGH | ~30 lines saved**

`_paintRecursive` and `_paintHitRecursive` in `View.ts` contain near-identical
frustum culling blocks (check clip container, check element bounds, call
`computeAABB` + `intersect`).

Extract into a private method:

```ts
private _shouldCull(element: IElement, container: IContainer | null, frustum: IRect): boolean
```

**Files to change:** `core/View.ts` — extract from lines ~570-587 and ~706-725

---

## 7. View.ts: Extract duplicated child sorting

**Priority: LOW | ~12 lines saved**

Three methods in `View.ts` sort children by zIndex with identical one-liners:

```ts
const sorted = Array.from(container.children).sort((a, b) => a.zIndex - b.zIndex);
```

Extract to a private `_sortedChildren(container)` helper.

**Files to change:** `core/View.ts:665`, `View.ts:781`, `View.ts:845`

---

## 8. View.ts: Extract setTransform helper

**Priority: MEDIUM | ~20 lines saved**

The `dpr * z * m[N]` transform pattern is repeated 4 times across paint methods.

Extract:

```ts
private _applyWorldTransform(ctx, matrix, dpr, zoom, panX, panY): void
```

**Files to change:** `core/View.ts:607-614`, `638-645`, `741-748`, `856-863`

---

## 9. Element.ts: Extract repeated debug validation

**Priority: MEDIUM | ~30 lines saved**

Every numeric property setter in `Element.ts` repeats:

```ts
if (Arena2D.debug && !Number.isFinite(value)) {
  console.warn(`Arena2D: [${this.id}] <prop> set to ${value}`);
}
const safeValue = Number.isFinite(value) ? value : this._<prop>;
```

This appears 12 times. Extract to:

```ts
private _safeFinite(prop: string, value: number, fallback: number): number
```

**Files to change:** `core/Element.ts` — refactor setters for x, y, width,
height, scaleX, scaleY, rotation, skewX, skewY, anchorX, anchorY, opacity

---

## 10. InteractionManager: Extract ancestor exclusion check

**Priority: LOW | ~18 lines saved**

The "walk up parent chain to check exclusion" loop is duplicated 3 times in
`hitTest` and `hitTestAABB`.

Extract to:

```ts
private _isDescendantOf(element: IElement, ancestor: IElement): boolean
```

**Files to change:** `interaction/InteractionManager.ts:576-588`, `609-617`,
`684-692`

---

## 11. TextInput: Extract duplicated `getCat()` helper

**Priority: LOW | ~8 lines saved**

The character-category function (space/word/punct) is defined identically in both
`_getWordBoundaryLeft` and `_getWordBoundaryRight`.

Move to a private class method `_getCat(ch: string)`.

**Files to change:** `elements/TextInput.ts:892-896`, `918-922`

---

## 12. Text alignment offset: Extract shared helper

**Priority: LOW | ~15 lines saved**

The text-alignment x-offset calculation appears 4 times across `Text.ts` and
`TextInput.ts`:

```ts
if (align === "center") x = (w - lineW) / 2;
else if (align === "right") x = w - lineW;
```

Pull into `Text` base class as `protected _alignOffsetX(...)`.

**Files to change:** `elements/Text.ts:208-213`,
`elements/TextInput.ts:298-302`, `1090-1095`, `1134-1139`

---

## 13. Rendering: Extract fill/stroke application helper

**Priority: LOW | ~20 lines saved**

`Arena2DContext` repeats the same fill/stroke conditional block 6+ times:

```ts
if (fill !== undefined) { ctx.fillStyle = fill; ctx.fill(); }
if (stroke !== undefined) { ctx.strokeStyle = stroke; ctx.stroke(); }
```

Extract to `private _applyFillStroke(fill?, stroke?)`.

**Files to change:** `rendering/Arena2DContext.ts` — methods `drawRect`,
`drawRoundedRect`, `drawCircle`, `drawEllipse`, `drawPolygon`, `drawPath`

---

## 14. SpatialHashGrid: Extract cell-bounds calculation

**Priority: LOW | ~6 lines saved**

The min/max cell coordinate calculation is duplicated between `insert()` and
`queryAABB()`.

Extract to `private _getCellBounds(x, y, w, h)`.

**Files to change:** `interaction/SpatialHashGrid.ts:72-75`, `144-147`

---

## 15. Barrel export consolidation

**Priority: LOW | ~12 lines saved**

The main `index.ts` individually re-exports all 13 geometry classes (lines 44-56)
which duplicates `geometry/index.ts`. Replace with:

```ts
export * from "./geometry";
```

**Files to change:** `src/index.ts`

---

## Summary

| # | Area | Technique | Lines saved | Risk |
|---|------|-----------|-------------|------|
| 1 | Geometry | Inheritance — base default method | ~120 | Low |
| 2 | Geometry | Inheritance — base default method | ~12 | Low |
| 3 | Geometry | Inheritance — base protected method | ~35 | Low |
| 4 | Geometry | Inheritance — base getter | ~20 | Low |
| 5 | Elements | Inheritance — new ShapeElement class | ~40 | Low |
| 6 | View | Extract private method | ~30 | Low |
| 7 | View | Extract private method | ~12 | Low |
| 8 | View | Extract private method | ~20 | Low |
| 9 | Element | Extract private method | ~30 | Low |
| 10 | Interaction | Extract private method | ~18 | Low |
| 11 | TextInput | Extract private method | ~8 | Low |
| 12 | Text | Inheritance — base protected method | ~15 | Low |
| 13 | Rendering | Extract private method | ~20 | Low |
| 14 | SpatialHash | Extract private method | ~6 | Low |
| 15 | Exports | Barrel consolidation | ~12 | None |
| | | **Total** | **~398** | |
