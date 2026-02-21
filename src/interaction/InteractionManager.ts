/**
 * InteractionManager — Unified pointer/keyboard event handling.
 *
 * Listens on the scene's topmost canvas for pointer/keyboard DOM events,
 * translates them to IPointerEvent/IKeyboardEvent, performs hit-testing
 * via SpatialHashGrid (broad phase) + inverse-matrix (narrow phase),
 * dispatches with bubbling, and manages focus/tab order.
 *
 * SPEC: §5 (Interaction & Focus System)
 */

import type { IContainer } from "../core/Container";
import { DirtyFlags } from "../core/DirtyFlags";
import type { IElement } from "../core/Element";
import type { IEventEmitter } from "../events/EventEmitter";
import type { IRect } from "../math/aabb";
import { computeAABB, intersect } from "../math/aabb";
import { invert, transformPoint } from "../math/matrix";
import { DragManager } from "./DragManager";
import { type ISpatialEntry, SpatialHashGrid } from "./SpatialHashGrid";

/** Element with event emitter capabilities (Element extends EventEmitter) */
type InteractiveElement = IElement & IEventEmitter & { uid: number };

// ── Event Interfaces ──

export interface IPointerEvent {
  readonly type: string;
  readonly target: IElement;
  currentTarget: IElement;
  readonly sceneX: number;
  readonly sceneY: number;
  readonly localX: number;
  readonly localY: number;
  readonly button: number;
  readonly deltaX: number;
  readonly deltaY: number;
  propagationStopped: boolean;
  defaultPrevented: boolean;
  stopPropagation(): void;
  preventDefault(): void;
}

export interface IKeyboardEvent {
  readonly type: string;
  readonly target: IElement;
  currentTarget: IElement;
  readonly key: string;
  readonly code: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  propagationStopped: boolean;
  defaultPrevented: boolean;
  stopPropagation(): void;
  preventDefault(): void;
}

export interface IInteractionManager {
  readonly focusedElement: IElement | null;
  readonly hoveredElement: IElement | null;
  readonly spatialHash: SpatialHashGrid;

  setFocus(el: IElement | null): void;
  tabNext(): void;
  tabPrev(): void;

  updateSpatialHash(): void;
  markSpatialDirty(element: IElement): void;
  markSpatialFullRebuild(): void;
  refreshHover(): void;
  destroy(): void;

  // Drag & Drop support
  readonly dragManager: DragManager;
  hitTest(
    sceneX: number,
    sceneY: number,
    exclude?: IElement | null,
    filter?: (el: IElement) => boolean,
  ): IElement | null;
  hitTestAABB(
    sceneAABB: IRect,
    exclude?: IElement | null,
    filter?: (el: IElement) => boolean,
  ): IElement | null;
}

// ── Pointer Event Implementation ──

/**
 * Concrete implementation of a pointer event in the canvas.
 */
class CanvasPointerEvent implements IPointerEvent {
  /** Event type (pointerdown, pointermove, pointerup, wheel, etc.). */
  readonly type: string;
  /** The element that initially triggered the event. */
  readonly target: IElement;
  /** The element currently processing the event during propagation. */
  currentTarget: IElement;
  /** Pointer X position in scene coordinates. */
  readonly sceneX: number;
  /** Pointer Y position in scene coordinates. */
  readonly sceneY: number;
  /** Pointer X position in local coordinates of the target. */
  readonly localX: number;
  /** Pointer Y position in local coordinates of the target. */
  readonly localY: number;
  /** Mouse button index (0=left, 1=middle, 2=right). */
  readonly button: number;
  /** Horizontal scroll/movement delta. */
  readonly deltaX: number;
  /** Vertical scroll/movement delta. */
  readonly deltaY: number;
  /** Whether propagation has been stopped. */
  propagationStopped = false;
  /** Whether default behavior has been prevented. */
  defaultPrevented = false;

