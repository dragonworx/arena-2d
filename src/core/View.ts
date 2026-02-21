/**
 * View — Renders a Scene into an HTML container with pan/zoom/projection support.
 *
 * A View is the bridge between a Scene (scene graph) and the DOM. It creates
 * canvas layers inside an HTML container, manages the rendering pipeline,
 * coordinate transforms, DPI scaling, interaction, and supports multiple
 * projections of the same scene (e.g. quad-view).
 */

import {
  type IInteractionManager,
  InteractionManager,
} from "../interaction/InteractionManager";
import { Arena2DContext } from "../rendering/Arena2DContext";
import { Container, type IContainer } from "./Container";
import { DirtyFlags } from "./DirtyFlags";
import type { IElement } from "./Element";
import { type ILayer, Layer } from "./Layer";
import type { IScene, Scene } from "./Scene";

// ── Types ──

export interface IProjection {
  sourceRect: { x: number; y: number; width: number; height: number };
  destRect: { x: number; y: number; width: number; height: number };
}

export type ViewAlignment = "center" | "top" | "bottom" | "left" | "right";

export interface LookAtOptions {
  align?: ViewAlignment;
  zoom?: number;
  animate?: boolean;
}

export interface ViewOptions {
  projections?: IProjection[];
  enableMousePan?: boolean;
  enableMouseZoom?: boolean;
  inertia?: boolean;
  friction?: number;
  minVelocity?: number;
}

// ── IView Interface ──

export interface IView {
  readonly container: HTMLElement;
  readonly scene: IScene;
  readonly interaction: IInteractionManager;
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  readonly projections: IProjection[];

  // Layer management
  createLayer(id: string, zIndex: number): ILayer;
  removeLayer(id: string): void;
  getLayer(id: string): ILayer | null;

  // Navigation
  lookAt(x: number, y: number, options?: LookAtOptions): void;

  // Projections
  addProjection(projection: IProjection): void;
  removeProjection(index: number): void;

  // Coordinate transforms
  screenToScene(screenX: number, screenY: number): { x: number; y: number };
  sceneToScreen(sceneX: number, sceneY: number): { x: number; y: number };

  // Lifecycle
  resize(width: number, height: number): void;
  render(): void;
  destroy(): void;
}

// ── View Class ──

export class View implements IView {
  readonly container: HTMLElement;
  readonly scene: Scene;
  readonly interaction: IInteractionManager;

  private _width: number;
  private _height: number;
  private _dpr: number;
  private _zoom = 1;
  private _panX = 0;
  private _panY = 0;
  private _projections: IProjection[] = [];
  private _layers = new Map<string, Layer>();
  private _defaultLayer: Layer;
  private _dprMediaQuery: MediaQueryList | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _isDestroyed = false;

  // Inertia state
  private _inertiaEnabled: boolean;
  private _friction: number;
  private _minVelocity: number;
  private _velocityX = 0;
  private _velocityY = 0;
  private _velocityZoom = 0;
  private _inertiaActive = false;

  // Mouse interaction
  private _enableMousePan: boolean;
  private _enableMouseZoom: boolean;
  private _isPanning = false;
  private _lastPointerX = 0;
  private _lastPointerY = 0;

  // Bound DOM handlers
  private _onPointerDown: (e: PointerEvent) => void;
  private _onPointerMove: (e: PointerEvent) => void;
  private _onPointerUp: (e: PointerEvent) => void;
  private _onWheel: (e: WheelEvent) => void;

