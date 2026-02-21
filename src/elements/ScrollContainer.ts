/**
 * ScrollContainer — A container element that supports scrolling with optional inertia.
 *
 * Provides horizontal and vertical scrolling with customizable scrollbars,
 * velocity-based inertial scrolling, and automatic content bounds tracking.
 * Children are clipped to the container bounds and translated based on scroll position.
 *
 * @module Elements
 * @example
 * ```typescript
 * import { ScrollContainer } from 'arena-2d';
 *
 * const scroller = new ScrollContainer('myScroller');
 * scroller.width = 300;
 * scroller.height = 400;
 * scroller.scrollTo(0, 0);
 *
 * scroller.on('scroll', (e) => console.log(`Scrolled to ${e.x}, ${e.y}`));
 * ```
 */

import { Container, type IContainer } from "../core/Container";
import type { IElement } from "../core/Element";
import { DirtyFlags } from "../core/DirtyFlags";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { type IRect, computeAABB } from "../math/aabb";
import { type MatrixArray, multiply, translate, invert, transformPoint } from "../math/matrix";
import type { IPointerEvent } from "../interaction/InteractionManager";

/**
 * Interface for a scrollable container element.
 */
export interface IScrollContainer extends IContainer {
  scrollX: number;
  scrollY: number;
  scrollEnabledX: boolean;
  scrollEnabledY: boolean;
  inertiaEnabled: boolean;
  contentBounds: IRect;

  scrollTo(x: number, y: number, animate?: boolean): void;
  /**
   * Scrolls to the given position with optional animation.
   * @param dx - Horizontal displacement.
   * @param dy - Vertical displacement.
   * @param animate - Whether to animate the scroll.
   */
  scrollBy(dx: number, dy: number, animate?: boolean): void;
}

/**
 * Concrete implementation of a scrollable container.
 */
export class ScrollContainer extends Container implements IScrollContainer {
  /** Current horizontal scroll position. */
  private _scrollX = 0;
  /** Current vertical scroll position. */
  private _scrollY = 0;
  /** Whether horizontal scrolling is enabled. */
  private _scrollEnabledX = true;
  /** Whether vertical scrolling is enabled. */
  private _scrollEnabledY = true;
  /** Whether inertial scrolling is enabled. */
  private _inertiaEnabled = true;
  /** Whether dragging is enabled. */
  private _dragEnabled = true;
  /** Bounds of the scrollable content. */
  private _contentBounds: IRect = { x: 0, y: 0, width: 0, height: 0 };

  /** Whether the user is currently dragging. */
  private _isDragging = false;
  /** Whether drag has exceeded the threshold and is actively scrolling. */
  private _isDragActive = false;
  /** Last pointer X position during drag. */
  private _lastPointerX = 0;
  /** Last pointer Y position during drag. */
  private _lastPointerY = 0;
  /** Initial pointer X position when drag started. */
  private _dragStartX = 0;
  /** Initial pointer Y position when drag started. */
  private _dragStartY = 0;
  /** Current horizontal velocity for inertia. */
  private _velocityX = 0;
  /** Current vertical velocity for inertia. */
  private _velocityY = 0;
  /** Friction factor for inertial deceleration. */
  private _friction = 0.95;
  /** Minimum distance to initiate drag (in scene units). */
  private static readonly DRAG_THRESHOLD = 5;
  /** Minimum time before deferring click to children (in milliseconds). */
  private _clickDeferralThreshold = 250;
  /** Timer for click deferral. */
  private _clickDeferralTimer: number | null = null;
  /** The child element that should receive the deferred click event. */
  private _deferredClickTarget: IElement | null = null;
  /** The original pointer event to defer to children. */
  private _deferredPointerEvent: IPointerEvent | null = null;

  /**
   * Creates a new ScrollContainer.
   * @param id - Optional element ID.
   */
  constructor(id?: string) {
    super(id);
    this.clipContent = true;
    this.interactive = true;

    // Listen for events
    this.on("pointerdown", this._handlePointerDown.bind(this));
    this.on("wheel", this._handleWheel.bind(this));
    this.on("pointerenter", this._handlePointerEnter.bind(this));
    this.on("pointerleave", this._handlePointerLeave.bind(this));
  }

  /**
   * Gets the horizontal scroll position.
   */
  get scrollX(): number { return this._scrollX; }

  /**
   * Sets the horizontal scroll position. Value is clamped to valid range.
   */
  set scrollX(v: number) {
    const clamped = this._clampX(v);
    if (this._scrollX !== clamped) {
      this._scrollX = clamped;
      this.invalidate(DirtyFlags.Visual | DirtyFlags.Spatial);
      // Invalidate children transform because their worldMatrix depends on our scroll
      for (const child of this.children) {
        child.invalidate(DirtyFlags.Transform);
      }
      this.emit("scroll", { target: this, x: this._scrollX, y: this._scrollY });
    }
  }

