/**
 * Layer — Independent <canvas> element for layered caching.
 *
 * Each layer is an absolutely-positioned canvas within the scene container.
 * Layers are ordered by CSS z-index. Elements are assigned to layers either
 * explicitly or by inheriting from their parent.
 *
 * SPEC: §3.2–3.4 (Scene & Layering System)
 */

import type { CanvasUIContext } from "../rendering/CanvasUIContext";
import type { IElement } from "./Element";

// ── ILayer Interface ──

export interface ILayer {
  readonly id: string;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  zIndex: number;
  opacity: number;
  blendMode: string;
  render(): void;
}

// ── Layer Class ──

export class Layer implements ILayer {
  readonly id: string;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  private _zIndex: number;
  private _opacity: number;
  private _blendMode: string;
  private _elements: Set<IElement> = new Set();
  private _scene: unknown; // Will be typed as Scene when we wire it
  private _width = 0;
  private _height = 0;

  constructor(
    id: string,
    zIndex: number,
    container: HTMLElement,
    scene: unknown,
  ) {
    this.id = id;
    this._zIndex = zIndex;
    this._opacity = 1;
    this._blendMode = "normal";
    this._scene = scene;

    // Create canvas element
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.left = "0";
    this.canvas.style.top = "0";
    this.canvas.style.pointerEvents = "none"; // Interaction handled separately
    this.canvas.style.zIndex = String(zIndex);
    this.canvas.style.opacity = String(this._opacity);
    this.canvas.style.mixBlendMode = this._blendMode;
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      throw new Error("Failed to get 2D context for layer canvas");
    }
    this.ctx = ctx;
  }

  get zIndex(): number {
    return this._zIndex;
  }

  set zIndex(value: number) {
    this._zIndex = value;
    this.canvas.style.zIndex = String(value);
  }

  get opacity(): number {
    return this._opacity;
  }

  set opacity(value: number) {
    this._opacity = Math.max(0, Math.min(1, value));
    this.canvas.style.opacity = String(this._opacity);
  }

  get blendMode(): string {
    return this._blendMode;
  }

  set blendMode(value: string) {
    this._blendMode = value;
    this.canvas.style.mixBlendMode = value;
  }

  /**
   * Register an element with this layer.
   * @internal Called by Scene when element.layer is set
   */
  addElement(element: IElement): void {
    this._elements.add(element);
  }

  /**
   * Unregister an element from this layer.
   * @internal Called by Scene when element.layer changes or element is removed
   */
  removeElement(element: IElement): void {
    this._elements.delete(element);
  }

  /**
   * Clear and repaint all elements assigned to this layer.
   *
   * SPEC: §7.2 — Rendering pipeline
   */
  render(): void {
    // Clear canvas using physical dimensions (context is at identity)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Paint all elements assigned to this layer
    // Elements will be painted in scene-graph order (handled by Scene)
    // The Scene will call element.paint(ctx) for each element
  }

  /**
   * Resize the layer's canvas to match scene dimensions.
   * @internal Called by Scene.resize()
   */
  resize(width: number, height: number, dpr: number): void {
    this._width = width;
    this._height = height;

    // Set CSS size (logical pixels)
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Set canvas resolution (physical pixels)
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // Reset to identity - DPR scaling will be applied per-element in Scene._paintRecursive
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Destroy the layer and remove its canvas from the DOM.
   */
  destroy(): void {
    this.canvas.remove();
    this._elements.clear();
  }

  /**
   * Get all elements currently assigned to this layer.
   * @internal Used by Scene for rendering
   */
  getElements(): ReadonlySet<IElement> {
    return this._elements;
  }
}
