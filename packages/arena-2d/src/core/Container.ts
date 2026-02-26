/**
 * Container — Node with an ordered list of children.
 *
 * Extends Element to provide child management, scene propagation,
 * transform cascading, and cache-as-bitmap invalidation bubbling.
 *
 * SPEC: §2.3–2.4 (IContainer), §12.1 (error handling)
 */

import { Arena2D } from "../Arena2D";
import { resolveLayout } from "../layout/LayoutResolver";
import { DirtyFlags } from "./DirtyFlags";
import { Element, type IElement } from "./Element";
import type { IArena2DContext } from "../rendering/Arena2DContext";

// ── IContainer Interface ──

export interface IContainer extends IElement {
  readonly children: ReadonlyArray<IElement>;
  clipContent: boolean;

  addChild(child: IElement): void;
  addChildAt(child: IElement, index: number): void;
  removeChild(child: IElement): void;
  removeAllChildren(): void;
  sortChildren(): void;
  getChildByID(id: string): IElement | null;
}

// ── Container Class ──

export class Container extends Element implements IContainer {
  private _children: Element[] = [];
  clipContent = false;

  // Cache-as-bitmap state
  private _cacheCanvas: OffscreenCanvas | null = null;
  private _cacheCtx: OffscreenCanvasRenderingContext2D | null = null;
  private _cacheValid = false;
  private _cacheOffsetX = 0;
  private _cacheOffsetY = 0;
  private _cacheLogicalW = 0;
  private _cacheLogicalH = 0;

  get children(): ReadonlyArray<IElement> {
    return this._children;
  }

  // ── Child management ──

  /**
   * Add a child to the end of the child list.
   *
   * If the child already has a parent, it is silently removed from
   * the old parent first (SPEC §12.1: re-parenting).
   */
  addChild(child: IElement): void {
    this._addChildInternal(child as Element, this._children.length);
  }

  /**
   * Add a child at a specific index in the child list.
   */
  addChildAt(child: IElement, index: number): void {
    const clamped = Math.max(0, Math.min(index, this._children.length));
    this._addChildInternal(child as Element, clamped);
  }

  /**
   * Remove a child from this container.
   * No-op if the child is not in this container (SPEC §12.1).
   */
  removeChild(child: IElement): void {
    const idx = this._children.indexOf(child as Element);
    if (idx === -1) return;
    this._removeChildInternal(child as Element, idx);
  }

  /**
   * Remove all children from this container, in reverse order.
   */
  removeAllChildren(): void {
    for (let i = this._children.length - 1; i >= 0; i--) {
      this._removeChildInternal(this._children[i], i);
    }
  }

  /**
   * Stable sort children by zIndex.
   * Same-zIndex children maintain insertion order.
   */
  /**
   * Stable sort children by zIndex.
   * Uses uid as tie-breaker for deterministic order (creation order).
   */
  sortChildren(): void {
    this._children.sort((a, b) => {
      const zDiff = a.zIndex - b.zIndex;
      if (zDiff !== 0) return zDiff;
      // Tie-breaker: creation order (uid)
      return a.uid - b.uid;
    });
  }

  /**
   * Find the first child with the given ID. Returns null if not found.
   */
  getChildByID(id: string): IElement | null {
    for (const child of this._children) {
      if (child.id === id) return child;
    }
    return null;
  }

  /**
   * Hit-test self and children.
   * Checks children in reverse render order (top-most first).
   * If no child is hit, checks self.
   */
  override hitTest(globalX: number, globalY: number): IElement | null {
    if (!this.visible) return null;

    // 1. Check children (reverse order)
    for (let i = this._children.length - 1; i >= 0; i--) {
      const child = this._children[i];
      const hit = child.hitTest(globalX, globalY);
      if (hit) return hit;
    }

    // 2. Check self
    return super.hitTest(globalX, globalY);
  }

  // ── Internal helpers ──

