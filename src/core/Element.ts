/**
 * Element — Base class for all CanvasUI elements.
 *
 * Extends EventEmitter and implements ITransform properties with dirty flag
 * management. Property setters call invalidate() to mark the element for
 * recalculation during the next update() pass.
 *
 * SPEC: §2.1–2.4 (partial — container/scene/layer wiring is deferred to Layer 4+)
 */

import { EventEmitter } from "../events/EventEmitter";
import { type IStyle, createDefaultStyle } from "../layout/Style";
import type { IRect } from "../math/aabb";
import {
  type MatrixArray,
  identity,
  invert,
  multiply,
  rotate,
  scale,
  skew,
  transformPoint,
  translate,
} from "../math/matrix";
import { DirtyFlags } from "./DirtyFlags";

// ── Helpers ──

let _nextId = 0;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ── IElement Interface ──

/**
 * Public interface for all elements in the scene graph.
 *
 * Scene and Layer references are stubbed as loose types here
 * because those classes don't exist yet (Layer 7). They will be
 * tightened in future layers.
 */
export interface IElement {
  readonly id: string;
  parent: IElement | null;
  // biome-ignore lint/suspicious/noExplicitAny: Scene type defined in Layer 7
  scene: any | null;
  // biome-ignore lint/suspicious/noExplicitAny: Layer type defined in Layer 7
  layer: any | null;

  // Transform
  localMatrix: MatrixArray;
  worldMatrix: MatrixArray;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  pivotX: number;
  pivotY: number;
  updateLocalMatrix(): void;

  // Size
  width: number;
  height: number;

  // Layout style
  readonly style: IStyle;
  updateStyle(changes: Partial<IStyle>): void;

  // Visual state
  visible: boolean;
  display: "visible" | "hidden";
  alpha: number;
  zIndex: number;
  blendMode: GlobalCompositeOperation;
  cacheAsBitmap: boolean;

  // Computed
  readonly effectiveAlpha: number;
  readonly dirtyFlags: DirtyFlags;

  // Local bounds (subclasses define actual content bounds)
  localBounds: IRect;

  // Interaction
  interactive: boolean;
  draggable: boolean;
  dragConstraint: "none" | "x" | "y";
  dragHitTestMode: "aabb" | "quad";
  focusable: boolean;
  cursor: string;
  containsPoint(localX: number, localY: number): boolean;
  hitTest(globalX: number, globalY: number): IElement | null;

  // Dirty system
  invalidate(flag: DirtyFlags): void;

  // Lifecycle (called by Container, not the user)
  onAdded(parent: IElement): void;
  onRemoved(parent: IElement): void;
  // biome-ignore lint/suspicious/noExplicitAny: Scene type defined in Layer 7
  onSceneChanged(newScene: any | null, oldScene?: any | null): void;

  // Frame loop
  update(dt: number): void;
  // biome-ignore lint/suspicious/noExplicitAny: CanvasUIContext type defined in Layer 6
  paint(ctx: any): void;

  // Disposal
  destroy(): void;
}

// ── Element Class ──

export class Element extends EventEmitter implements IElement {
  readonly id: string;
  parent: IElement | null = null;
  scene: unknown = null;
  layer: unknown = null;

  // ── Dimensions ──
  private _width = 0;
  private _height = 0;

  // ── Layout style ──
  readonly style: IStyle = createDefaultStyle();

  // ── Local bounds ──
  localBounds: IRect = { x: 0, y: 0, width: 0, height: 0 };

  // ── Transform ──
  localMatrix: MatrixArray = identity();
  worldMatrix: MatrixArray = identity();

  private _x = 0;
  private _y = 0;
  private _rotation = 0;
  private _scaleX = 1;
  private _scaleY = 1;
  private _skewX = 0;
  private _skewY = 0;
  private _pivotX = 0;
  private _pivotY = 0;

  // ── Visual state ──
  private _visible = true;
  private _display: "visible" | "hidden" = "visible";
  private _alpha = 1;
  private _zIndex = 0;
  private _blendMode: GlobalCompositeOperation = "source-over";
  private _cacheAsBitmap = false;

  // ── Interaction ──
  interactive = true;
  draggable = false;
  dragConstraint: "none" | "x" | "y" = "none";
  focusable = false;
  customHitTest?: (x: number, y: number) => boolean;
  dragHitTestMode: "aabb" | "quad" = "aabb";
  cursor = "default";

  // ── Dirty system ──
  protected _dirtyFlags: DirtyFlags = DirtyFlags.All;

  // ── Constructor ──

  // Unique numeric ID for deterministic sorting
  readonly uid: number;

  constructor(id?: string) {
    super();
    this.uid = ++_nextId;
    this.id = id ?? `el_${this.uid}`;
  }

  // ── Interaction ──

