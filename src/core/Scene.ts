/**
 * Scene — Manages the DOM container, layers, hit buffer, and frame pipeline.
 *
 * The Scene is the root of the scene graph. It creates a host <div>, manages
 * multiple <canvas> layers, handles DPI scaling, and orchestrates the render
 * loop via the Ticker.
 *
 * SPEC: §3 (Scene & Layering System)
 */

import { Arena2D } from "../Arena2D";
import {
  type IInteractionManager,
  InteractionManager,
} from "../interaction/InteractionManager";
import { Arena2DContext } from "../rendering/Arena2DContext";
import { Container, type IContainer } from "./Container";
import { DirtyFlags } from "./DirtyFlags";
import type { IElement } from "./Element";
import { type ILayer, Layer } from "./Layer";
import { type ITicker, Ticker } from "./Ticker";

// ── IScene Interface ──

export interface IScene {
  readonly container: HTMLElement;
  width: number;
  height: number;
  readonly dpr: number;
  alphaThreshold: number;
  readonly root: IContainer;
  readonly hitBuffer: OffscreenCanvas;
  readonly ticker: ITicker;
  readonly interaction: IInteractionManager;

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

// ── Scene Class ──

export class Scene implements IScene {
  readonly container: HTMLElement;
  readonly root: IContainer;
  readonly hitBuffer: OffscreenCanvas;
  readonly ticker: ITicker;
  readonly interaction: IInteractionManager;

  private _width: number;
  private _height: number;
  private _dpr: number;
  private _alphaThreshold = 10;
  private _layers = new Map<string, Layer>();
  private _defaultLayer: Layer;
  private _elementIndex = new Map<string, IElement>();
  private _uidIndex = new Map<number, IElement>();
  private _dprMediaQuery: MediaQueryList | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _isDestroyed = false;
  private _hitBufferCtx: OffscreenCanvasRenderingContext2D | null = null;
  private _hitBufferDirty = true;

  private static _registry = new FinalizationRegistry((id: string) => {
    if (Arena2D.debug) {
      console.warn(
        `Arena2D Memory Warning: Scene [${id}] was garbage collected without being destroyed. Always call scene.destroy() to release DOM and ticker resources.`,
      );
    }
  });