  /**
   * Gets the vertical scroll position.
   */
  get scrollY(): number { return this._scrollY; }

  /**
   * Sets the vertical scroll position. Value is clamped to valid range.
   */
  set scrollY(v: number) {
    const clamped = this._clampY(v);
    if (this._scrollY !== clamped) {
      this._scrollY = clamped;
      this.invalidate(DirtyFlags.Visual | DirtyFlags.Spatial);
      // Invalidate children transform because their worldMatrix depends on our scroll
      for (const child of this.children) {
        child.invalidate(DirtyFlags.Transform);
      }
      this.emit("scroll", { target: this, x: this._scrollX, y: this._scrollY });
    }
  }

  /**
   * Gets whether horizontal scrolling is enabled.
   */
  get scrollEnabledX(): boolean { return this._scrollEnabledX; }

  /**
   * Sets whether horizontal scrolling is enabled.
   */
  set scrollEnabledX(v: boolean) { this._scrollEnabledX = v; }

  /**
   * Gets whether vertical scrolling is enabled.
   */
  get scrollEnabledY(): boolean { return this._scrollEnabledY; }

  /**
   * Sets whether vertical scrolling is enabled.
   */
  set scrollEnabledY(v: boolean) { this._scrollEnabledY = v; }

  /**
   * Gets whether inertial scrolling is enabled.
   */
  get inertiaEnabled(): boolean { return this._inertiaEnabled; }

  /**
   * Sets whether inertial scrolling is enabled.
   */
  set inertiaEnabled(v: boolean) { this._inertiaEnabled = v; }

  /**
   * Gets whether dragging is enabled.
   */
  get dragEnabled(): boolean { return this._dragEnabled; }

  /**
   * Sets whether dragging is enabled.
   */
  set dragEnabled(v: boolean) { this._dragEnabled = v; }

  /**
   * Gets the click deferral threshold in milliseconds.
   */
  get clickDeferralThreshold(): number { return this._clickDeferralThreshold; }

  /**
   * Sets the click deferral threshold in milliseconds.
   */
  set clickDeferralThreshold(v: number) { this._clickDeferralThreshold = Math.max(0, v); }

  /**
   * Gets the bounds of the scrollable content.
   */
  get contentBounds(): IRect { return this._contentBounds; }

  /**
   * @internal Gets whether a drag operation is currently active.
   */
  get isDragActive(): boolean { return this._isDragActive; }

  /**
   * Scrolls to the specified position.
   * @param x - Target horizontal scroll position.
   * @param y - Target vertical scroll position.
   */
  scrollTo(x: number, y: number): void {
    this.scrollX = x;
    this.scrollY = y;
  }

  /**
   * Scrolls by the specified offset.
   * @param dx - Horizontal displacement.
   * @param dy - Vertical displacement.
   */
  scrollBy(dx: number, dy: number): void {
    this.scrollX += dx;
    this.scrollY += dy;
  }

  /**
   * Gets the world matrix adjusted for scroll offset.
   * @override
   */
  override getWorldMatrixForChildren(): MatrixArray {
    const scrollM = translate(-this._scrollX, -this._scrollY);
    return multiply(this.worldMatrix, scrollM);
  }

  /**
   * Updates scroll inertia and scrollbar fade animation.
   * @param dt - Delta time in milliseconds.
   * @override
   */
  override update(dt: number): void {
    super.update(dt);

    // Update content bounds if children are dirty
    this._updateContentBounds();

    // Inertia (dt is in seconds)
    if (!this._isDragging && this._inertiaEnabled && (Math.abs(this._velocityX) > 0.1 || Math.abs(this._velocityY) > 0.1)) {
      if (this._scrollEnabledX) this.scrollX -= this._velocityX;
      if (this._scrollEnabledY) this.scrollY -= this._velocityY;
      this._velocityX *= Math.pow(this._friction, dt * 60);
      this._velocityY *= Math.pow(this._friction, dt * 60);
    }
  }


  /**
   * Performs hit testing accounting for scroll offset.
   * Since children's worldMatrix includes the scroll, hit testing works normally.
   * @override
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

  /**
   * Recalculates the bounds of all children content.
   * @private
   */
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

  /**
   * Clamps horizontal scroll position to valid range.
   * @private
   * @param x - The desired scroll position.
   * @returns The clamped scroll position.
   */
  private _clampX(x: number): number {
    if (!this._scrollEnabledX) return 0;
    const maxScroll = Math.max(0, this._contentBounds.width - this.width);
    return Math.max(0, Math.min(x, maxScroll));
  }

  /**
   * Clamps vertical scroll position to valid range.
   * @private
   * @param y - The desired scroll position.
   * @returns The clamped scroll position.
   */
  private _clampY(y: number): number {
    if (!this._scrollEnabledY) return 0;
    const maxScroll = Math.max(0, this._contentBounds.height - this.height);
    return Math.max(0, Math.min(y, maxScroll));
  }


