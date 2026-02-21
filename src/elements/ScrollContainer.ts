import { Container, type IContainer } from "../core/Container";
import type { IElement } from "../core/Element";
import { DirtyFlags } from "../core/DirtyFlags";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { type IRect, computeAABB } from "../math/aabb";
import { type MatrixArray, multiply, translate, invert, transformPoint } from "../math/matrix";
import type { IPointerEvent } from "../interaction/InteractionManager";

export interface IScrollContainer extends IContainer {
  scrollX: number;
  scrollY: number;
  scrollEnabledX: boolean;
  scrollEnabledY: boolean;
  showScrollBars: boolean;
  inertiaEnabled: boolean;
  contentBounds: IRect;

  scrollTo(x: number, y: number, animate?: boolean): void;
  scrollBy(dx: number, dy: number, animate?: boolean): void;
}

export class ScrollContainer extends Container implements IScrollContainer {
  private _scrollX = 0;
  private _scrollY = 0;
  private _scrollEnabledX = true;
  private _scrollEnabledY = true;
  private _showScrollBars = true;
  private _inertiaEnabled = true;
  private _contentBounds: IRect = { x: 0, y: 0, width: 0, height: 0 };

  // Inertia / Drag state
  private _isDragging = false;
  private _lastPointerX = 0;
  private _lastPointerY = 0;
  private _velocityX = 0;
  private _velocityY = 0;
  private _friction = 0.95;

  // Scrollbar opacity
  private _scrollBarOpacity = 0;
  private _fadeTimer = 0;
  private _fadeDuration = 1000; // ms

  constructor(id?: string) {
    super(id);
    this.clipContent = true;

    // Listen for events
    this.on("pointerdown", this._handlePointerDown.bind(this));
    this.on("wheel", this._handleWheel.bind(this));
  }

  get scrollX(): number { return this._scrollX; }
  set scrollX(v: number) {
    const clamped = this._clampX(v);
    if (this._scrollX !== clamped) {
      this._scrollX = clamped;
      this.invalidate(DirtyFlags.Visual | DirtyFlags.Spatial);
      // Invalidate children transform because their worldMatrix depends on our scroll
      for (const child of this.children) {
        child.invalidate(DirtyFlags.Transform);
      }
      this._showBars();
      this.emit("scroll", { target: this, x: this._scrollX, y: this._scrollY });
    }
  }

  get scrollY(): number { return this._scrollY; }
  set scrollY(v: number) {
    const clamped = this._clampY(v);
    if (this._scrollY !== clamped) {
      this._scrollY = clamped;
      this.invalidate(DirtyFlags.Visual | DirtyFlags.Spatial);
      // Invalidate children transform because their worldMatrix depends on our scroll
      for (const child of this.children) {
        child.invalidate(DirtyFlags.Transform);
      }
      this._showBars();
      this.emit("scroll", { target: this, x: this._scrollX, y: this._scrollY });
    }
  }

  get scrollEnabledX(): boolean { return this._scrollEnabledX; }
  set scrollEnabledX(v: boolean) { this._scrollEnabledX = v; }

  get scrollEnabledY(): boolean { return this._scrollEnabledY; }
  set scrollEnabledY(v: boolean) { this._scrollEnabledY = v; }

  get showScrollBars(): boolean { return this._showScrollBars; }
  set showScrollBars(v: boolean) { this._showScrollBars = v; this.invalidate(DirtyFlags.Visual); }

  get inertiaEnabled(): boolean { return this._inertiaEnabled; }
  set inertiaEnabled(v: boolean) { this._inertiaEnabled = v; }

  get contentBounds(): IRect { return this._contentBounds; }

  scrollTo(x: number, y: number): void {
    this.scrollX = x;
    this.scrollY = y;
  }

  scrollBy(dx: number, dy: number): void {
    this.scrollX += dx;
    this.scrollY += dy;
  }

  override getWorldMatrixForChildren(): MatrixArray {
    const scrollM = translate(-this._scrollX, -this._scrollY);
    return multiply(this.worldMatrix, scrollM);
  }

  override update(dt: number): void {
    super.update(dt);

    // Update content bounds if children are dirty
    this._updateContentBounds();

    // Inertia
    if (!this._isDragging && this._inertiaEnabled && (Math.abs(this._velocityX) > 0.1 || Math.abs(this._velocityY) > 0.1)) {
      if (this._scrollEnabledX) this.scrollX -= this._velocityX * (dt / 16.6);
      if (this._scrollEnabledY) this.scrollY -= this._velocityY * (dt / 16.6);
      this._velocityX *= Math.pow(this._friction, dt / 16.6);
      this._velocityY *= Math.pow(this._friction, dt / 16.6);
    }

    // Scrollbar fade
    if (this._fadeTimer > 0) {
      this._fadeTimer -= dt;
      this._scrollBarOpacity = Math.max(0, this._fadeTimer / 500);
      this.invalidate(DirtyFlags.Visual);
    }
  }