  private _addChildInternal(child: Element, index: number): void {
    // Re-parenting: remove from old parent first
    if (child.parent && child.parent !== this) {
      (child.parent as Container).removeChild(child);
    } else if (child.parent === this) {
      // Already our child — just move position
      const oldIdx = this._children.indexOf(child);
      if (oldIdx !== -1) {
        this._children.splice(oldIdx, 1);
        // Adjust index if we removed before the target position
        const adjustedIndex = oldIdx < index ? index - 1 : index;
        this._children.splice(adjustedIndex, 0, child);
      }
      return;
    }

    // Add to our child list
    this._children.splice(index, 0, child);
    child.parent = this;

    // Lifecycle: onAdded
    child.onAdded(this);

    // Propagate layer reference recursively to descendants
    if (child instanceof Container) {
      this._propagateLayerRecursive(child);
    }

    // Propagate scene reference
    this._propagateScene(child, this.scene);

    // Mark layout as dirty
    this.invalidate(DirtyFlags.Layout);

    // Performance warning for many children without caching
    if (
      Arena2D.debug &&
      !this.cacheAsBitmap &&
      this._children.length > Arena2D.config.perfWarningChildThreshold
    ) {
      console.warn(
        `Arena2D Performance Hint: Container [${this.id}] has ${this._children.length} children but cacheAsBitmap is false. Consider enabling caching for complex static subtrees.`,
      );
    }
  }

  private _removeChildInternal(child: Element, index: number): void {
    this._children.splice(index, 1);

    // Clear scene
    this._propagateScene(child, null);

    // Lifecycle: onRemoved (called after removal but before clearing parent)
    child.onRemoved(this);

    child.parent = null;

    // Mark layout as dirty
    this.invalidate(DirtyFlags.Layout);
  }

  /**
   * Recursively propagate scene reference through the subtree.
   */
  private _propagateScene(child: Element, newScene: unknown): void {
    if (child.scene === newScene) return;
    const oldScene = child.scene;
    child.scene = newScene;
    child.onSceneChanged(newScene, oldScene);

    // Recurse into container children
    if (child instanceof Container) {
      for (const grandchild of child._children) {
        child._propagateScene(grandchild, newScene);
      }
    }
  }

  /**
   * Recursively propagate layer reference through the subtree.
   * This ensures that children added to a container *before* the container
   * is added to the scene still inherit the layer properly.
   */
  private _propagateLayerRecursive(container: Container): void {
    for (const child of container._children) {
      if (!child.layer && container.layer) {
        child.layer = container.layer;
        // Register with layer
        const layer = child.layer as { addElement?: (el: IElement) => void };
        if (layer.addElement) {
          layer.addElement(child);
        }
      }
      if (child instanceof Container) {
        this._propagateLayerRecursive(child as Container);
      }
    }
  }

  // ── Dirty system overrides ──

  /**
   * Override invalidate to:
   * 1. Cascade Transform flag to all descendants.
   * 2. Bubble Visual/Transform up to nearest cacheAsBitmap ancestor.
   */
  override invalidate(flag: DirtyFlags): void {
    super.invalidate(flag);

    // Cascade Transform to all descendants
    if (flag & DirtyFlags.Transform) {
      this._cascadeTransform();
    }

    // Bubble up to cacheAsBitmap ancestor
    if (flag & (DirtyFlags.Visual | DirtyFlags.Transform)) {
      this._cacheValid = false; // Invalidate own cache if we have one
      this._bubbleCacheInvalidation();
    }
  }

  /**
   * Recursively mark all descendants with Transform dirty.
   */
  private _cascadeTransform(): void {
    const scene = this.scene as any;
    const markDirty = scene?.interaction?.markSpatialDirty?.bind(scene.interaction);
    const invalidateHit = scene?.invalidateHitBuffer?.bind(scene);

    this._cascadeTransformInner(markDirty, invalidateHit);
  }

