/**
 * Scene — Manages the DOM container, layers, hit buffer, and frame pipeline.
 *
 * The Scene is the root of the scene graph. It creates a host <div>, manages
 * multiple <canvas> layers, handles DPI scaling, and orchestrates the render
 * loop via the Ticker.
 *
 * SPEC: §3 (Scene & Layering System)
 */

import {
  type IInteractionManager,
  InteractionManager,
} from "../interaction/InteractionManager";
import { ArenaContext } from "../rendering/ArenaContext";
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
  private _dprMediaQuery: MediaQueryList | null = null;

  constructor(container: HTMLElement, width: number, height: number) {
    this.container = container;
    this._width = width;
    this._height = height;
    this._dpr = window.devicePixelRatio || 1;

    // Ensure container is positioned (required for absolute-positioned layers)
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    // Set container size
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.overflow = "hidden";

    // Create hit buffer (offscreen canvas at scene resolution)
    this.hitBuffer = new OffscreenCanvas(width * this._dpr, height * this._dpr);

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

    // Update container size
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;

    // Resize all layers
    for (const layer of this._layers.values()) {
      layer.resize(width, height, this._dpr);
    }

    // Resize hit buffer
    this.hitBuffer.width = width * this._dpr;
    this.hitBuffer.height = height * this._dpr;

    // Invalidate root to trigger layout and transform recalculation
    (this.root as IElement).invalidate(
      DirtyFlags.Layout | DirtyFlags.Transform,
    );
  }

  destroy(): void {
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

    // Clear element index
    this._elementIndex.clear();

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
  }

  /**
   * Unregister an element from the ID index.
   * @internal Called by Element when removed from scene
   */
  unregisterElement(element: IElement): void {
    this._elementIndex.delete(element.id);
    (this.interaction as InteractionManager).unregisterElement(element);
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
    // console.log("Rendering scene...");
    this._paintRecursive(this.root as IElement);
  }

  /**
   * Recursively paint element and descendants to their assigned layers.
   */
  private _paintRecursive(element: IElement): void {
    // Skip invisible elements
    if (!element.visible || element.alpha <= 0) {
      // console.log("Skipping invisible:", element.id, element.visible, element.alpha);
      return;
    }

    // Skip hidden display elements
    if (element.display === "hidden") {
      return;
    }

    // Get element's layer
    const layer = element.layer as Layer | null;
    if (!layer) {
      // Element has no layer — should not happen in normal operation
      // (all elements should inherit from root which has default layer)
      return;
    }

    // Create ArenaContext wrapper
    const ctx = new ArenaContext(layer.ctx);

    // Save canvas state
    layer.ctx.save();

    // Apply element transform with DPR scaling
    // Set the full transform (DPR * worldMatrix) to avoid accumulation issues
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
    if ((element as any).paint) {
      // console.log("Painting:", element.id, "at", element.worldMatrix);
      (element as any).paint(ctx);
    }

    // Restore canvas state
    layer.ctx.restore();

    // Paint children (each child uses its own absolute worldMatrix)
    if ("children" in element) {
      const container = element as IContainer;
      // Sort by zIndex for correct layering
      const sortedChildren = Array.from(container.children).sort(
        (a, b) => a.zIndex - b.zIndex,
      );
      for (const child of sortedChildren) {
        this._paintRecursive(child);
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
      // Some browsers may not support this query
      // Fall back to no DPR change detection
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