  override paint(ctx: IArena2DContext): void {
    super.paint(ctx);

    if (this._showScrollBars && this._scrollBarOpacity > 0) {
      this._drawScrollBars(ctx);
    }
  }

  /**
   * Override hitTest to account for scroll offset.
   * Since children's worldMatrix now INCLUDES the scroll, we don't need to adjust!
   * Container.hitTest will work normally.
   */
  override hitTest(globalX: number, globalY: number): IElement | null {
    if (!this.visible) return null;

    // 1. Check if point is within our bounds
    const inv = invert(this.worldMatrix);
    if (!inv) return null;
    const local = transformPoint(inv, globalX, globalY);

    if (local.x < 0 || local.x > this.width || local.y < 0 || local.y > this.height) {
      return null;
    }

    // 2. Check children (they use scrolled worldMatrix, so hitTest works!)
    return super.hitTest(globalX, globalY);
  }

  private _updateContentBounds(): void {
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;

    for (const child of this.children) {
      const childEl = child as any;
      const aabb = computeAABB(childEl.localBounds, childEl.localMatrix);
      minX = Math.min(minX, aabb.x);
      minY = Math.min(minY, aabb.y);
      maxX = Math.max(maxX, aabb.x + aabb.width);
      maxY = Math.max(maxY, aabb.y + aabb.height);
    }

    this._contentBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private _clampX(x: number): number {
    if (!this._scrollEnabledX) return 0;
    const maxScroll = Math.max(0, this._contentBounds.width - this.width);
    return Math.max(0, Math.min(x, maxScroll));
  }

  private _clampY(y: number): number {
    if (!this._scrollEnabledY) return 0;
    const maxScroll = Math.max(0, this._contentBounds.height - this.height);
    return Math.max(0, Math.min(y, maxScroll));
  }

  private _showBars(): void {
    this._fadeTimer = this._fadeDuration;
    this._scrollBarOpacity = 1;
  }

  private _handlePointerDown(e: IPointerEvent): void {
    if (!this._scrollEnabledX && !this._scrollEnabledY) return;
    const scene = this.scene as any;
    if (!scene) return;

    this._isDragging = true;
    this._lastPointerX = e.sceneX;
    this._lastPointerY = e.sceneY;
    this._velocityX = 0;
    this._velocityY = 0;

    const onMove = (me: PointerEvent) => {
      const pos = scene.screenToScene(me.clientX, me.clientY);
      const dx = pos.x - this._lastPointerX;
      const dy = pos.y - this._lastPointerY;
      
      if (this._scrollEnabledX) {
        this.scrollX -= dx;
        this._velocityX = dx;
      }
      if (this._scrollEnabledY) {
        this.scrollY -= dy;
        this._velocityY = dy;
      }

      this._lastPointerX = pos.x;
      this._lastPointerY = pos.y;
    };

    const onUp = () => {
      this._isDragging = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  private _handleWheel(e: IPointerEvent): void {
    if (this._scrollEnabledX) this.scrollX += e.deltaX;
    if (this._scrollEnabledY) this.scrollY += e.deltaY;
    e.stopPropagation();
    (e as any).preventDefault?.();
  }

  private _drawScrollBars(ctx: IArena2DContext): void {
    const raw = ctx.raw;
    const originalAlpha = raw.globalAlpha;
    raw.globalAlpha = originalAlpha * this._scrollBarOpacity * 0.5;
    
    const color = "#000000";
    const thickness = 6;
    const margin = 2;

    if (this._scrollEnabledY && this._contentBounds.height > this.height) {
      const barHeight = Math.max(20, (this.height / this._contentBounds.height) * this.height);
      const barY = (this._scrollY / (this._contentBounds.height - this.height)) * (this.height - barHeight);
      ctx.drawRoundedRect(this.width - thickness - margin, barY, thickness, barHeight, thickness / 2, color);
    }

    if (this._scrollEnabledX && this._contentBounds.width > this.width) {
      const barWidth = Math.max(20, (this.width / this._contentBounds.width) * this.width);
      const barX = (this._scrollX / (this._contentBounds.width - this.width)) * (this.width - barWidth);
      ctx.drawRoundedRect(barX, this.height - thickness - margin, barWidth, thickness, thickness / 2, color);
    }
    
    raw.globalAlpha = originalAlpha;
  }
}
