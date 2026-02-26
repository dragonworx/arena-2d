/**
 * Scene — Manages the scene graph, hit buffer, and frame pipeline.
 *
 * The Scene is the root of the scene graph. It manages the element tree,
 * hit buffer for interaction, and the Ticker for frame updates.
 * Rendering to the DOM is delegated to one or more View instances.
 *
 * SPEC: §3 (Scene & Layering System)
 */

import { Arena2D } from "../Arena2D";
import { Arena2DContext } from "../rendering/Arena2DContext";
import { Container, type IContainer } from "./Container";
import { DirtyFlags } from "./DirtyFlags";
import type { IElement } from "./Element";
import type { ILayer } from "./Layer";
import { type ITicker, Ticker } from "./Ticker";
import type { View } from "./View";

// ── IScene Interface ──

export interface IScene {
  width: number;
  height: number;
  alphaThreshold: number;
  readonly root: IContainer;
  readonly hitBuffer: OffscreenCanvas;
  readonly ticker: ITicker;

  // Lifecycle
  resize(width: number, height: number): void;
  destroy(): void;

  // Lookup
  getElementById(id: string): IElement | null;
}

// ── Scene Class ──

export class Scene implements IScene {
  readonly root: IContainer;
  readonly hitBuffer: OffscreenCanvas;
  readonly ticker: ITicker;

  private _width: number;
  private _height: number;
  private _alphaThreshold = 10;
  private _elementIndex = new Map<string, IElement>();
  private _uidIndex = new Map<number, IElement>();
  private _isDestroyed = false;
  private _hitBufferCtx: OffscreenCanvasRenderingContext2D | null = null;
  private _hitBufferDirty = true;
  private _cachedHitBufferData: Uint8ClampedArray | null = null;
  private _views = new Set<View>();
  private _arenaCtx: Arena2DContext | null = null;

  private static _registry = new FinalizationRegistry((id: string) => {
    if (Arena2D.debug) {
      console.warn(
        `Arena2D Memory Warning: Scene [${id}] was garbage collected without being destroyed. Always call scene.destroy() to release resources.`,
      );
    }
  });

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;

    // Create hit buffer (offscreen canvas at scene resolution)
    this.hitBuffer = new OffscreenCanvas(width, height);
    this._hitBufferCtx = this.hitBuffer.getContext("2d", {
      willReadFrequently: true,
    });

    // Create root container
    this.root = new Container();
    (this.root as IElement).scene = this;

    // Create ticker and wire frame pipeline
    this.ticker = new Ticker();
    this.ticker.add(this.root as IElement);
    this.ticker.setRenderCallback(() => this._renderViews());