  /**
   * Creates a new CanvasPointerEvent.
   * @param type - Event type.
   * @param target - Target element.
   * @param sceneX - Scene X coordinate.
   * @param sceneY - Scene Y coordinate.
   * @param localX - Local X coordinate.
   * @param localY - Local Y coordinate.
   * @param button - Mouse button index.
   * @param deltaX - Horizontal delta.
   * @param deltaY - Vertical delta.
   */
  constructor(
    type: string,
    target: IElement,
    sceneX: number,
    sceneY: number,
    localX: number,
    localY: number,
    button: number,
    deltaX = 0,
    deltaY = 0,
  ) {
    this.type = type;
    this.target = target;
    this.currentTarget = target;
    this.sceneX = sceneX;
    this.sceneY = sceneY;
    this.localX = localX;
    this.localY = localY;
    this.button = button;
    this.deltaX = deltaX;
    this.deltaY = deltaY;
  }

  /**
   * Stops event propagation to parent elements.
   */
  stopPropagation(): void {
    this.propagationStopped = true;
  }

  /**
   * Prevents the browser from performing its default action.
   */
  preventDefault(): void {
    this.defaultPrevented = true;
  }
}

// ── Keyboard Event Implementation ──

/**
 * Concrete implementation of a keyboard event in the canvas.
 */
class CanvasKeyboardEvent implements IKeyboardEvent {
  /** Event type (keydown, keyup, etc.). */
  readonly type: string;
  /** The element that initially triggered the event. */
  readonly target: IElement;
  /** The element currently processing the event during propagation. */
  currentTarget: IElement;
  /** The key pressed (e.g., "a", "Enter", "ArrowUp"). */
  readonly key: string;
  /** The physical key code (e.g., "KeyA", "Enter", "ArrowUp"). */
  readonly code: string;
  /** Whether Shift was pressed. */
  readonly shiftKey: boolean;
  /** Whether Ctrl/Cmd was pressed. */
  readonly ctrlKey: boolean;
  /** Whether Alt was pressed. */
  readonly altKey: boolean;
  /** Whether Meta/Windows key was pressed. */
  readonly metaKey: boolean;
  /** Whether propagation has been stopped. */
  propagationStopped = false;
  /** Whether default behavior has been prevented. */
  defaultPrevented = false;

  /**
   * Creates a new CanvasKeyboardEvent.
   * @param type - Event type.
   * @param target - Target element.
   * @param domEvent - The original DOM keyboard event.
   */
  constructor(type: string, target: IElement, domEvent: KeyboardEvent) {
    this.type = type;
    this.target = target;
    this.currentTarget = target;
    this.key = domEvent.key;
    this.code = domEvent.code;
    this.shiftKey = domEvent.shiftKey;
    this.ctrlKey = domEvent.ctrlKey;
    this.altKey = domEvent.altKey;
    this.metaKey = domEvent.metaKey;
  }

  /**
   * Stops event propagation to parent elements.
   */
  stopPropagation(): void {
    this.propagationStopped = true;
  }

  /**
   * Prevents the browser from performing its default action.
   */
  preventDefault(): void {
    this.defaultPrevented = true;
  }
}

// ── View Interface (minimal, to avoid circular imports) ──

interface IViewRef {
  readonly container: HTMLElement;
  readonly scene: {
    readonly root: IContainer;
    readonly width: number;
    readonly height: number;
    _sampleHitBuffer(sx: number, sy: number): number;
    _getElementByUID(uid: number): IElement | null;
  };
  screenToScene(screenX: number, screenY: number): { x: number; y: number };
}

// ── InteractionManager ──

/**
 * Concrete implementation of interaction management for a scene.
 * Handles all pointer, keyboard, and focus events with spatial hashing for efficient hit testing.
 */