  constructor(container: HTMLElement, width: number, height: number) {
    this.container = container;
    // Use the passed dimensions OR the container's actual layout dimensions
    this._width = width || container.clientWidth || 0;
    this._height = height || container.clientHeight || 0;
    this._dpr = window.devicePixelRatio || 1;

    // Ensure container is positioned (required for absolute-positioned layers)
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    // Container size is controlled by external CSS
    container.style.overflow = "hidden";

    // Create hit buffer (offscreen canvas at scene resolution)
    this.hitBuffer = new OffscreenCanvas(width * this._dpr, height * this._dpr);
    this._hitBufferCtx = this.hitBuffer.getContext("2d", {
      willReadFrequently: true,
    });

    // Create root container
    this.root = new Container();
    (this.root as IElement).scene = this;

    // Create default layer (id: "default", zIndex: 0)
    this._defaultLayer = new Layer("default", 0, this.container, this);
    this._layers.set("default", this._defaultLayer);
    (this.root as IElement).layer = this._defaultLayer;
    this._defaultLayer.addElement(this.root as IElement);
    this._defaultLayer.resize(width, height, this._dpr);

    // Create ticker and wire frame pipeline
    this.ticker = new Ticker();
    this.ticker.add(this.root as IElement);
    this.ticker.setRenderCallback(() => this.render());

    // Create interaction manager
    this.interaction = new InteractionManager(this);

    // Listen for DPR changes
    this._setupDPRListener();

    // Listen for container resize (if ResizeObserver is available, e.g. in browser)
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        const w = Math.round(width);
        const h = Math.round(height);
        if (w !== this._width || h !== this._height) {
          this.resize(w, h);
        }
      });
      this._resizeObserver.observe(this.container);
    }

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

  get dpr(): number {
    return this._dpr;
  }

  get alphaThreshold(): number {
    return this._alphaThreshold;
  }

  set alphaThreshold(value: number) {
    this._alphaThreshold = Math.max(0, Math.min(255, value));
  }

  // ── Layer Management ──

  createLayer(id: string, zIndex: number): ILayer {
    if (this._layers.has(id)) {
      throw new Error(`Layer with id "${id}" already exists`);
    }

    const layer = new Layer(id, zIndex, this.container, this);
    layer.resize(this._width, this._height, this._dpr);
    this._layers.set(id, layer);
    return layer;
  }

  removeLayer(id: string): void {
    if (id === "default") {
      throw new Error("Cannot remove default layer");
    }

    const layer = this._layers.get(id);
    if (!layer) return;

    // Detach all elements from this layer (they fall back to parent-inherited layer)
    for (const element of layer.getElements()) {
      (element as { layer: ILayer | null }).layer = null;
      // Element will inherit layer from parent on next update
      this._reassignLayerRecursive(element);
    }

    layer.destroy();
    this._layers.delete(id);
  }

  getLayer(id: string): ILayer | null {
    return this._layers.get(id) || null;
  }

  /**
   * Recursively reassign layer to element and descendants based on parent inheritance.
   */
  private _reassignLayerRecursive(element: IElement): void {
    // Inherit layer from parent if not explicitly set
    if (!element.layer && element.parent) {
      const parentLayer = element.parent.layer;
      if (parentLayer) {
        (element as { layer: ILayer | null }).layer = parentLayer;
        (parentLayer as Layer).addElement(element);
      }
    }

    // Recurse to children
    if ("children" in element) {
      const container = element as IContainer;
      for (const child of container.children) {
        this._reassignLayerRecursive(child);
      }
    }
  }

  // ── Coordinate Transforms ──

  screenToScene(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect();
    return {
      x: screenX - rect.left,
      y: screenY - rect.top,
    };
  }

  sceneToScreen(sceneX: number, sceneY: number): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect();
    return {
      x: sceneX + rect.left,
      y: sceneY + rect.top,
    };
  }

  // ── Lifecycle ──

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;

    // Resize all layers
    for (const layer of this._layers.values()) {
      layer.resize(width, height, this._dpr);
    }

    // Resize hit buffer (resizing clears the canvas, so re-acquire context)
    this.hitBuffer.width = width * this._dpr;
    this.hitBuffer.height = height * this._dpr;
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

    // Destroy interaction manager
    this.interaction.destroy();

    // Stop ticker
    this.ticker.stop();
    this.ticker.remove(this.root as IElement);

    // Destroy all layers
    for (const layer of this._layers.values()) {
      layer.destroy();
    }
    this._layers.clear();

    // Clear element indices
    this._elementIndex.clear();
    this._uidIndex.clear();

    // Disconnect ResizeObserver
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    // Remove DPR listener
    if (this._dprMediaQuery) {
      this._dprMediaQuery.removeEventListener("change", this._onDPRChange);
    }

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
      (this.interaction as InteractionManager).markSpatialDirty(element);
    }
  }

  /**
   * Unregister an element from the ID index.
   * @internal Called by Element when removed from scene
   */
  unregisterElement(element: IElement): void {
    this._elementIndex.delete(element.id);
    this._uidIndex.delete((element as any).uid);
    (this.interaction as InteractionManager).unregisterElement(element);
    if (element.interactive) {
      this._hitBufferDirty = true;
    }
  }

  // ── Frame Pipeline ──

  /**
   * Render all layers.
   *
   * This is called by the Ticker after the update phase.
   * We walk the scene graph and paint each element to its assigned layer.
   */
  render(): void {
    // Update spatial hash for interaction hit-testing
    (this.interaction as InteractionManager).updateSpatialHash();

    // Clear all layers
    for (const layer of this._layers.values()) {
      layer.render();
    }

    // Paint elements to their layers in scene-graph order
    this._paintRecursive(this.root as IElement);

    // Update hit buffer
    this._updateHitBuffer();

    // Re-evaluate hover at the last known pointer position so elements that
    // moved under a stationary cursor correctly trigger pointerenter/pointerleave.
    (this.interaction as InteractionManager).refreshHover();
  }

  /**
   * Mark the hit buffer as needing a repaint.
   * Called when interactive elements change visually or spatially.
   */
  invalidateHitBuffer(): void {
    this._hitBufferDirty = true;
  }

  /**
   * Paint all interactive elements to the offscreen hit buffer using unique colors.
   * Skips repaint if nothing has changed since the last update.
   */
  private _updateHitBuffer(): void {
    if (!this._hitBufferDirty) return;
    this._hitBufferDirty = false;

    const ctx = this._hitBufferCtx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.hitBuffer.width, this.hitBuffer.height);
    const arenaCtx = new Arena2DContext(ctx);
    this._paintHitRecursive(this.root as IElement, arenaCtx);
  }

  private _paintHitRecursive(element: IElement, ctx: Arena2DContext): void {
    if (
      !element.visible ||
      element.alpha <= 0 ||
      element.display === "hidden"
    ) {
      return;
    }

    if (element.interactive) {
      const uid = (element as any).uid;
      const r = (uid & 0xff0000) >> 16;
      const g = (uid & 0x00ff00) >> 8;
      const b = uid & 0x0000ff;
      const color = `rgb(${r},${g},${b})`;

      // Apply DPR-scaled transform (same as _paintRecursive)
      const raw = ctx.raw;
      raw.save();
      const m = element.worldMatrix;
      const dpr = this._dpr;
      raw.setTransform(
        dpr * m[0],
        dpr * m[1],
        dpr * m[2],
        dpr * m[3],
        dpr * m[4],
        dpr * m[5],
      );
      raw.globalAlpha = 1.0;
      raw.globalCompositeOperation = "source-over";
      raw.fillStyle = color;
      raw.strokeStyle = color;

      if ("paint" in element) {
        (element as any).paint(ctx);
      }

      raw.restore();
    }

    if ("children" in element) {
      const container = element as IContainer;
      const sorted = Array.from(container.children).sort(
        (a, b) => a.zIndex - b.zIndex,
      );
      for (const child of sorted) {
        this._paintHitRecursive(child, ctx);
      }
    }
  }

  /**
   * Sample the hit buffer at the given scene coordinates.
   * Returns the element UID at that pixel, or 0 if none.
   */
  _sampleHitBuffer(sx: number, sy: number): number {
    const ctx = this._hitBufferCtx;
    if (!ctx) return 0;

    const dpr = this._dpr;
    const px = Math.floor(sx * dpr);
    const py = Math.floor(sy * dpr);

    if (
      px < 0 ||
      px >= this.hitBuffer.width ||
      py < 0 ||
      py >= this.hitBuffer.height
    ) {
      return 0;
    }

    const data = ctx.getImageData(px, py, 1, 1).data;
    if (data[3] < this._alphaThreshold) return 0; // Alpha check for interactive passthrough

    const uid = (data[0] << 16) | (data[1] << 8) | data[2];
    return uid;
  }

  _getElementByUID(uid: number): IElement | null {
    return this._uidIndex.get(uid) || null;
  }

  /**
   * Recursively paint element and descendants to their assigned layers.
   */
  private _paintRecursive(element: IElement): void {
    // Skip invisible elements
    if (!element.visible || element.alpha <= 0) {
      return;
    }

    // Skip hidden display elements
    if (element.display === "hidden") {
      return;
    }

    // Get element's layer
    const layer = element.layer as Layer | null;
    if (!layer) return;

    const isContainer = "children" in element;
    const container = isContainer ? (element as Container) : null;

    // Handle cacheAsBitmap for Containers
    if (container && container.cacheAsBitmap) {
      if (!container.isCacheValid) {
        this._updateCache(container);
      }
    }

    // Create Arena2DContext wrapper
    const ctx = new Arena2DContext(layer.ctx);

    // Save canvas state
    layer.ctx.save();

    // Apply element transform with DPR scaling
    const m = element.worldMatrix;
    const dpr = this._dpr;
    layer.ctx.setTransform(
      dpr * m[0],
      dpr * m[1],
      dpr * m[2],
      dpr * m[3],
      dpr * m[4],
      dpr * m[5],
    );

    // Apply element alpha and blend mode
    layer.ctx.globalAlpha = element.effectiveAlpha;
    layer.ctx.globalCompositeOperation = element.blendMode;

    // Call element's paint method
    if (
      "paint" in element &&
      typeof (element as { paint: unknown }).paint === "function"
    ) {
      (element as { paint: (ctx: Arena2DContext) => void }).paint(ctx);
    }

    // Restore canvas state
    layer.ctx.restore();

    // If we cached this container, skip children (they are in the cache)
    if (container && container.cacheAsBitmap && container.isCacheValid) {
      return;
    }

    // Paint children (each child uses its own absolute worldMatrix)
    if (container) {
      // Sort by zIndex for correct layering
      const sortedChildren = Array.from(container.children).sort(
        (a, b) => a.zIndex - b.zIndex,
      );
      for (const child of sortedChildren) {
        this._paintRecursive(child);
      }
    }
  }

  /**
   * Render a container's subtree into its private offscreen canvas.
   */
  private _updateCache(container: Container): void {
    // 1. Determine local bounds of all descendants
    let minX = 0;
    let minY = 0;
    let maxX = container.width;
    let maxY = container.height;

    const walk = (el: IElement) => {
      if ("children" in el) {
        for (const child of (el as IContainer).children) {
          minX = Math.min(minX, child.x);
          minY = Math.min(minY, child.y);
          maxX = Math.max(maxX, child.x + child.width);
          maxY = Math.max(maxY, child.y + child.height);
          walk(child);
        }
      }
    };
    walk(container);

    const width = Math.ceil(maxX - minX);
    const height = Math.ceil(maxY - minY);

    if (width <= 0 || height <= 0) return;

    // 2. Get the offscreen context (scaled by DPR for sharpness)
    const dpr = this._dpr;
    const cacheCtx = container._getCacheContext(width * dpr, height * dpr);
    cacheCtx.clearRect(0, 0, width * dpr, height * dpr);
    
    // 3. Render the subtree into the cache
    // We need to offset the rendering so (minX, minY) maps to (0, 0)
    const arenaCtx = new Arena2DContext(cacheCtx);
    
    // Temporarily disable the container's own cacheAsBitmap flag to avoid recursion
    const originalCache = container.cacheAsBitmap;
    (container as any)._cacheAsBitmap = false;

    this._paintToOverride(container, arenaCtx, -minX, -minY, dpr);

    (container as any)._cacheAsBitmap = originalCache;

    // 4. Save the results
    container._setCacheResult(minX, minY);
  }

  /**
   * Helper to paint a subtree into an alternate context with a specific offset.
   */
  private _paintToOverride(
    element: IElement,
    ctx: Arena2DContext,
    offsetX: number,
    offsetY: number,
    dpr: number
  ): void {
    // This is a simplified version of the main render loop
    // It uses the element's local matrix relative to the CACHED parent.
    // However, since we want to support nested caches, it gets complex.
    // For M0, let's just render children relative to the container.

    if ("children" in element) {
      const container = element as IContainer;
      const sorted = Array.from(container.children).sort((a, b) => a.zIndex - b.zIndex);
      
      for (const child of sorted) {
        if (!child.visible || child.alpha <= 0) continue;

        const raw = ctx.raw;
        raw.save();

        // Compute local transform relative to cache origin + offset
        // For simplicity, we'll use the child's local properties.
        // This only works if children are direct children of the cached container.
        // Nested children would need their transform relative to the ancestor.
        
        // Actually, the easiest way is to temporarily set the child's worldMatrix
        // to be relative to our cache, but that's invasive.
        
        // Better: apply the child's transform manually.
        const m = child.localMatrix; // Local matrix relative to parent
        raw.transform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * (m[4] + offsetX), dpr * (m[5] + offsetY));

        raw.globalAlpha = child.alpha; // Relative alpha
        raw.globalCompositeOperation = child.blendMode;

        if ("paint" in child) {
          (child as any).paint(ctx);
        }

        // Recurse
        this._paintToOverride(child, ctx, 0, 0, 1); // Sub-children are already relative to parent

        raw.restore();
      }
    }
  }

  // ── DPI Handling ──

  private _setupDPRListener(): void {
    // Listen for DPR changes (e.g., moving window between displays)
    // matchMedia approach as recommended by MDN
    try {
      const mqString = `(resolution: ${window.devicePixelRatio}dppx)`;
      this._dprMediaQuery = window.matchMedia(mqString);
      this._dprMediaQuery.addEventListener("change", this._onDPRChange);
    } catch {
      // ignore
    }
  }

  private _onDPRChange = (): void => {
    const newDpr = window.devicePixelRatio || 1;
    if (newDpr !== this._dpr) {
      this._dpr = newDpr;
      // Re-setup listener for new DPR value
      if (this._dprMediaQuery) {
        this._dprMediaQuery.removeEventListener("change", this._onDPRChange);
      }
      this._setupDPRListener();
      // Resize to apply new DPR
      this.resize(this._width, this._height);
    }
  };
}