    // Register for GC tracking
    Scene._registry.register(this, this.root.id, this);
  }

  // ── Properties ──

  get width(): number {
    return this._width;
  }

  set width(value: number) {
    if (value !== this._width) {
      this.resize(value, this._height);
    }
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    if (value !== this._height) {
      this.resize(this._width, value);
    }
  }

  get alphaThreshold(): number {
    return this._alphaThreshold;
  }

  set alphaThreshold(value: number) {
    this._alphaThreshold = Math.max(0, Math.min(255, value));
  }

  // ── Lifecycle ──

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;

    // Resize hit buffer
    this.hitBuffer.width = width;
    this.hitBuffer.height = height;
    this._hitBufferCtx = this.hitBuffer.getContext("2d", {
      willReadFrequently: true,
    });
    this._hitBufferDirty = true;

    // Invalidate root to trigger layout and transform recalculation
    (this.root as IElement).invalidate(
      DirtyFlags.Layout | DirtyFlags.Transform,
    );
  }

  /**
   * Release all resources.
   */
  destroy(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    // Unregister from GC tracking
    Scene._registry.unregister(this);

    // Stop ticker
    this.ticker.stop();
    this.ticker.remove(this.root as IElement);

    // Destroy all attached views
    for (const view of this._views) {
      view.destroy();
    }
    this._views.clear();

    // Clear element indices
    this._elementIndex.clear();
    this._uidIndex.clear();

    // Destroy root
    (this.root as IElement).destroy();
  }

  // ── Element Lookup ──

  getElementById(id: string): IElement | null {
    return this._elementIndex.get(id) || null;
  }

  /**
   * Register an element in the ID index.
   * @internal Called by Element when added to scene
   */
  registerElement(element: IElement): void {
    this._elementIndex.set(element.id, element);
    this._uidIndex.set((element as any).uid, element);
    if (element.interactive) {
      this._hitBufferDirty = true;
      // Mark spatial dirty on all views
      for (const view of this._views) {
        (view.interaction as any).markSpatialDirty(element);
      }
    }
  }

  /**
   * Unregister an element from the ID index.
   * @internal Called by Element when removed from scene
   */
  unregisterElement(element: IElement): void {
    this._elementIndex.delete(element.id);
    this._uidIndex.delete((element as any).uid);
    // Unregister from all views' interaction managers
    for (const view of this._views) {
      (view.interaction as any).unregisterElement(element);
    }
    if (element.interactive) {
      this._hitBufferDirty = true;
    }
  }

  // ── Layer inheritance ──

  /**
   * Recursively reassign layer to element and descendants based on parent inheritance.
   */
  _reassignLayerRecursive(element: IElement): void {
    if (!element.layer && element.parent) {
      const parentLayer = element.parent.layer;
      if (parentLayer) {
        (element as { layer: ILayer | null }).layer = parentLayer;
        (parentLayer as any).addElement(element);
      }
    }

    if ("children" in element) {
      const container = element as IContainer;
      for (const child of container.children) {
        this._reassignLayerRecursive(child);
      }
    }
  }

  // ── Hit Buffer ──

  /**
   * Mark the hit buffer as needing a repaint.
   */
  invalidateHitBuffer(): void {
    this._hitBufferDirty = true;
    this._cachedHitBufferData = null;
  }

  /**
   * Mark an element as needing a spatial hash update on all attached views.
   * Called by Element.invalidate() when transform or spatial flags change.
   * @internal
   */
  markSpatialDirty(element: IElement): void {
    for (const view of this._views) {
      (
        view.interaction as { markSpatialDirty?: (el: IElement) => void }
      ).markSpatialDirty?.(element);
    }
  }

  /**
   * Paint all interactive elements to the hit buffer using unique colors.
   * Called by View.render() for the first registered view.
   * @internal
   */
  _updateHitBuffer(view: View): void {
    if (!this._hitBufferDirty) return;
    this._hitBufferDirty = false;

    const ctx = this._hitBufferCtx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.hitBuffer.width, this.hitBuffer.height);

    // Reuse or create Arena2DContext
    if (!this._arenaCtx) {
      this._arenaCtx = new Arena2DContext(ctx);
    } else {
      this._arenaCtx.setContext(ctx);
    }
    const arenaCtx = this._arenaCtx;
    view._paintHitRecursive(this.root as IElement, arenaCtx, view.frustum);

    // Cache the hit buffer pixel data for fast sampling
    if (typeof ctx.getImageData === "function") {
      this._cachedHitBufferData = ctx.getImageData(
        0,
        0,
        this.hitBuffer.width,
        this.hitBuffer.height,
      ).data;
    }
  }

  /**
   * Sample the hit buffer at scene coordinates.
   * Returns the element UID at that pixel, or 0 if none.
   */
  _sampleHitBuffer(sx: number, sy: number): number {
    const data = this._cachedHitBufferData;
    if (!data) return 0;

    const px = Math.floor(sx);
    const py = Math.floor(sy);

    if (
      px < 0 ||
      px >= this.hitBuffer.width ||
      py < 0 ||
      py >= this.hitBuffer.height
    ) {
      return 0;
    }

    const offset = (py * this.hitBuffer.width + px) * 4;
    if (data[offset + 3] < this._alphaThreshold) return 0;

    const uid =
      (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
    return uid;
  }

  _getElementByUID(uid: number): IElement | null {
    return this._uidIndex.get(uid) || null;
  }

  // ── View Management ──

  /** @internal */
  _registerView(view: View): void {
    this._views.add(view);
  }

  /** @internal */
  _unregisterView(view: View): void {
    this._views.delete(view);
  }

  // ── Frame Pipeline ──

  /**
   * Render callback for the Ticker.
   * Delegates rendering to each attached View.
   */
  private _renderViews(): void {
    for (const view of this._views) {
      view.render();
    }
  }
}