export class InteractionManager implements IInteractionManager {
  /** Reference to the view this manager is attached to. */
  private _view: IViewRef;
  /** Spatial hash grid for broad-phase hit testing. */
  private _spatialHash: SpatialHashGrid;
  /** The element that currently has input focus. */
  private _focusedElement: IElement | null = null;
  /** The element currently under the pointer. */
  private _hoveredElement: IElement | null = null;
  /** The element on which pointerdown occurred. */
  private _pointerDownElement: IElement | null = null;
  /** Map of elements to their spatial hash entries. */
  private _spatialEntries = new Map<IElement, ISpatialEntry>();
  /** Set of elements that need spatial hash update. */
  private _spatialDirtyElements = new Set<IElement>();
  /** Whether the entire spatial hash needs rebuilding. */
  private _spatialFullRebuild = true;

  /** Last known pointer X in scene space. */
  private _lastPointerSceneX = 0;
  /** Last known pointer Y in scene space. */
  private _lastPointerSceneY = 0;
  /** Whether pointer position is currently known. */
  private _hasPointerPosition = false;

  /** Bound DOM event handler for pointer down. */
  private _onPointerDown: (e: PointerEvent) => void;
  /** Bound DOM event handler for pointer up. */
  private _onPointerUp: (e: PointerEvent) => void;
  /** Bound DOM event handler for pointer move. */
  private _onPointerMove: (e: PointerEvent) => void;
  /** Bound DOM event handler for wheel. */
  private _onWheel: (e: WheelEvent) => void;
  /** Bound DOM event handler for key down. */
  private _onKeyDown: (e: KeyboardEvent) => void;
  /** Bound DOM event handler for key up. */
  private _onKeyUp: (e: KeyboardEvent) => void;
  /** Bound DOM event handler for double click. */
  private _onDoubleClick: (e: MouseEvent) => void;

  /**
   * Creates a new InteractionManager.
   * @param view - The view to manage interactions for.
   * @param cellSize - Size of spatial hash cells. Default 128.
   */
  constructor(view: IViewRef, cellSize = 128) {
    this._view = view;
    this._spatialHash = new SpatialHashGrid(cellSize);
    this._dragManager = new DragManager(this);

    // Bind DOM handlers
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onDoubleClick = this._handleDoubleClick.bind(this);

    // Attach listeners to the view container
    const container = this._view.container;
    container.addEventListener("pointerdown", this._onPointerDown);
    container.addEventListener("pointerup", this._onPointerUp);
    container.addEventListener("pointermove", this._onPointerMove);
    container.addEventListener("wheel", this._onWheel, { passive: false });
    container.addEventListener("keydown", this._onKeyDown);
    container.addEventListener("keyup", this._onKeyUp);
    container.addEventListener("dblclick", this._onDoubleClick);

    // Make container focusable so it can receive keyboard events
    if (!container.getAttribute("tabindex")) {
      container.setAttribute("tabindex", "0");
      container.style.outline = "none";
      container.style.userSelect = "none";
      container.style.webkitUserSelect = "none";
    }
  }

  get focusedElement(): IElement | null {
    return this._focusedElement;
  }

  get hoveredElement(): IElement | null {
    return this._hoveredElement;
  }

  get spatialHash(): SpatialHashGrid {
    return this._spatialHash;
  }

  private _dragManager: DragManager;
  get dragManager(): DragManager {
    return this._dragManager;
  }

  // ── Focus Management ──

  setFocus(el: IElement | null): void {
    if (el === this._focusedElement) return;

    const old = this._focusedElement;
    if (old) {
      this._focusedElement = null;
      (old as InteractiveElement).emit("blur", { type: "blur", target: old });
    }

    if (el?.focusable) {
      this._focusedElement = el;
      (el as InteractiveElement).emit("focus", { type: "focus", target: el });
    } else {
      this._focusedElement = null;
    }
  }