  constructor(
    container: HTMLElement,
    scene: Scene,
    options: ViewOptions = {},
  ) {
    this.container = container;
    this.scene = scene;

    // Use container's actual dimensions
    this._width = container.clientWidth || 0;
    this._height = container.clientHeight || 0;
    this._dpr = window.devicePixelRatio || 1;

    // Options
    this._enableMousePan = options.enableMousePan ?? true;
    this._enableMouseZoom = options.enableMouseZoom ?? true;
    this._inertiaEnabled = options.inertia ?? false;
    this._friction = options.friction ?? 0.92;
    this._minVelocity = options.minVelocity ?? 0.5;

    // Ensure container is positioned
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    container.style.overflow = "hidden";

    // Create default layer
    this._defaultLayer = new Layer("default", 0, this.container, this);
    this._layers.set("default", this._defaultLayer);
    (scene.root as IElement).layer = this._defaultLayer;
    this._defaultLayer.addElement(scene.root as IElement);
    this._defaultLayer.resize(this._width, this._height, this._dpr);

    // Set up projections
    if (options.projections && options.projections.length > 0) {
      this._projections = [...options.projections];
    } else {
      // Default: identity projection covering full scene → full view
      this._projections = [
        {
          sourceRect: {
            x: 0,
            y: 0,
            width: scene.width,
            height: scene.height,
          },
          destRect: {
            x: 0,
            y: 0,
            width: this._width,
            height: this._height,
          },
        },
      ];
    }

    // Create interaction manager (attached to this view's container)
    this.interaction = new InteractionManager(this);

    // Bind pan/zoom DOM handlers
    this._onPointerDown = this._handlePanStart.bind(this);
    this._onPointerMove = this._handlePanMove.bind(this);
    this._onPointerUp = this._handlePanEnd.bind(this);
    this._onWheel = this._handleWheel.bind(this);

    if (this._enableMousePan) {
      container.addEventListener("pointerdown", this._onPointerDown);
      container.addEventListener("pointermove", this._onPointerMove);
      container.addEventListener("pointerup", this._onPointerUp);
    }
    if (this._enableMouseZoom) {
      container.addEventListener("wheel", this._onWheel, { passive: false });
    }

    // DPR listener
    this._setupDPRListener();

    // ResizeObserver
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        const w = Math.round(width);
        const h = Math.round(height);
        if (w === 0 && h === 0 && (this._width !== 0 || this._height !== 0)) {
          return;
        }
        if (w !== this._width || h !== this._height) {
          this.resize(w, h);
        }
      });
      this._resizeObserver.observe(this.container);
    }

    // Register with scene
    (scene as any)._registerView(this);
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

  get zoom(): number {
    return this._zoom;
  }

  set zoom(value: number) {
    this._zoom = Math.max(0.01, value);
  }

  get panX(): number {
    return this._panX;
  }

  set panX(value: number) {
    this._panX = value;
  }

  get panY(): number {
    return this._panY;
  }

  set panY(value: number) {
    this._panY = value;
  }

  get projections(): IProjection[] {
    return this._projections;
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

    // Detach all elements from this layer
    for (const element of layer.getElements()) {
      (element as { layer: ILayer | null }).layer = null;
      this.scene._reassignLayerRecursive(element);
    }

    layer.destroy();
    this._layers.delete(id);
  }

  getLayer(id: string): ILayer | null {
    return this._layers.get(id) || null;
  }

  // ── Navigation ──

  lookAt(x: number, y: number, options: LookAtOptions = {}): void {
    const align = options.align ?? "center";
    const targetZoom = options.zoom ?? this._zoom;
    const animate = options.animate ?? false;

    let targetPanX: number;
    let targetPanY: number;

    const viewW = this._width;
    const viewH = this._height;

    switch (align) {
      case "center":
        targetPanX = viewW / 2 - x * targetZoom;
        targetPanY = viewH / 2 - y * targetZoom;
        break;
      case "top":
        targetPanX = viewW / 2 - x * targetZoom;
        targetPanY = -y * targetZoom;
        break;
      case "bottom":
        targetPanX = viewW / 2 - x * targetZoom;
        targetPanY = viewH - y * targetZoom;
        break;
      case "left":
        targetPanX = -x * targetZoom;
        targetPanY = viewH / 2 - y * targetZoom;
        break;
      case "right":
        targetPanX = viewW - x * targetZoom;
        targetPanY = viewH / 2 - y * targetZoom;
        break;
    }

    if (animate && this._inertiaEnabled) {
      // Set velocity to animate towards target
      this._velocityX = (targetPanX - this._panX) * 0.3;
      this._velocityY = (targetPanY - this._panY) * 0.3;
      this._velocityZoom = (targetZoom - this._zoom) * 0.3;
      this._inertiaActive = true;
    } else {
      this._panX = targetPanX;
      this._panY = targetPanY;
      this._zoom = targetZoom;
    }
  }

  // ── Projections ──

  addProjection(projection: IProjection): void {
    this._projections.push(projection);
  }

  removeProjection(index: number): void {
    if (index >= 0 && index < this._projections.length) {
      this._projections.splice(index, 1);
    }
  }

  // ── Coordinate Transforms ──

  screenToScene(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect();
    const viewX = screenX - rect.left;
    const viewY = screenY - rect.top;
    return {
      x: (viewX - this._panX) / this._zoom,
      y: (viewY - this._panY) / this._zoom,
    };
  }

  sceneToScreen(sceneX: number, sceneY: number): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect();
    return {
      x: sceneX * this._zoom + this._panX + rect.left,
      y: sceneY * this._zoom + this._panY + rect.top,
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

    // Update default projection destRect
    if (this._projections.length > 0) {
      this._projections[0].destRect.width = width;
      this._projections[0].destRect.height = height;
    }
  }

  /**
   * Render the scene into this view's layers.
   * Called by Scene's ticker render callback for each attached view.
   */
  render(): void {
    // Update inertia
    if (this._inertiaActive) {
      this._updateInertia();
    }

    // Update spatial hash for interaction hit-testing
    (this.interaction as InteractionManager).updateSpatialHash();

    // Clear all layers
    for (const layer of this._layers.values()) {
      layer.render();
    }

    // Paint elements to their layers in scene-graph order
    this._paintRecursive(this.scene.root as IElement);

    // Update hit buffer
    (this.scene as any)._updateHitBuffer(this);

    // Re-evaluate hover
    (this.interaction as InteractionManager).refreshHover();
  }

  destroy(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    // Unregister from scene
    (this.scene as any)._unregisterView(this);

    // Destroy interaction manager
    this.interaction.destroy();

    // Remove pan/zoom listeners
    this.container.removeEventListener("pointerdown", this._onPointerDown);
    this.container.removeEventListener("pointermove", this._onPointerMove);
    this.container.removeEventListener("pointerup", this._onPointerUp);
    this.container.removeEventListener("wheel", this._onWheel);

    // Destroy all layers
    for (const layer of this._layers.values()) {
      layer.destroy();
    }
    this._layers.clear();

    // Disconnect ResizeObserver
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    // Remove DPR listener
    if (this._dprMediaQuery) {
      this._dprMediaQuery.removeEventListener("change", this._onDPRChange);
    }
  }

  // ── Rendering Pipeline ──

  /**
   * Recursively paint element and descendants to their assigned layers.
   */
  private _paintRecursive(element: IElement): void {
    if (!element.visible || element.alpha <= 0) return;
    if (element.display === "hidden") return;

    const layer = element.layer as Layer | null;
    if (!layer) return;

    const isContainer = "children" in element;
    const container = isContainer ? (element as Container) : null;

    // Handle cacheAsBitmap
    if (container && container.cacheAsBitmap) {
      if (!container.isCacheValid) {
        this._updateCache(container);
      }
    }

    const ctx = new Arena2DContext(layer.ctx);

    layer.ctx.save();

    // Apply pan/zoom + element transform with DPR scaling
    const m = element.worldMatrix;
    const dpr = this._dpr;
    const z = this._zoom;
    const px = this._panX;
    const py = this._panY;

    layer.ctx.setTransform(
      dpr * z * m[0],
      dpr * z * m[1],
      dpr * z * m[2],
      dpr * z * m[3],
      dpr * (z * m[4] + px),
      dpr * (z * m[5] + py),
    );

    layer.ctx.globalAlpha = element.effectiveAlpha;
    layer.ctx.globalCompositeOperation = element.blendMode;

    if (
      "paint" in element &&
      typeof (element as { paint: unknown }).paint === "function"
    ) {
      (element as { paint: (ctx: Arena2DContext) => void }).paint(ctx);
    }

    layer.ctx.restore();

    // If cached, skip children
    if (container && container.cacheAsBitmap && container.isCacheValid) {
      return;
    }

    // Paint children
    if (container) {
      if (container.clipContent) {
        layer.ctx.save();
        const m = container.worldMatrix;
        const dpr = this._dpr;
        const z = this._zoom;
        const px = this._panX;
        const py = this._panY;
        layer.ctx.setTransform(
          dpr * z * m[0],
          dpr * z * m[1],
          dpr * z * m[2],
          dpr * z * m[3],
          dpr * (z * m[4] + px),
          dpr * (z * m[5] + py),
        );
        layer.ctx.beginPath();
        layer.ctx.rect(0, 0, container.width, container.height);
        layer.ctx.clip();
      }

      const sortedChildren = Array.from(container.children).sort(
        (a, b) => a.zIndex - b.zIndex,
      );
      for (const child of sortedChildren) {
        this._paintRecursive(child);
      }

      if (container.clipContent) {
        layer.ctx.restore();
      }
    }
  }

  /**
   * Paint all interactive elements to the hit buffer using unique colors.
   * Called by Scene._updateHitBuffer.
   */
  _paintHitRecursive(element: IElement, ctx: Arena2DContext): void {
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

      const raw = ctx.raw;
      raw.save();
      const m = element.worldMatrix;
      const dpr = this._dpr;
      const z = this._zoom;
      const px = this._panX;
      const py = this._panY;
      raw.setTransform(
        dpr * z * m[0],
        dpr * z * m[1],
        dpr * z * m[2],
        dpr * z * m[3],
        dpr * (z * m[4] + px),
        dpr * (z * m[5] + py),
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
   * Render a container's subtree into its private offscreen canvas.
   */
  private _updateCache(container: Container): void {
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

    const dpr = this._dpr;
    const cacheCtx = container._getCacheContext(width * dpr, height * dpr);
    cacheCtx.clearRect(0, 0, width * dpr, height * dpr);

    const arenaCtx = new Arena2DContext(cacheCtx);

    const originalCache = container.cacheAsBitmap;
    (container as any)._cacheAsBitmap = false;

    this._paintToOverride(container, arenaCtx, -minX, -minY, dpr);

    (container as any)._cacheAsBitmap = originalCache;

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
    dpr: number,
  ): void {
    if ("children" in element) {
      const container = element as IContainer;
      const sorted = Array.from(container.children).sort(
        (a, b) => a.zIndex - b.zIndex,
      );

      for (const child of sorted) {
        if (!child.visible || child.alpha <= 0) continue;

        const raw = ctx.raw;
        raw.save();

        const m = child.localMatrix;
        raw.transform(
          dpr * m[0],
          dpr * m[1],
          dpr * m[2],
          dpr * m[3],
          dpr * (m[4] + offsetX),
          dpr * (m[5] + offsetY),
        );

        raw.globalAlpha = child.alpha;
        raw.globalCompositeOperation = child.blendMode;

        if ("paint" in child) {
          (child as any).paint(ctx);
        }

        this._paintToOverride(child, ctx, 0, 0, 1);

        raw.restore();
      }
    }
  }

  // ── Pan/Zoom Handlers ──

  private _handlePanStart(e: PointerEvent): void {
    // Only start pan on middle-click or when space is held (we'll use middle click for now)
    if (e.button === 1) {
      // Middle mouse button
      this._isPanning = true;
      this._lastPointerX = e.clientX;
      this._lastPointerY = e.clientY;
      this._velocityX = 0;
      this._velocityY = 0;
      this._inertiaActive = false;
      e.preventDefault();
    }
  }

  private _handlePanMove(e: PointerEvent): void {
    if (!this._isPanning) return;

    const dx = e.clientX - this._lastPointerX;
    const dy = e.clientY - this._lastPointerY;

    this._panX += dx;
    this._panY += dy;

    if (this._inertiaEnabled) {
      this._velocityX = dx;
      this._velocityY = dy;
    }

    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
  }

  private _handlePanEnd(_e: PointerEvent): void {
    if (!this._isPanning) return;
    this._isPanning = false;

    if (this._inertiaEnabled && (Math.abs(this._velocityX) > this._minVelocity || Math.abs(this._velocityY) > this._minVelocity)) {
      this._inertiaActive = true;
    }
  }

  private _handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const rect = this.container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards mouse position
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.01, this._zoom * zoomFactor);

    // Adjust pan to keep the point under the mouse stationary
    const sceneX = (mouseX - this._panX) / this._zoom;
    const sceneY = (mouseY - this._panY) / this._zoom;

    this._zoom = newZoom;
    this._panX = mouseX - sceneX * newZoom;
    this._panY = mouseY - sceneY * newZoom;
  }

  // ── Inertia ──

  private _updateInertia(): void {
    this._velocityX *= this._friction;
    this._velocityY *= this._friction;
    this._velocityZoom *= this._friction;

    this._panX += this._velocityX;
    this._panY += this._velocityY;
    this._zoom += this._velocityZoom;

    if (
      Math.abs(this._velocityX) < this._minVelocity &&
      Math.abs(this._velocityY) < this._minVelocity &&
      Math.abs(this._velocityZoom) < 0.001
    ) {
      this._velocityX = 0;
      this._velocityY = 0;
      this._velocityZoom = 0;
      this._inertiaActive = false;
    }
  }

  // ── DPI Handling ──

  private _setupDPRListener(): void {
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
      if (this._dprMediaQuery) {
        this._dprMediaQuery.removeEventListener("change", this._onDPRChange);
      }
      this._setupDPRListener();
      this.resize(this._width, this._height);
    }
  };
}