  /**
   * Handles pointer down event for drag scrolling.
   * Detects drag initiation with a threshold to distinguish from simple clicks.
   * Can also detect and handle scrollbar dragging.
   * @private
   */
  private _handlePointerDown(e: IPointerEvent): void {
    if (!this._dragEnabled) return;
    if (!this._scrollEnabledX && !this._scrollEnabledY) return;

    // Get the view from the layer
    const layer = this.layer as any;
    if (!layer || !layer._scene) return;
    const view = layer._scene;

    // Find which child is under the pointer (for potential click deferral)
    const hitChild = e.target !== this ? e.target : null;

    // Stop propagation to prevent event from reaching children initially
    e.stopPropagation();

    // Start click deferral timer
    this._deferredClickTarget = hitChild;
    this._deferredPointerEvent = e;
    if (this._clickDeferralThreshold > 0 && hitChild) {
      this._clickDeferralTimer = window.setTimeout(() => {
        // Timer fired - defer the click to the child if drag didn't start
        if (this._deferredClickTarget && !this._isDragActive) {
          this._deferredClickTarget.emit("deferred-click", this._deferredPointerEvent);
        }
        this._clickDeferralTimer = null;
      }, this._clickDeferralThreshold) as unknown as number;
    } else if (this._clickDeferralThreshold === 0 && hitChild) {
      // No deferral - immediately emit to child
      hitChild.emit("pointerdown", e);
    }

    // Regular content drag
    this._isDragging = true;
    this._isDragActive = false;
    this._dragStartX = e.sceneX;
    this._dragStartY = e.sceneY;
    this._lastPointerX = e.sceneX;
    this._lastPointerY = e.sceneY;
    this._velocityX = 0;
    this._velocityY = 0;

    const onMove = (me: PointerEvent) => {
      if (!this._isDragging) return;

      const pos = view.screenToScene(me.clientX, me.clientY);
      const dx = pos.x - this._dragStartX;
      const dy = pos.y - this._dragStartY;

      // Only activate drag after movement exceeds threshold
      if (!this._isDragActive) {
        const distance = Math.hypot(dx, dy);
        if (distance < ScrollContainer.DRAG_THRESHOLD) {
          return; // Not yet a drag, wait for more movement
        }
        this._isDragActive = true;
        // Cancel click deferral since we're starting a drag
        if (this._clickDeferralTimer !== null) {
          window.clearTimeout(this._clickDeferralTimer);
          this._clickDeferralTimer = null;
        }
        e.stopPropagation?.(); // Prevent further propagation once drag is active
        // Change cursor to grabbing
        if (view && view.container) {
          view.container.style.cursor = "grabbing";
        }
      }

      // Update scroll based on movement
      const scrollDx = pos.x - this._lastPointerX;
      const scrollDy = pos.y - this._lastPointerY;

      if (this._scrollEnabledX) {
        this.scrollX -= scrollDx;
        this._velocityX = scrollDx;
      }
      if (this._scrollEnabledY) {
        this.scrollY -= scrollDy;
        this._velocityY = scrollDy;
      }

      this._lastPointerX = pos.x;
      this._lastPointerY = pos.y;
    };

    const onUp = () => {
      this._isDragging = false;
      // If click deferral timer is still pending, fire the click event to child
      if (this._clickDeferralTimer !== null) {
        window.clearTimeout(this._clickDeferralTimer);
        this._clickDeferralTimer = null;
        if (this._deferredClickTarget && this._deferredPointerEvent) {
          this._deferredClickTarget.emit("deferred-click", this._deferredPointerEvent);
        }
      }
      // Only reset dragActive after timer check is complete
      this._isDragActive = false;
      this._deferredClickTarget = null;
      this._deferredPointerEvent = null;
      // Reset cursor
      if (view && view.container) {
        view.container.style.cursor = "grab";
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }


  /**
   * Handles mouse wheel scroll events.
   * @private
   */
  private _handleWheel(e: IPointerEvent): void {
    if (this._scrollEnabledX) this.scrollX += e.deltaX;
    if (this._scrollEnabledY) this.scrollY += e.deltaY;
    e.stopPropagation();
    (e as any).preventDefault?.();
  }

  /**
   * Handles pointer enter to show grab cursor (only if dragging enabled).
   * @private
   */
  private _handlePointerEnter(): void {
    if (!this._dragEnabled) return;
    const layer = this.layer as any;
    if (layer && layer._scene) {
      const view = layer._scene;
      if (view && view.container) {
        view.container.style.cursor = "grab";
      }
    }
  }

  /**
   * Handles pointer leave to reset cursor (only if dragging enabled).
   * @private
   */
  private _handlePointerLeave(): void {
    if (!this._dragEnabled) return;
    const layer = this.layer as any;
    if (layer && layer._scene) {
      const view = layer._scene;
      if (view && view.container) {
        view.container.style.cursor = "";
      }
    }
  }

}