  tabNext(): void {
    const order = this._buildTabOrder();
    if (order.length === 0) return;

    if (!this._focusedElement) {
      this.setFocus(order[0]);
      return;
    }

    const idx = order.indexOf(this._focusedElement);
    const next = (idx + 1) % order.length;
    this.setFocus(order[next]);
  }

  tabPrev(): void {
    const order = this._buildTabOrder();
    if (order.length === 0) return;

    if (!this._focusedElement) {
      this.setFocus(order[order.length - 1]);
      return;
    }

    const idx = order.indexOf(this._focusedElement);
    const prev = (idx - 1 + order.length) % order.length;
    this.setFocus(order[prev]);
  }

  // ── Spatial Hash Update ──

  /**
   * Mark an element as needing a spatial hash update.
   * Called when an element's transform or visibility changes.
   */
  markSpatialDirty(element: IElement): void {
    this._spatialDirtyElements.add(element);
  }

  /**
   * Force a full rebuild of the spatial hash on the next frame.
   */
  markSpatialFullRebuild(): void {
    this._spatialFullRebuild = true;
  }

  /**
   * Update the spatial hash grid.
   * On first call or after structural changes, performs a full rebuild.
   * Otherwise, only updates elements that were marked dirty.
   */
  updateSpatialHash(): void {
    if (this._spatialFullRebuild) {
      this._spatialFullRebuild = false;
      this._spatialDirtyElements.clear();
      this._updateSpatialRecursive(this._view.scene.root as IElement);
      return;
    }

    // Incremental update: only process dirty elements
    if (this._spatialDirtyElements.size === 0) return;

    for (const element of this._spatialDirtyElements) {
      this._updateSpatialEntry(element);
    }
    this._spatialDirtyElements.clear();
  }

  /**
   * Re-evaluate hover state at the last known pointer position.
   * Called once per frame after the spatial hash and hit buffer are updated,
   * so elements that moved under a stationary cursor are detected correctly.
   */
  refreshHover(): void {
    if (!this._hasPointerPosition) return;

    const sceneX = this._lastPointerSceneX;
    const sceneY = this._lastPointerSceneY;
    const target = this.hitTest(sceneX, sceneY);
    const previousHover = this._hoveredElement;

    if (target === previousHover) return;

    if (previousHover) {
      const prevLocal = this._getLocalCoords(previousHover, sceneX, sceneY);
      const leaveEvent = new CanvasPointerEvent(
        "pointerleave",
        previousHover,
        sceneX,
        sceneY,
        prevLocal.x,
        prevLocal.y,
        0,
      );
      this._dispatchPointerEvent(leaveEvent);
    }

    if (target) {
      const targetLocal = this._getLocalCoords(target, sceneX, sceneY);
      const enterEvent = new CanvasPointerEvent(
        "pointerenter",
        target,
        sceneX,
        sceneY,
        targetLocal.x,
        targetLocal.y,
        0,
      );
      this._dispatchPointerEvent(enterEvent);
    }

    this._hoveredElement = target;
    this._updateCursor(target);
  }

  private _updateSpatialEntry(element: IElement): void {
    if (element.interactive && element.visible) {
      const aabb = computeAABB(
        { x: 0, y: 0, width: element.width, height: element.height },
        element.worldMatrix,
      );

      let entry = this._spatialEntries.get(element);
      if (entry) {
        entry.aabb = aabb;
        this._spatialHash.insert(entry);
      } else {
        const spatialEntry = { id: element.id, aabb } as ISpatialEntry & {
          element: IElement;
        };
        spatialEntry.element = element;
        entry = spatialEntry;
        this._spatialEntries.set(element, entry);
        this._spatialHash.insert(entry);
      }
    } else {
      const entry = this._spatialEntries.get(element);
      if (entry) {
        this._spatialHash.remove(entry);
        this._spatialEntries.delete(element);
      }
    }
  }

  private _updateSpatialRecursive(element: IElement): void {
    this._updateSpatialEntry(element);

    // Recurse into children
    if ("children" in element) {
      const container = element as IContainer;
      for (const child of container.children) {
        this._updateSpatialRecursive(child);
      }
    }
  }