  private _cascadeTransformInner(
    markDirty: ((el: IElement) => void) | undefined,
    invalidateHit: (() => void) | undefined,
  ): void {
    for (const child of this._children) {
      // Set the flag on the child using Element's invalidate (not Container's
      // override, to avoid re-bubbling cache from every descendant).
      Element.prototype.invalidate.call(child, DirtyFlags.Transform);

      // Mark for spatial hash update if interactive
      if (child.interactive && markDirty) {
        markDirty(child);
        if (invalidateHit) invalidateHit();
      }

      // Recurse if child is a Container
      if (child instanceof Container) {
        child._cascadeTransformInner(markDirty, invalidateHit);
      }
    }
  }

  /**
   * Walk up the parent chain to find the nearest cacheAsBitmap ancestor
   * and mark it for re-render by setting its Visual flag.
   */
  private _bubbleCacheInvalidation(): void {
    let ancestor = this.parent;
    while (ancestor) {
      if (ancestor.cacheAsBitmap) {
        Element.prototype.invalidate.call(ancestor, DirtyFlags.Visual);
        return;
      }
      ancestor = ancestor.parent;
    }
  }

  // ── Frame loop override ──

  /**
   * Update this container and all children.
   */
  override update(dt: number): void {
    // Handle auto-sorting if Z-index changed
    if (this._dirtyFlags & DirtyFlags.Order) {
      this.sortChildren();
      this._dirtyFlags &= ~DirtyFlags.Order;
    }

    // Resolve layout if dirty (before transform, since layout sets x/y/width/height)
    if (this._dirtyFlags & DirtyFlags.Layout) {
      if (this.style.display !== "manual") {
        resolveLayout(this);
      }
      this._dirtyFlags &= ~DirtyFlags.Layout;
    }

    super.update(dt);
    for (const child of this._children) {
      if (child.visible) {
        child.update(dt);
      }
    }
  }

  /**
   * Render the container.
   * If cacheAsBitmap is true, this handles drawing the cache canvas.
   * Note: The actual rendering into the cache is orchestrated by the Scene.
   */
  override paint(ctx: IArena2DContext): void {
    if (this.cacheAsBitmap && this._cacheValid && this._cacheCanvas) {
      // Draw the cached bitmap
      // The cache is relative to our world position, so we draw it at (0,0)
      // because the Scene has already applied our world transform.
      // However, the cache might have an offset if the children's bounds
      // don't start at (0,0).
      ctx.drawImage(this._cacheCanvas, this._cacheOffsetX, this._cacheOffsetY, this._cacheLogicalW, this._cacheLogicalH);
    }
  }

  /**
   * @internal
   * Check if the cache is valid.
   */
  get isCacheValid(): boolean {
    return this.cacheAsBitmap && this._cacheValid && this._cacheCanvas !== null;
  }

  /**
   * @internal
   * Provide access to the cache context for the Scene to draw into.
   */
  _getCacheContext(width: number, height: number): OffscreenCanvasRenderingContext2D {
    if (!this._cacheCanvas || this._cacheCanvas.width !== width || this._cacheCanvas.height !== height) {
      this._cacheCanvas = new OffscreenCanvas(width, height);
      this._cacheCtx = this._cacheCanvas.getContext("2d");
      if (!this._cacheCtx) throw new Error("Failed to get OffscreenCanvas context");
    }
    this._cacheValid = true;
    return this._cacheCtx as OffscreenCanvasRenderingContext2D;
  }

  /**
   * @internal
   * Set the cache offset and mark as valid.
   */
  _setCacheResult(offsetX: number, offsetY: number, logicalW: number, logicalH: number): void {
    this._cacheOffsetX = offsetX;
    this._cacheOffsetY = offsetY;
    this._cacheLogicalW = logicalW;
    this._cacheLogicalH = logicalH;
    this._cacheValid = true;
  }

  // ── Disposal override ──

  /**
   * Recursively destroy all children, then destroy this container.
   * SPEC §12.2: destroy() on a container recursively destroys all children.
   */
  override destroy(): void {
    // Destroy children in reverse (avoids index shifting)
    for (let i = this._children.length - 1; i >= 0; i--) {
      this._children[i].destroy();
    }
    this._children.length = 0;
    super.destroy();
  }
}