  /**
   * Checks if a point in local coordinates is within this element's bounds.
   * Default implementation checks the axis-aligned bounding box (0,0) -> (width,height).
   */
  containsPoint(localX: number, localY: number): boolean {
    return (
      localX >= 0 &&
      localX <= this.width &&
      localY >= 0 &&
      localY <= this.height
    );
  }

  /**
   * Tests if the given global coordinates hit this element.
   * Transforms global (x,y) to local space and checks containsPoint.
   */
  hitTest(globalX: number, globalY: number): IElement | null {
    if (!this.visible) return null; // Invisible elements are not interactive

    // Invert world matrix to transform point to local space
    const inv = invert(this.worldMatrix);
    if (!inv) return null; // Singular matrix (e.g. scale 0)

    const local = transformPoint(inv, globalX, globalY);

    if (this.containsPoint(local.x, local.y)) {
      return this;
    }

    return null;
  }

  // ── Transform getters / setters ──
  // Each setter checks for change and calls invalidate(Transform).

  get x(): number {
    return this._x;
  }
  set x(value: number) {
    if (this._x !== value) {
      this._x = value;
      this.invalidate(DirtyFlags.Transform);
    }
  }

  get y(): number {
    return this._y;
  }
  set y(value: number) {
    if (this._y !== value) {
      this._y = value;
      this.invalidate(DirtyFlags.Transform);
    }
  }

  get rotation(): number {
    return this._rotation;
  }
  set rotation(value: number) {
    if (this._rotation !== value) {
      this._rotation = value;
      this.invalidate(DirtyFlags.Transform);
    }
  }

  get scaleX(): number {
    return this._scaleX;
  }
  set scaleX(value: number) {
    if (this._scaleX !== value) {
      this._scaleX = value;
      this.invalidate(DirtyFlags.Transform);
    }
  }

  get scaleY(): number {
    return this._scaleY;
  }
  set scaleY(value: number) {
    if (this._scaleY !== value) {
      this._scaleY = value;
      this.invalidate(DirtyFlags.Transform);
    }
  }

  get skewX(): number {
    return this._skewX;
  }
  set skewX(value: number) {
    if (this._skewX !== value) {
      this._skewX = value;
      this.invalidate(DirtyFlags.Transform);
    }
  }

  get skewY(): number {
    return this._skewY;
  }
  set skewY(value: number) {
    if (this._skewY !== value) {
      this._skewY = value;
      this.invalidate(DirtyFlags.Transform);
    }
  }

  get pivotX(): number {
    return this._pivotX;
  }
  set pivotX(value: number) {
    if (this._pivotX !== value) {
      this._pivotX = value;
      this.invalidate(DirtyFlags.Transform);
    }
  }

  get pivotY(): number {
    return this._pivotY;
  }
  set pivotY(value: number) {
    if (this._pivotY !== value) {
      this._pivotY = value;
      this.invalidate(DirtyFlags.Transform);
    }
  }

  // ── Dimension getters / setters ──

  get width(): number {
    return this._width;
  }
  set width(value: number) {
    if (this._width !== value) {
      this._width = value;
      this.invalidate(DirtyFlags.Visual);
      this.localBounds.width = value; // Sync localBounds
    }
  }

  get height(): number {
    return this._height;
  }
  set height(value: number) {
    if (this._height !== value) {
      this._height = value;
      this.invalidate(DirtyFlags.Visual);
      this.localBounds.height = value; // Sync localBounds
    }
  }

  // ── Style update ──

  /**
   * Merge partial style changes and trigger layout invalidation.
   */
  updateStyle(changes: Partial<IStyle>): void {
    Object.assign(this.style, changes);
    this.invalidate(DirtyFlags.Layout);
  }

  // ── Visual getters / setters ──
  // Each setter checks for change and calls invalidate(Visual).

  get visible(): boolean {
    return this._visible;
  }
  set visible(value: boolean) {
    if (this._visible !== value) {
      this._visible = value;
      this.invalidate(DirtyFlags.Visual);
      // Toggling visibility changes layout presence -> invalidate parent layout
      if (this.parent) {
        this.parent.invalidate(DirtyFlags.Layout);
      }
    }
  }

  get display(): "visible" | "hidden" {
    return this._display;
  }
  set display(value: "visible" | "hidden") {
    if (this._display !== value) {
      this._display = value;
      this.invalidate(DirtyFlags.Visual);
      // Changing display 'hidden' <-> 'visible' DOES NOT affect layout.
    }
  }