  /**
   * Unregister an element from the spatial hash (e.g., on removal from scene).
   */
  unregisterElement(element: IElement): void {
    const entry = this._spatialEntries.get(element);
    if (entry) {
      this._spatialHash.remove(entry);
      this._spatialEntries.delete(element);
    }

    // If this was the focused element, clear focus
    if (this._focusedElement === element) {
      this._focusedElement = null;
    }

    // If this was the hovered element, clear hover
    if (this._hoveredElement === element) {
      this._hoveredElement = null;
    }

    // If this was the pointer-down element, clear to prevent dangling click dispatch
    if (this._pointerDownElement === element) {
      this._pointerDownElement = null;
    }

    // Remove from dirty set to avoid processing a destroyed element next frame
    this._spatialDirtyElements.delete(element);
  }

  // ── Hit-Testing ──

  /**
   * Find the topmost interactive element at scene coordinates (sx, sy).
   * Uses broad-phase spatial hash + narrow-phase inverse-matrix test.
   * Optional 'exclude' parameter to ignore a specific element branch (used for drag & drop).
   */
  hitTest(
    sceneX: number,
    sceneY: number,
    exclude?: IElement | null,
    filter?: (el: IElement) => boolean,
  ): IElement | null {
    // Broad phase: query spatial hash
    const candidates = this._spatialHash.query(sceneX, sceneY);
    if (candidates.length === 0) return null;

    // Get the actual elements from entries
    const elements: IElement[] = [];
    for (const entry of candidates) {
      const el = (entry as ISpatialEntry & { element: IElement }).element;
      if (el?.interactive && el.visible) {
        // Check exclusion
        if (exclude) {
          // Check if el is exclude or a descendant of exclude
          let current: IElement | null = el;
          let isExcluded = false;
          while (current) {
            if (current === exclude) {
              isExcluded = true;
              break;
            }
            current = current.parent;
          }
          if (isExcluded) continue;
        }

        if (filter && !filter(el)) continue;
        elements.push(el);
      }
    }

    if (elements.length === 0) return null;

    // ── NEW: Hit Buffer Pass (Pixel-perfect) ──
    // Sample the hit buffer for the topmost interactive element
    const scene = this._view.scene;
    if (
      typeof scene._sampleHitBuffer === "function" &&
      typeof scene._getElementByUID === "function"
    ) {
      const hitUid = scene._sampleHitBuffer(sceneX, sceneY);
      if (hitUid > 0) {
        const hitEl = scene._getElementByUID(hitUid);
        if (hitEl) {
          // Double check filtering/exclusion
          let current: IElement | null = hitEl;
          let isExcluded = false;
          while (current) {
            if (current === exclude) {
              isExcluded = true;
              break;
            }
            current = current.parent;
          }
          if (!isExcluded && (!filter || filter(hitEl))) {
            return hitEl;
          }
        }
      }
    }

    // ── Fallback: Matrix Pass (AABB/Quad) ──
    // (Existing logic remains as fallback for legacy or non-painted interactive elements)
    
    // Check from top (last) to bottom (first) — top-most first
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];

      // Skip zero-size elements
      if (el.width <= 0 || el.height <= 0) continue;

      const inv = invert(el.worldMatrix);
      if (!inv) continue;