  get alpha(): number {
    return this._alpha;
  }
  set alpha(value: number) {
    const clamped = clamp(value, 0, 1);
    if (this._alpha !== clamped) {
      this._alpha = clamped;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get zIndex(): number {
    return this._zIndex;
  }
  set zIndex(value: number) {
    if (this._zIndex !== value) {
      this._zIndex = value;
      // Changing zIndex affects sort order, which is a property of the PARENT container.
      // So we must invalidate the parent's Order flag.
      if (this.parent) {
        this.parent.invalidate(DirtyFlags.Order);
      }
      // It also affects visual stacking, but if we re-sort, the paint order changes.
      // We don't necessarily need to repaint self, but parent might need partial repaint?
      // In validated systems, Visual is usually enough. But here, Order is key.
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get blendMode(): GlobalCompositeOperation {
    return this._blendMode;
  }
  set blendMode(value: GlobalCompositeOperation) {
    if (this._blendMode !== value) {
      this._blendMode = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get cacheAsBitmap(): boolean {
    return this._cacheAsBitmap;
  }
  set cacheAsBitmap(value: boolean) {
    if (this._cacheAsBitmap !== value) {
      this._cacheAsBitmap = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  // ── Alpha chain ──

  /**
   * Effective alpha considering parent hierarchy.
   * effectiveAlpha = parent.effectiveAlpha × this.alpha
   */
  get effectiveAlpha(): number {
    const parentAlpha =
      this.parent && "effectiveAlpha" in this.parent
        ? (this.parent as IElement).effectiveAlpha
        : 1;
    return parentAlpha * this._alpha;
  }

  // ── Dirty system ──

  get dirtyFlags(): DirtyFlags {
    return this._dirtyFlags;
  }

  /**
   * Mark the element as needing recalculation.
   * Multiple calls within a frame are coalesced via bitwise OR.
   */
  invalidate(flag: DirtyFlags): void {
    this._dirtyFlags |= flag;
  }

  // ── Transform computation ──

  /**
   * Recompute the local matrix from current property values.
   *
   * Composition: T(x, y) × R(rotation) × Sk(skewX, skewY) × S(scaleX, scaleY) × T(-pivotX, -pivotY)
   */
  updateLocalMatrix(): void {
    const t1 = translate(this._x, this._y);
    const r = rotate(this._rotation);
    const sk = skew(this._skewX, this._skewY);
    const s = scale(this._scaleX, this._scaleY);
    const t2 = translate(-this._pivotX, -this._pivotY);

    this.localMatrix = multiply(multiply(multiply(multiply(t1, r), sk), s), t2);
  }

  // ── Frame loop ──

  /**
   * Called once per tick. Resolves dirty flags.
   *
   * If Transform is dirty, recomputes localMatrix and worldMatrix.
   */
  update(_dt: number): void {
    if (this._dirtyFlags & DirtyFlags.Transform) {
      this.updateLocalMatrix();

      // Compute worldMatrix = parent.worldMatrix × localMatrix
      if (this.parent && "worldMatrix" in this.parent) {
        this.worldMatrix = multiply(
          (this.parent as IElement).worldMatrix,
          this.localMatrix,
        );
      } else {
        // Root element or no parent — worldMatrix = localMatrix
        // Copy into a new Float32Array so they are independent
        this.worldMatrix = new Float32Array(this.localMatrix);
      }

      // Clear transform flag
      this._dirtyFlags &= ~DirtyFlags.Transform;
    }
  }

  /**
   * Called once per render. Draw self.
   * Subclasses override this to draw their content.
   */
  paint(_ctx: unknown): void {
    // Base element has no visual representation.
  }

  // ── Lifecycle hooks ──
  // These are called by Container (Layer 4).

  onAdded(_parent: IElement): void {
    // Inherit layer from parent if not explicitly set
    if (!this.layer && _parent.layer) {
      this.layer = _parent.layer;
      // Register with layer
      const layer = this.layer as { addElement?: (el: IElement) => void };
      if (layer.addElement) {
        layer.addElement(this);
      }
    }
  }

  onRemoved(_parent: IElement): void {
    // Unregister from layer
    if (this.layer) {
      const layer = this.layer as { removeElement?: (el: IElement) => void };
      if (layer.removeElement) {
        layer.removeElement(this);
      }
    }
  }

  onSceneChanged(newScene: unknown, oldScene?: unknown): void {
    // Unregister from old scene
    if (oldScene) {
      const old = oldScene as { unregisterElement?: (el: IElement) => void };
      if (old.unregisterElement) {
        old.unregisterElement(this);
      }
    }

    // Register with new scene
    if (newScene) {
      const scene = newScene as { registerElement?: (el: IElement) => void };
      if (scene.registerElement) {
        scene.registerElement(this);
      }
    }
  }

  // ── Disposal ──

  /**
   * Release all resources.
   * Clears dirty flags, removes all event listeners, and detaches from parent.
   */
  destroy(): void {
    this._dirtyFlags = DirtyFlags.None;
    this.removeAllListeners();
    this.parent = null;
    this.scene = null;
    this.layer = null;
  }
}