      const local = transformPoint(inv, sceneX, sceneY);
      if (el.containsPoint(local.x, local.y)) {
        return el;
      }
    }

    return null;
  }

  /**
   * Compute a comparable z-ordering value for an element.
   * Higher values mean the element renders on top.
   */
  private _getGlobalZOrder(element: IElement): number {
    // Walk up the hierarchy accumulating weighted zIndex
    let order = 0;
    let depth = 0;
    let current: IElement | null = element;
    while (current) {
      order += current.zIndex * 0.001 ** depth;
      depth++;
      current = current.parent as IElement | null;
    }
    return order;
  }

  /**
   * Find the topmost interactive element intersecting the given AABB.
   */
  hitTestAABB(
    sceneAABB: IRect,
    exclude?: IElement | null,
    filter?: (el: IElement) => boolean,
  ): IElement | null {
    // Broad phase: query spatial hash with AABB
    const candidates = this._spatialHash.queryAABB(sceneAABB);
    if (candidates.length === 0) return null;

    // Get the actual elements from entries
    const elements: IElement[] = [];
    for (const entry of candidates) {
      const el = (entry as ISpatialEntry & { element: IElement }).element;

      // Must be interactive, visible, and NOT the exclude target (or its child)
      if (el?.interactive && el.visible) {
        if (exclude) {
          let current: IElement | null = el;
          let isExcluded = false;
          while (current) {
            if (current === exclude) {
              isExcluded = true;
              break;
            }
            current = current.parent;
          }
          if (isExcluded) continue;
        }
        if (filter && !filter(el)) continue;
        elements.push(el);
      }
    }

    if (elements.length === 0) return null;

    // Narrow phase: Sort by Z-order (topmost first)
    elements.sort((a, b) => {
      const za = this._getGlobalZOrder(a);
      const zb = this._getGlobalZOrder(b);
      if (za !== zb) return za - zb;
      return (a as InteractiveElement).uid - (b as InteractiveElement).uid;
    });

    // Check intersection from top to bottom
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      // Get the element's world AABB
      // Note: In a real engine we might want to cache this or use the spatial entry's AABB if accurate enough.
      // Spatial entry AABB is updated once per frame.
      const entry = this._spatialEntries.get(el);
      if (entry && intersect(sceneAABB, entry.aabb)) {
        return el;
      }
    }

    return null;
  }

  // ── Event Dispatch ──

  /**
   * Dispatch an event with bubbling from target up to root.
   * pointerenter/pointerleave do NOT bubble.
   */
  private _dispatchPointerEvent(event: CanvasPointerEvent): void {
    const nonBubbling =
      event.type === "pointerenter" || event.type === "pointerleave";

    // Fire on target
    event.currentTarget = event.target;
    (event.target as InteractiveElement).emit(event.type, event);

    if (nonBubbling || event.propagationStopped) return;

    // Bubble up
    let current = event.target.parent as IElement | null;
    while (current && !event.propagationStopped) {
      event.currentTarget = current;
      (current as InteractiveElement).emit(event.type, event);
      current = current.parent as IElement | null;
    }
  }

  private _dispatchKeyboardEvent(event: CanvasKeyboardEvent): void {
    // Fire on target
    event.currentTarget = event.target;
    (event.target as InteractiveElement).emit(event.type, event);

    // Bubble up
    let current = event.target.parent as IElement | null;
    while (current && !event.propagationStopped) {
      event.currentTarget = current;
      (current as InteractiveElement).emit(event.type, event);
      current = current.parent as IElement | null;
    }
  }

  // ── DOM Event Handlers ──

  private _getSceneCoords(domEvent: PointerEvent | WheelEvent): {
    x: number;
    y: number;
  } {
    return this._view.screenToScene(domEvent.clientX, domEvent.clientY);
  }

  private _getLocalCoords(
    element: IElement,
    sceneX: number,
    sceneY: number,
  ): { x: number; y: number } {
    const inv = invert(element.worldMatrix);
    if (!inv) return { x: 0, y: 0 };
    return transformPoint(inv, sceneX, sceneY);
  }

  private _handlePointerDown(domEvent: PointerEvent): void {
    const scene = this._getSceneCoords(domEvent);
    const target = this.hitTest(scene.x, scene.y);

    if (target) {
      const local = this._getLocalCoords(target, scene.x, scene.y);
      const event = new CanvasPointerEvent(
        "pointerdown",
        target,
        scene.x,
        scene.y,
        local.x,
        local.y,
        domEvent.button,
      );
      this._pointerDownElement = target;

      // Let DragManager check if this starts a drag
      this._dragManager.handlePointerDown(event);

      this._dispatchPointerEvent(event);

      // Focus the element if it's focusable
      if (target.focusable) {
        this.setFocus(target);
      }

      if (event.defaultPrevented) {
        domEvent.preventDefault();
      }
    } else {
      // Clicked on empty space — clear focus
      this.setFocus(null);
      this._pointerDownElement = null;
    }
  }

  private _handlePointerUp(domEvent: PointerEvent): void {
    const scene = this._getSceneCoords(domEvent);
    const target = this.hitTest(scene.x, scene.y);

    // Ensure DragManager gets the up event even if we hit nothing (to end drag)
    const effectiveTarget = target || (this._view.scene.root as IElement);
    const local = this._getLocalCoords(effectiveTarget, scene.x, scene.y);
    const event = new CanvasPointerEvent(
      "pointerup",
      effectiveTarget,
      scene.x,
      scene.y,
      local.x,
      local.y,
      domEvent.button,
    );

    this._dragManager.handlePointerUp(event);

    if (target) {
      // Dispatch normal pointerup
      this._dispatchPointerEvent(event);

      // Fire click if pointerdown and pointerup were on the same element
      if (this._pointerDownElement === target) {
        const clickEvent = new CanvasPointerEvent(
          "click",
          target,
          scene.x,
          scene.y,
          local.x,
          local.y,
          domEvent.button,
        );
        this._dispatchPointerEvent(clickEvent);
      }

      if (event.defaultPrevented) {
        domEvent.preventDefault();
      }
    }

    this._pointerDownElement = null;
  }

  private _handlePointerMove(domEvent: PointerEvent): void {
    const scene = this._getSceneCoords(domEvent);

    // Store position so refreshHover() can re-evaluate each frame
    this._lastPointerSceneX = scene.x;
    this._lastPointerSceneY = scene.y;
    this._hasPointerPosition = true;

    const target = this.hitTest(scene.x, scene.y);

    const previousHover = this._hoveredElement;

    // Handle enter/leave
    if (target !== previousHover) {
      // Leave old element
      if (previousHover) {
        const prevLocal = this._getLocalCoords(previousHover, scene.x, scene.y);
        const leaveEvent = new CanvasPointerEvent(
          "pointerleave",
          previousHover,
          scene.x,
          scene.y,
          prevLocal.x,
          prevLocal.y,
          0,
        );
        this._dispatchPointerEvent(leaveEvent);
      }

      // Enter new element
      if (target) {
        const targetLocal = this._getLocalCoords(target, scene.x, scene.y);
        const enterEvent = new CanvasPointerEvent(
          "pointerenter",
          target,
          scene.x,
          scene.y,
          targetLocal.x,
          targetLocal.y,
          0,
        );
        this._dispatchPointerEvent(enterEvent);
      }

      this._hoveredElement = target;

      // Update cursor
      this._updateCursor(target);
    }

    // Dispatch pointermove
    if (target || this._dragManager) {
      // If dragging, we might be over 'nothing' layout-wise but still dragging.
      // DragManager doesn't need a target per-se, it uses the captured one.
      // However, to create the event, we need some target.
      // If no target hit, we can use the stage/root or the last known target?
      // Actually, for dragmove, we usually want to emit on the dragged element or the checked-for drop target?
      // DragManager handles its own events. But we need to pass a valid IPointerEvent to it.
      // If target is null (mouse over empty space), we should probably use root or fallback?

      const effectiveTarget = target || this._view.scene.root; // Fallback to root
      const local = this._getLocalCoords(effectiveTarget, scene.x, scene.y);

      const moveEvent = new CanvasPointerEvent(
        "pointermove",
        effectiveTarget,
        scene.x,
        scene.y,
        local.x,
        local.y,
        domEvent.button,
      );

      this._dragManager.handlePointerMove(moveEvent);

      if (target) {
        this._dispatchPointerEvent(moveEvent);
      }
    }
  }

  private _handleWheel(domEvent: WheelEvent): void {
    const scene = this._getSceneCoords(domEvent);
    const target = this.hitTest(scene.x, scene.y);

    if (target) {
      const local = this._getLocalCoords(target, scene.x, scene.y);
      const event = new CanvasPointerEvent(
        "wheel",
        target,
        scene.x,
        scene.y,
        local.x,
        local.y,
        0,
        domEvent.deltaX,
        domEvent.deltaY,
      );
      this._dispatchPointerEvent(event);

      if (event.defaultPrevented) {
        domEvent.preventDefault();
      }
    }
  }

  private _handleKeyDown(domEvent: KeyboardEvent): void {
    // Handle Tab key for focus cycling
    if (domEvent.key === "Tab") {
      domEvent.preventDefault();
      if (domEvent.shiftKey) {
        this.tabPrev();
      } else {
        this.tabNext();
      }
      return;
    }

    const target = this._focusedElement;
    if (!target) return;

    const event = new CanvasKeyboardEvent("keydown", target, domEvent);
    this._dispatchKeyboardEvent(event);

    if (event.defaultPrevented) {
      domEvent.preventDefault();
    }
  }

  private _handleKeyUp(domEvent: KeyboardEvent): void {
    const target = this._focusedElement;
    if (!target) return;

    const event = new CanvasKeyboardEvent("keyup", target, domEvent);
    this._dispatchKeyboardEvent(event);

    if (event.defaultPrevented) {
      domEvent.preventDefault();
    }
  }

  private _handleDoubleClick(domEvent: MouseEvent): void {
    const scene = this._getSceneCoords(domEvent as unknown as PointerEvent);
    const target = this.hitTest(scene.x, scene.y);

    if (target) {
      const local = this._getLocalCoords(target, scene.x, scene.y);
      const event = new CanvasPointerEvent(
        "dblclick",
        target,
        scene.x,
        scene.y,
        local.x,
        local.y,
        domEvent.button,
      );
      this._dispatchPointerEvent(event);

      if (event.defaultPrevented) {
        domEvent.preventDefault();
      }
    }
  }

  // ── Cursor Management ──

  private _updateCursor(element: IElement | null): void {
    if (element?.cursor) {
      this._view.container.style.cursor = element.cursor;
    } else {
      this._view.container.style.cursor = "default";
    }
  }

  // ── Tab Order ──

  /**
   * Build tab order via depth-first traversal of the scene graph.
   * Only elements with focusable=true participate.
   */
  private _buildTabOrder(): IElement[] {
    const order: IElement[] = [];
    this._collectFocusable(this._view.scene.root as IElement, order);
    return order;
  }

  private _collectFocusable(element: IElement, result: IElement[]): void {
    if (!element.visible) return;

    if (element.focusable) {
      result.push(element);
    }

    if ("children" in element) {
      const container = element as IContainer;
      for (const child of container.children) {
        this._collectFocusable(child, result);
      }
    }
  }

  // ── Cleanup ──

  destroy(): void {
    const container = this._view.container;
    container.removeEventListener("pointerdown", this._onPointerDown);
    container.removeEventListener("pointerup", this._onPointerUp);
    container.removeEventListener("pointermove", this._onPointerMove);
    container.removeEventListener("wheel", this._onWheel);
    container.removeEventListener("keydown", this._onKeyDown);
    container.removeEventListener("keyup", this._onKeyUp);

    this._spatialHash.clear();
    this._spatialEntries.clear();
    this._spatialDirtyElements.clear();
    this._focusedElement = null;
    this._hoveredElement = null;
    this._pointerDownElement = null;
  }
}
